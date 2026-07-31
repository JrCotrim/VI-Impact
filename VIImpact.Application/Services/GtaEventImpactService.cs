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

    /// <summary>
    /// Calculates cumulative returns from the close immediately before
    /// the event through D0, D+1, D+5 and D+30 trading sessions.
    /// </summary>
    public async Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
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

        string normalizedSymbol = symbol.Trim().ToUpperInvariant();
        DateTime analysisTimestampUtc =
            gtaEvent.PublishedAtUtc ?? gtaEvent.OccurredAtUtc;

        var result = new GtaEventImpactResult
        {
            EventId = gtaEvent.Id,
            EventTitle = gtaEvent.Title,
            Symbol = normalizedSymbol,
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

        decimal? priceChange =
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

        return result;
    }

    private static GtaEventImpactResult MarkUnavailable(
        GtaEventImpactResult result,
        string reason)
    {
        result.IsAvailable = false;
        result.UnavailableReason = reason;
        return result;
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

    private sealed record EventMarketReference(
        DateTime MarketDate,
        bool? WasAfterMarketClose);
}