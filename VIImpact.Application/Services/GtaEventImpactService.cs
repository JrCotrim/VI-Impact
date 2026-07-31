using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Domain.Entities;
using VIImpact.Domain.Enums;

namespace VIImpact.Application.Services;

/// <summary>
/// Calculates the observed stock-market reaction around GTA VI events.
/// </summary>
public sealed class GtaEventImpactService : IGtaEventImpactService
{
    private const string DefaultBenchmarkSymbol = "QQQ";
    private const int MarketCloseHour = 16;
    private const int HistoricalWindowInDays = 120;
    private const int VolumeAverageSessionCount = 30;

    private readonly IGtaEventRepository _gtaEventRepository;
    private readonly IStockMarketService _stockMarketService;

    public GtaEventImpactService(
        IGtaEventRepository gtaEventRepository,
        IStockMarketService stockMarketService)
    {
        _gtaEventRepository = gtaEventRepository;
        _stockMarketService = stockMarketService;
    }

    public Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
        CancellationToken cancellationToken = default)
    {
        return CalculateAsync(
            eventId,
            symbol,
            DefaultBenchmarkSymbol,
            cancellationToken);
    }

    /// <summary>
    /// Calculates cumulative returns from the close immediately before
    /// the event through D0, D+1, D+5 and D+30 trading sessions, then
    /// compares those returns with the selected market benchmark.
    /// </summary>
    public async Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
        string benchmarkSymbol,
        CancellationToken cancellationToken = default)
    {
        GtaEvent? gtaEvent =
            await _gtaEventRepository.GetByIdAsync(
                eventId,
                cancellationToken);

        if (gtaEvent is null)
        {
            return null;
        }

        string normalizedSymbol = NormalizeSymbol(symbol, "TTWO");
        string normalizedBenchmarkSymbol = NormalizeSymbol(
            benchmarkSymbol,
            DefaultBenchmarkSymbol);

        DateTime analysisTimestampUtc =
            gtaEvent.PublishedAtUtc ?? gtaEvent.OccurredAtUtc;

        var result = new GtaEventImpactResult
        {
            EventId = gtaEvent.Id,
            EventTitle = gtaEvent.Title,
            Symbol = normalizedSymbol,
            BenchmarkSymbol = normalizedBenchmarkSymbol,
            OccurredAtUtc = gtaEvent.OccurredAtUtc,
            AnalysisTimestampUtc = analysisTimestampUtc,
            UsedPublishedAtUtc = gtaEvent.PublishedAtUtc.HasValue
        };

        if (gtaEvent.Status != GtaEventStatus.Occurred)
        {
            return MarkUnavailable(
                result,
                "O evento ainda não ocorreu.");
        }

        if (!gtaEvent.IsImpactAnalysisEligible)
        {
            return MarkUnavailable(
                result,
                "Este evento não está elegível para análise de impacto.");
        }

        DateTime queryDate = analysisTimestampUtc.Date;

        var query = new StockTimeSeriesQuery
        {
            Interval = "1day",
            OutputSize = 5000,
            StartDate = queryDate.AddDays(-HistoricalWindowInDays),
            EndDate = GetQueryEndDate(queryDate)
        };

        StockTimeSeries timeSeries =
            await _stockMarketService.GetTimeSeriesAsync(
                normalizedSymbol,
                query,
                cancellationToken);

        result.Exchange = timeSeries.Exchange;
        result.ExchangeTimezone = timeSeries.ExchangeTimezone;

        IReadOnlyList<StockTimeSeriesPoint> tradingSessions =
            NormalizeTradingSessions(timeSeries.Values);

        if (tradingSessions.Count < 2)
        {
            return MarkUnavailable(
                result,
                "Não existem dados históricos de mercado suficientes para este evento.");
        }

        EventMarketReference marketReference =
            ResolveEventMarketReference(
                gtaEvent,
                analysisTimestampUtc,
                timeSeries.ExchangeTimezone);

        result.WasPublishedAfterMarketClose =
            marketReference.WasAfterMarketClose;

        int eventSessionIndex = FindEventSessionIndex(
            tradingSessions,
            marketReference.MarketDate,
            marketReference.WasAfterMarketClose == true);

        if (eventSessionIndex <= 0)
        {
            return MarkUnavailable(
                result,
                "Não foi possível localizar um pregão anterior e um pregão efetivo completos.");
        }

        StockTimeSeriesPoint previousSession =
            tradingSessions[eventSessionIndex - 1];

        StockTimeSeriesPoint eventSession =
            tradingSessions[eventSessionIndex];

        StockTimeSeriesPoint? day1Session =
            GetSession(tradingSessions, eventSessionIndex + 1);

        StockTimeSeriesPoint? day5Session =
            GetSession(tradingSessions, eventSessionIndex + 5);

        StockTimeSeriesPoint? day30Session =
            GetSession(tradingSessions, eventSessionIndex + 30);

        IReadOnlyList<StockTimeSeriesPoint> previousVolumeSessions =
            GetPreviousSessions(
                tradingSessions,
                eventSessionIndex,
                VolumeAverageSessionCount);

        decimal? averageVolume = CalculateAverageVolume(
            previousVolumeSessions);

        decimal? sameDayReturn = CalculateReturnPercent(
            previousSession.Close,
            eventSession.Close);

        decimal priceChange =
            eventSession.Close - previousSession.Close;

        result.IsAvailable = true;
        result.EffectiveTradingDate = eventSession.DateTime;
        result.PreviousTradingDate = previousSession.DateTime;
        result.PreviousClose = previousSession.Close;
        result.EventDayOpen = eventSession.Open;
        result.EventDayClose = eventSession.Close;
        result.EventDayVolume = eventSession.Volume;
        result.SameDayReturnPercent = sameDayReturn;

        result.Day1TradingDate = day1Session?.DateTime;
        result.Day1Close = day1Session?.Close;
        result.Day1ReturnPercent = CalculateReturnPercent(
            previousSession.Close,
            day1Session?.Close);

        result.Day5TradingDate = day5Session?.DateTime;
        result.Day5Close = day5Session?.Close;
        result.Day5ReturnPercent = CalculateReturnPercent(
            previousSession.Close,
            day5Session?.Close);

        result.Day30TradingDate = day30Session?.DateTime;
        result.Day30Close = day30Session?.Close;
        result.Day30ReturnPercent = CalculateReturnPercent(
            previousSession.Close,
            day30Session?.Close);

        result.AverageVolumeBefore30Sessions = averageVolume;
        result.PreviousVolumeSessionsUsed =
            previousVolumeSessions.Count;
        result.VolumeChangePercent = CalculateVolumeChangePercent(
            averageVolume,
            eventSession.Volume);

        result.PriceBefore = previousSession.Close;
        result.PriceBeforeRecordedAtUtc = previousSession.DateTime;
        result.PriceAfter = eventSession.Close;
        result.PriceAfterRecordedAtUtc = eventSession.DateTime;
        result.PriceChange = priceChange;
        result.PriceChangePercent = sameDayReturn;

        await PopulateBenchmarkComparisonAsync(
            result,
            normalizedSymbol,
            normalizedBenchmarkSymbol,
            query,
            timeSeries,
            previousSession,
            eventSession,
            day1Session,
            day5Session,
            day30Session,
            cancellationToken);

        return result;
    }

    /// <summary>
    /// Calculates all eligible event impacts from one shared primary
    /// series and one shared benchmark series. This avoids issuing a
    /// separate market-data request for every event in the ranking.
    /// </summary>
    public async Task<IReadOnlyList<GtaEventImpactResult>>
        CalculateRankingAsync(
            string symbol,
            string benchmarkSymbol,
            CancellationToken cancellationToken = default)
    {
        IReadOnlyList<GtaEvent> storedEvents =
            await _gtaEventRepository.GetAllAsync(
                cancellationToken);

        GtaEvent[] eligibleEvents = storedEvents
            .Where(gtaEvent =>
                gtaEvent.Status == GtaEventStatus.Occurred &&
                gtaEvent.IsImpactAnalysisEligible)
            .OrderBy(gtaEvent =>
                gtaEvent.PublishedAtUtc ??
                gtaEvent.OccurredAtUtc)
            .ToArray();

        if (eligibleEvents.Length == 0)
        {
            return Array.Empty<GtaEventImpactResult>();
        }

        string normalizedSymbol =
            NormalizeSymbol(symbol, "TTWO");

        string normalizedBenchmarkSymbol =
            NormalizeSymbol(
                benchmarkSymbol,
                DefaultBenchmarkSymbol);

        DateTime earliestAnalysisDate = eligibleEvents
            .Min(gtaEvent =>
                gtaEvent.PublishedAtUtc ??
                gtaEvent.OccurredAtUtc)
            .Date;

        DateTime latestAnalysisDate = eligibleEvents
            .Max(gtaEvent =>
                gtaEvent.PublishedAtUtc ??
                gtaEvent.OccurredAtUtc)
            .Date;

        var query = new StockTimeSeriesQuery
        {
            Interval = "1day",
            OutputSize = 5000,
            StartDate =
                earliestAnalysisDate.AddDays(
                    -HistoricalWindowInDays),
            EndDate =
                GetQueryEndDate(latestAnalysisDate)
        };

        StockTimeSeries primaryTimeSeries =
            await _stockMarketService.GetTimeSeriesAsync(
                normalizedSymbol,
                query,
                cancellationToken);

        IReadOnlyList<StockTimeSeriesPoint> primarySessions =
            NormalizeTradingSessions(
                primaryTimeSeries.Values);

        StockTimeSeries? benchmarkTimeSeries = null;
        IReadOnlyDictionary<DateTime, StockTimeSeriesPoint>?
            benchmarkSessionsByDate = null;

        string? benchmarkUnavailableReason = null;

        try
        {
            benchmarkTimeSeries =
                string.Equals(
                    normalizedSymbol,
                    normalizedBenchmarkSymbol,
                    StringComparison.OrdinalIgnoreCase)
                    ? primaryTimeSeries
                    : await _stockMarketService.GetTimeSeriesAsync(
                        normalizedBenchmarkSymbol,
                        query,
                        cancellationToken);

            benchmarkSessionsByDate =
                NormalizeTradingSessions(
                    benchmarkTimeSeries.Values)
                .ToDictionary(
                    session => session.DateTime.Date);
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            benchmarkUnavailableReason =
                "Não foi possível carregar os dados do benchmark neste momento.";
        }

        var results =
            new List<GtaEventImpactResult>(
                eligibleEvents.Length);

        foreach (GtaEvent gtaEvent in eligibleEvents)
        {
            cancellationToken.ThrowIfCancellationRequested();

            GtaEventImpactResult result =
                CalculateFromLoadedSeries(
                    gtaEvent,
                    normalizedSymbol,
                    normalizedBenchmarkSymbol,
                    primaryTimeSeries,
                    primarySessions);

            if (!result.IsAvailable)
            {
                results.Add(result);
                continue;
            }

            if (
                benchmarkTimeSeries is null ||
                benchmarkSessionsByDate is null)
            {
                MarkBenchmarkUnavailable(
                    result,
                    benchmarkUnavailableReason ??
                    "Não existem dados suficientes do benchmark para os pregões analisados.");
            }
            else
            {
                PopulateBenchmarkComparison(
                    result,
                    benchmarkTimeSeries,
                    benchmarkSessionsByDate);
            }

            results.Add(result);
        }

        return results;
    }

    private static GtaEventImpactResult CalculateFromLoadedSeries(
        GtaEvent gtaEvent,
        string symbol,
        string benchmarkSymbol,
        StockTimeSeries primaryTimeSeries,
        IReadOnlyList<StockTimeSeriesPoint> tradingSessions)
    {
        DateTime analysisTimestampUtc =
            gtaEvent.PublishedAtUtc ??
            gtaEvent.OccurredAtUtc;

        var result = new GtaEventImpactResult
        {
            EventId = gtaEvent.Id,
            EventTitle = gtaEvent.Title,
            Symbol = symbol,
            BenchmarkSymbol = benchmarkSymbol,
            OccurredAtUtc = gtaEvent.OccurredAtUtc,
            AnalysisTimestampUtc = analysisTimestampUtc,
            UsedPublishedAtUtc =
                gtaEvent.PublishedAtUtc.HasValue,
            Exchange = primaryTimeSeries.Exchange,
            ExchangeTimezone =
                primaryTimeSeries.ExchangeTimezone
        };

        if (tradingSessions.Count < 2)
        {
            return MarkUnavailable(
                result,
                "Não existem dados históricos de mercado suficientes para este evento.");
        }

        EventMarketReference marketReference =
            ResolveEventMarketReference(
                gtaEvent,
                analysisTimestampUtc,
                primaryTimeSeries.ExchangeTimezone);

        result.WasPublishedAfterMarketClose =
            marketReference.WasAfterMarketClose;

        int eventSessionIndex = FindEventSessionIndex(
            tradingSessions,
            marketReference.MarketDate,
            marketReference.WasAfterMarketClose == true);

        if (eventSessionIndex <= 0)
        {
            return MarkUnavailable(
                result,
                "Não foi possível localizar um pregão anterior e um pregão efetivo completos.");
        }

        StockTimeSeriesPoint previousSession =
            tradingSessions[eventSessionIndex - 1];

        StockTimeSeriesPoint eventSession =
            tradingSessions[eventSessionIndex];

        StockTimeSeriesPoint? day1Session =
            GetSession(
                tradingSessions,
                eventSessionIndex + 1);

        StockTimeSeriesPoint? day5Session =
            GetSession(
                tradingSessions,
                eventSessionIndex + 5);

        StockTimeSeriesPoint? day30Session =
            GetSession(
                tradingSessions,
                eventSessionIndex + 30);

        IReadOnlyList<StockTimeSeriesPoint>
            previousVolumeSessions =
                GetPreviousSessions(
                    tradingSessions,
                    eventSessionIndex,
                    VolumeAverageSessionCount);

        decimal? averageVolume =
            CalculateAverageVolume(
                previousVolumeSessions);

        decimal? sameDayReturn =
            CalculateReturnPercent(
                previousSession.Close,
                eventSession.Close);

        decimal priceChange =
            eventSession.Close -
            previousSession.Close;

        result.IsAvailable = true;
        result.EffectiveTradingDate =
            eventSession.DateTime;
        result.PreviousTradingDate =
            previousSession.DateTime;
        result.PreviousClose =
            previousSession.Close;
        result.EventDayOpen =
            eventSession.Open;
        result.EventDayClose =
            eventSession.Close;
        result.EventDayVolume =
            eventSession.Volume;
        result.SameDayReturnPercent =
            sameDayReturn;

        result.Day1TradingDate =
            day1Session?.DateTime;
        result.Day1Close =
            day1Session?.Close;
        result.Day1ReturnPercent =
            CalculateReturnPercent(
                previousSession.Close,
                day1Session?.Close);

        result.Day5TradingDate =
            day5Session?.DateTime;
        result.Day5Close =
            day5Session?.Close;
        result.Day5ReturnPercent =
            CalculateReturnPercent(
                previousSession.Close,
                day5Session?.Close);

        result.Day30TradingDate =
            day30Session?.DateTime;
        result.Day30Close =
            day30Session?.Close;
        result.Day30ReturnPercent =
            CalculateReturnPercent(
                previousSession.Close,
                day30Session?.Close);

        result.AverageVolumeBefore30Sessions =
            averageVolume;
        result.PreviousVolumeSessionsUsed =
            previousVolumeSessions.Count;
        result.VolumeChangePercent =
            CalculateVolumeChangePercent(
                averageVolume,
                eventSession.Volume);

        result.PriceBefore =
            previousSession.Close;
        result.PriceBeforeRecordedAtUtc =
            previousSession.DateTime;
        result.PriceAfter =
            eventSession.Close;
        result.PriceAfterRecordedAtUtc =
            eventSession.DateTime;
        result.PriceChange =
            priceChange;
        result.PriceChangePercent =
            sameDayReturn;

        return result;
    }

    private static void PopulateBenchmarkComparison(
        GtaEventImpactResult result,
        StockTimeSeries benchmarkTimeSeries,
        IReadOnlyDictionary<DateTime, StockTimeSeriesPoint>
            benchmarkSessionsByDate)
    {
        if (
            !result.PreviousTradingDate.HasValue ||
            !result.EffectiveTradingDate.HasValue)
        {
            MarkBenchmarkUnavailable(
                result,
                "Não existem datas suficientes para comparar o benchmark.");
            return;
        }

        result.BenchmarkExchange =
            benchmarkTimeSeries.Exchange;
        result.BenchmarkExchangeTimezone =
            benchmarkTimeSeries.ExchangeTimezone;

        if (
            !TryGetSessionByDate(
                benchmarkSessionsByDate,
                result.PreviousTradingDate.Value,
                out StockTimeSeriesPoint
                    benchmarkPreviousSession) ||
            !TryGetSessionByDate(
                benchmarkSessionsByDate,
                result.EffectiveTradingDate.Value,
                out StockTimeSeriesPoint
                    benchmarkEventSession))
        {
            MarkBenchmarkUnavailable(
                result,
                "Não existem dados suficientes do benchmark para os pregões analisados.");
            return;
        }

        StockTimeSeriesPoint? benchmarkDay1Session =
            GetSessionByDate(
                benchmarkSessionsByDate,
                result.Day1TradingDate);

        StockTimeSeriesPoint? benchmarkDay5Session =
            GetSessionByDate(
                benchmarkSessionsByDate,
                result.Day5TradingDate);

        StockTimeSeriesPoint? benchmarkDay30Session =
            GetSessionByDate(
                benchmarkSessionsByDate,
                result.Day30TradingDate);

        result.BenchmarkIsAvailable = true;
        result.BenchmarkUnavailableReason = null;
        result.BenchmarkPreviousClose =
            benchmarkPreviousSession.Close;
        result.BenchmarkEventDayClose =
            benchmarkEventSession.Close;
        result.BenchmarkSameDayReturnPercent =
            CalculateReturnPercent(
                benchmarkPreviousSession.Close,
                benchmarkEventSession.Close);

        result.BenchmarkDay1Close =
            benchmarkDay1Session?.Close;
        result.BenchmarkDay1ReturnPercent =
            CalculateReturnPercent(
                benchmarkPreviousSession.Close,
                benchmarkDay1Session?.Close);

        result.BenchmarkDay5Close =
            benchmarkDay5Session?.Close;
        result.BenchmarkDay5ReturnPercent =
            CalculateReturnPercent(
                benchmarkPreviousSession.Close,
                benchmarkDay5Session?.Close);

        result.BenchmarkDay30Close =
            benchmarkDay30Session?.Close;
        result.BenchmarkDay30ReturnPercent =
            CalculateReturnPercent(
                benchmarkPreviousSession.Close,
                benchmarkDay30Session?.Close);

        result.SameDayExcessReturnPercent =
            SubtractPercentages(
                result.SameDayReturnPercent,
                result.BenchmarkSameDayReturnPercent);

        result.Day1ExcessReturnPercent =
            SubtractPercentages(
                result.Day1ReturnPercent,
                result.BenchmarkDay1ReturnPercent);

        result.Day5ExcessReturnPercent =
            SubtractPercentages(
                result.Day5ReturnPercent,
                result.BenchmarkDay5ReturnPercent);

        result.Day30ExcessReturnPercent =
            SubtractPercentages(
                result.Day30ReturnPercent,
                result.BenchmarkDay30ReturnPercent);
    }

    private async Task PopulateBenchmarkComparisonAsync(
        GtaEventImpactResult result,
        string symbol,
        string benchmarkSymbol,
        StockTimeSeriesQuery query,
        StockTimeSeries primaryTimeSeries,
        StockTimeSeriesPoint previousSession,
        StockTimeSeriesPoint eventSession,
        StockTimeSeriesPoint? day1Session,
        StockTimeSeriesPoint? day5Session,
        StockTimeSeriesPoint? day30Session,
        CancellationToken cancellationToken)
    {
        try
        {
            StockTimeSeries benchmarkTimeSeries =
                string.Equals(
                    symbol,
                    benchmarkSymbol,
                    StringComparison.OrdinalIgnoreCase)
                    ? primaryTimeSeries
                    : await _stockMarketService.GetTimeSeriesAsync(
                        benchmarkSymbol,
                        query,
                        cancellationToken);

            result.BenchmarkExchange = benchmarkTimeSeries.Exchange;
            result.BenchmarkExchangeTimezone =
                benchmarkTimeSeries.ExchangeTimezone;

            IReadOnlyDictionary<DateTime, StockTimeSeriesPoint>
                benchmarkSessionsByDate = NormalizeTradingSessions(
                    benchmarkTimeSeries.Values)
                .ToDictionary(
                    session => session.DateTime.Date);

            if (!TryGetSessionByDate(
                    benchmarkSessionsByDate,
                    previousSession.DateTime,
                    out StockTimeSeriesPoint benchmarkPreviousSession) ||
                !TryGetSessionByDate(
                    benchmarkSessionsByDate,
                    eventSession.DateTime,
                    out StockTimeSeriesPoint benchmarkEventSession))
            {
                MarkBenchmarkUnavailable(
                    result,
                    "Não existem dados suficientes do benchmark para os pregões analisados.");
                return;
            }

            StockTimeSeriesPoint? benchmarkDay1Session =
                GetSessionByDate(
                    benchmarkSessionsByDate,
                    day1Session?.DateTime);

            StockTimeSeriesPoint? benchmarkDay5Session =
                GetSessionByDate(
                    benchmarkSessionsByDate,
                    day5Session?.DateTime);

            StockTimeSeriesPoint? benchmarkDay30Session =
                GetSessionByDate(
                    benchmarkSessionsByDate,
                    day30Session?.DateTime);

            result.BenchmarkIsAvailable = true;
            result.BenchmarkUnavailableReason = null;
            result.BenchmarkPreviousClose =
                benchmarkPreviousSession.Close;
            result.BenchmarkEventDayClose =
                benchmarkEventSession.Close;
            result.BenchmarkSameDayReturnPercent =
                CalculateReturnPercent(
                    benchmarkPreviousSession.Close,
                    benchmarkEventSession.Close);

            result.BenchmarkDay1Close = benchmarkDay1Session?.Close;
            result.BenchmarkDay1ReturnPercent =
                CalculateReturnPercent(
                    benchmarkPreviousSession.Close,
                    benchmarkDay1Session?.Close);

            result.BenchmarkDay5Close = benchmarkDay5Session?.Close;
            result.BenchmarkDay5ReturnPercent =
                CalculateReturnPercent(
                    benchmarkPreviousSession.Close,
                    benchmarkDay5Session?.Close);

            result.BenchmarkDay30Close = benchmarkDay30Session?.Close;
            result.BenchmarkDay30ReturnPercent =
                CalculateReturnPercent(
                    benchmarkPreviousSession.Close,
                    benchmarkDay30Session?.Close);

            result.SameDayExcessReturnPercent = SubtractPercentages(
                result.SameDayReturnPercent,
                result.BenchmarkSameDayReturnPercent);

            result.Day1ExcessReturnPercent = SubtractPercentages(
                result.Day1ReturnPercent,
                result.BenchmarkDay1ReturnPercent);

            result.Day5ExcessReturnPercent = SubtractPercentages(
                result.Day5ReturnPercent,
                result.BenchmarkDay5ReturnPercent);

            result.Day30ExcessReturnPercent = SubtractPercentages(
                result.Day30ReturnPercent,
                result.BenchmarkDay30ReturnPercent);
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception)
        {
            MarkBenchmarkUnavailable(
                result,
                "Não foi possível carregar os dados do benchmark neste momento.");
        }
    }

    private static string NormalizeSymbol(
        string symbol,
        string fallbackSymbol)
    {
        return string.IsNullOrWhiteSpace(symbol)
            ? fallbackSymbol
            : symbol.Trim().ToUpperInvariant();
    }

    private static GtaEventImpactResult MarkUnavailable(
        GtaEventImpactResult result,
        string reason)
    {
        result.IsAvailable = false;
        result.UnavailableReason = reason;
        return result;
    }

    private static void MarkBenchmarkUnavailable(
        GtaEventImpactResult result,
        string reason)
    {
        result.BenchmarkIsAvailable = false;
        result.BenchmarkUnavailableReason = reason;
    }

    private static DateTime GetQueryEndDate(DateTime eventDate)
    {
        DateTime requestedEnd =
            eventDate.AddDays(HistoricalWindowInDays);

        DateTime today = DateTime.UtcNow.Date;

        return requestedEnd <= today
            ? requestedEnd
            : today;
    }

    private static IReadOnlyList<StockTimeSeriesPoint>
        NormalizeTradingSessions(
            IReadOnlyList<StockTimeSeriesPoint> values)
    {
        return values
            .Where(value =>
                value.DateTime != default &&
                value.Close > 0)
            .GroupBy(value => value.DateTime.Date)
            .Select(group => group
                .OrderBy(value => value.DateTime)
                .Last())
            .OrderBy(value => value.DateTime)
            .ToArray();
    }

    private static EventMarketReference ResolveEventMarketReference(
        GtaEvent gtaEvent,
        DateTime analysisTimestampUtc,
        string exchangeTimezone)
    {
        bool hasExactTime =
            gtaEvent.DatePrecision ==
                GtaEventDatePrecision.ExactTime ||
            (gtaEvent.PublishedAtUtc.HasValue &&
             gtaEvent.PublishedAtUtc.Value.TimeOfDay != TimeSpan.Zero);

        if (!hasExactTime)
        {
            return new EventMarketReference(
                analysisTimestampUtc.Date,
                null);
        }

        DateTime exchangeLocalTime = ConvertToExchangeTime(
            analysisTimestampUtc,
            exchangeTimezone);

        bool wasAfterMarketClose =
            exchangeLocalTime.TimeOfDay >=
            TimeSpan.FromHours(MarketCloseHour);

        return new EventMarketReference(
            exchangeLocalTime.Date,
            wasAfterMarketClose);
    }

    private static DateTime ConvertToExchangeTime(
        DateTime timestampUtc,
        string exchangeTimezone)
    {
        DateTime utcTimestamp = timestampUtc.Kind switch
        {
            DateTimeKind.Utc => timestampUtc,
            DateTimeKind.Local => timestampUtc.ToUniversalTime(),
            _ => DateTime.SpecifyKind(timestampUtc, DateTimeKind.Utc)
        };

        TimeZoneInfo? timeZone = ResolveTimeZone(exchangeTimezone);

        return timeZone is null
            ? utcTimestamp
            : TimeZoneInfo.ConvertTimeFromUtc(utcTimestamp, timeZone);
    }

    private static TimeZoneInfo? ResolveTimeZone(string timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return ResolveMappedTimeZone(timeZoneId);
        }
        catch (InvalidTimeZoneException)
        {
            return null;
        }
    }

    private static TimeZoneInfo? ResolveMappedTimeZone(
        string timeZoneId)
    {
        string? mappedId = null;

        if (OperatingSystem.IsWindows())
        {
            TimeZoneInfo.TryConvertIanaIdToWindowsId(
                timeZoneId,
                out mappedId);
        }
        else
        {
            TimeZoneInfo.TryConvertWindowsIdToIanaId(
                timeZoneId,
                out mappedId);
        }

        if (string.IsNullOrWhiteSpace(mappedId))
        {
            return null;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(mappedId);
        }
        catch (TimeZoneNotFoundException)
        {
            return null;
        }
        catch (InvalidTimeZoneException)
        {
            return null;
        }
    }

    private static int FindEventSessionIndex(
        IReadOnlyList<StockTimeSeriesPoint> sessions,
        DateTime marketDate,
        bool useNextSessionAfterDate)
    {
        for (int index = 0; index < sessions.Count; index++)
        {
            DateTime sessionDate = sessions[index].DateTime.Date;

            if (useNextSessionAfterDate)
            {
                if (sessionDate > marketDate.Date)
                {
                    return index;
                }
            }
            else if (sessionDate >= marketDate.Date)
            {
                return index;
            }
        }

        return -1;
    }

    private static StockTimeSeriesPoint? GetSession(
        IReadOnlyList<StockTimeSeriesPoint> sessions,
        int index)
    {
        return index >= 0 && index < sessions.Count
            ? sessions[index]
            : null;
    }

    private static bool TryGetSessionByDate(
        IReadOnlyDictionary<DateTime, StockTimeSeriesPoint> sessions,
        DateTime date,
        out StockTimeSeriesPoint session)
    {
        if (
            sessions.TryGetValue(
                date.Date,
                out StockTimeSeriesPoint? matchedSession) &&
            matchedSession is not null)
        {
            session = matchedSession;
            return true;
        }

        session = null!;
        return false;
    }

    private static StockTimeSeriesPoint? GetSessionByDate(
        IReadOnlyDictionary<DateTime, StockTimeSeriesPoint> sessions,
        DateTime? date)
    {
        if (!date.HasValue)
        {
            return null;
        }

        sessions.TryGetValue(date.Value.Date, out StockTimeSeriesPoint? session);
        return session;
    }

    private static IReadOnlyList<StockTimeSeriesPoint>
        GetPreviousSessions(
            IReadOnlyList<StockTimeSeriesPoint> sessions,
            int eventSessionIndex,
            int maximumCount)
    {
        int startIndex = Math.Max(
            0,
            eventSessionIndex - maximumCount);

        int count = eventSessionIndex - startIndex;

        return sessions
            .Skip(startIndex)
            .Take(count)
            .ToArray();
    }

    private static decimal? CalculateAverageVolume(
        IReadOnlyList<StockTimeSeriesPoint> sessions)
    {
        if (sessions.Count == 0)
        {
            return null;
        }

        return sessions.Average(session =>
            (decimal)session.Volume);
    }

    private static decimal? CalculateReturnPercent(
        decimal baselineClose,
        decimal? targetClose)
    {
        if (baselineClose == 0 || targetClose is null)
        {
            return null;
        }

        return (targetClose.Value - baselineClose)
            / baselineClose
            * 100;
    }

    private static decimal? CalculateVolumeChangePercent(
        decimal? averageVolume,
        long eventVolume)
    {
        if (averageVolume is null || averageVolume == 0)
        {
            return null;
        }

        return (eventVolume - averageVolume.Value)
            / averageVolume.Value
            * 100;
    }

    private static decimal? SubtractPercentages(
        decimal? stockReturn,
        decimal? benchmarkReturn)
    {
        if (!stockReturn.HasValue || !benchmarkReturn.HasValue)
        {
            return null;
        }

        return stockReturn.Value - benchmarkReturn.Value;
    }

    private sealed record EventMarketReference(
        DateTime MarketDate,
        bool? WasAfterMarketClose);
}
