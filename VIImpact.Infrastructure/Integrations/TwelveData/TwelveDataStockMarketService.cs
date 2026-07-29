using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Domain.Entities;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData.Models;

namespace VIImpact.Infrastructure.Integrations.TwelveData;

/// <summary>
/// Retrieves current and historical stock data from the Twelve Data API.
/// </summary>
public sealed class TwelveDataStockMarketService : IStockMarketService
{
    private static readonly string[] TimeSeriesDateFormats =
    [
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd HH:mm",
        "yyyy-MM-dd"
    ];

    private static readonly ConcurrentDictionary<
        string,
        TimeSeriesCacheEntry> TimeSeriesCache = new();

    private static readonly ConcurrentDictionary<
        string,
        SemaphoreSlim> TimeSeriesCacheLocks = new();

    private readonly HttpClient _httpClient;
    private readonly TwelveDataOptions _options;

    public TwelveDataStockMarketService(
        HttpClient httpClient,
        TwelveDataOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<StockQuote> GetLatestQuoteAsync(
        string symbol,
        CancellationToken cancellationToken = default)
    {
        ValidateSymbol(symbol);
        ValidateApiKey();

        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        string endpoint =
            $"/quote?symbol={Uri.EscapeDataString(normalizedSymbol)}";

        using HttpRequestMessage request =
            CreateAuthenticatedRequest(endpoint);

        using HttpResponseMessage response =
            await _httpClient.SendAsync(
                request,
                cancellationToken);

        response.EnsureSuccessStatusCode();

        TwelveDataQuoteResponse quote =
            await response.Content
                .ReadFromJsonAsync<TwelveDataQuoteResponse>(
                    cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "Twelve Data returned an empty quote response.");

        if (!decimal.TryParse(
                quote.Close,
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out decimal price))
        {
            throw new InvalidOperationException(
                "The stock price returned by Twelve Data is invalid.");
        }

        decimal.TryParse(
            quote.PercentChange,
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out decimal changePercent);

        long.TryParse(
            quote.Volume,
            NumberStyles.Integer,
            CultureInfo.InvariantCulture,
            out long volume);

        long marketTimestamp =
            quote.LastQuoteAt > 0
                ? quote.LastQuoteAt
                : quote.Timestamp;

        DateTime? marketTimestampUtc =
            marketTimestamp > 0
                ? DateTimeOffset
                    .FromUnixTimeSeconds(marketTimestamp)
                    .UtcDateTime
                : null;

        return new StockQuote
        {
            Id = Guid.NewGuid(),
            Symbol = string.IsNullOrWhiteSpace(quote.Symbol)
                ? normalizedSymbol
                : quote.Symbol.Trim().ToUpperInvariant(),
            Price = price,
            ChangePercent = changePercent,
            Volume = volume,
            RecordedAtUtc = DateTime.UtcNow,
            MarketTimestampUtc = marketTimestampUtc
        };
    }

    public async Task<StockTimeSeries> GetTimeSeriesAsync(
        string symbol,
        StockTimeSeriesQuery query,
        CancellationToken cancellationToken = default)
    {
        ValidateSymbol(symbol);
        ValidateApiKey();
        ValidateTimeSeriesQuery(query);

        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        string cacheKey =
            CreateTimeSeriesCacheKey(
                normalizedSymbol,
                query);

        if (TryGetCachedTimeSeries(
                cacheKey,
                out StockTimeSeries? cachedTimeSeries))
        {
            return cachedTimeSeries;
        }

        SemaphoreSlim cacheLock =
            TimeSeriesCacheLocks.GetOrAdd(
                cacheKey,
                _ => new SemaphoreSlim(1, 1));

        await cacheLock.WaitAsync(
            cancellationToken);

        try
        {
            if (TryGetCachedTimeSeries(
                    cacheKey,
                    out cachedTimeSeries))
            {
                return cachedTimeSeries;
            }

            StockTimeSeries timeSeries =
                await GetTimeSeriesFromProviderAsync(
                    normalizedSymbol,
                    query,
                    cancellationToken);

            TimeSpan cacheDuration =
                GetTimeSeriesCacheDuration(query);

            TimeSeriesCache[cacheKey] =
                new TimeSeriesCacheEntry
                {
                    Value = timeSeries,
                    ExpiresAtUtc =
                        DateTime.UtcNow.Add(
                            cacheDuration)
                };

            return timeSeries;
        }
        finally
        {
            cacheLock.Release();
        }
    }

    private async Task<StockTimeSeries> GetTimeSeriesFromProviderAsync(
        string normalizedSymbol,
        StockTimeSeriesQuery query,
        CancellationToken cancellationToken)
    {
        string endpoint =
            CreateTimeSeriesEndpoint(
                normalizedSymbol,
                query);

        using HttpRequestMessage request =
            CreateAuthenticatedRequest(endpoint);

        using HttpResponseMessage response =
            await _httpClient.SendAsync(
                request,
                cancellationToken);

        TwelveDataTimeSeriesResponse responseBody =
            await response.Content
                .ReadFromJsonAsync<TwelveDataTimeSeriesResponse>(
                    cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "Twelve Data returned an empty time-series response.");

        if (
            !response.IsSuccessStatusCode ||
            string.Equals(
                responseBody.Status,
                "error",
                StringComparison.OrdinalIgnoreCase))
        {
            string message =
                string.IsNullOrWhiteSpace(responseBody.Message)
                    ? $"Twelve Data returned HTTP status {(int)response.StatusCode}."
                    : responseBody.Message;

            throw new InvalidOperationException(message);
        }

        TwelveDataTimeSeriesMeta metadata =
            responseBody.Meta
            ?? throw new InvalidOperationException(
                "Twelve Data returned time-series data without metadata.");

        TimeZoneInfo exchangeTimeZone =
            ResolveTimeZone(
                metadata.ExchangeTimezone);

        var values =
            new List<StockTimeSeriesPoint>();

        foreach (
            TwelveDataTimeSeriesValue responseValue
            in responseBody.Values
                ?? Enumerable.Empty<TwelveDataTimeSeriesValue>())
        {
            if (
                TryCreateTimeSeriesPoint(
                    responseValue,
                    exchangeTimeZone,
                    out StockTimeSeriesPoint? point))
            {
                values.Add(point);
            }
        }

        values.Sort(
            (firstPoint, secondPoint) =>
                firstPoint.DateTime.CompareTo(
                    secondPoint.DateTime));

        if (values.Count == 0)
        {
            throw new InvalidOperationException(
                "Twelve Data returned no valid historical price points.");
        }

        return new StockTimeSeries
        {
            Symbol = string.IsNullOrWhiteSpace(metadata.Symbol)
                ? normalizedSymbol
                : metadata.Symbol.Trim().ToUpperInvariant(),

            Interval = metadata.Interval,
            Currency = metadata.Currency,
            Exchange = metadata.Exchange,

            ExchangeTimezone =
                metadata.ExchangeTimezone,

            Values = values
        };
    }

    private static bool TryGetCachedTimeSeries(
        string cacheKey,
        [NotNullWhen(true)] out StockTimeSeries? timeSeries)
    {
        timeSeries = null;

        if (!TimeSeriesCache.TryGetValue(
                cacheKey,
                out TimeSeriesCacheEntry? cacheEntry))
        {
            return false;
        }

        if (cacheEntry.ExpiresAtUtc <= DateTime.UtcNow)
        {
            TimeSeriesCache.TryRemove(
                cacheKey,
                out _);

            return false;
        }

        timeSeries = cacheEntry.Value;

        return true;
    }

    private static string CreateTimeSeriesCacheKey(
        string normalizedSymbol,
        StockTimeSeriesQuery query)
    {
        string normalizedInterval =
            query.Interval
                .Trim()
                .ToLowerInvariant();

        string outputSize =
            query.OutputSize?.ToString(
                CultureInfo.InvariantCulture)
            ?? "none";

        string startDate =
            query.StartDate?.ToString(
                "O",
                CultureInfo.InvariantCulture)
            ?? "none";

        string endDate =
            query.EndDate?.ToString(
                "O",
                CultureInfo.InvariantCulture)
            ?? "none";

        return string.Join(
            "|",
            normalizedSymbol,
            normalizedInterval,
            outputSize,
            startDate,
            endDate);
    }

    private static TimeSpan GetTimeSeriesCacheDuration(
        StockTimeSeriesQuery query)
    {
        string normalizedInterval =
            query.Interval
                .Trim()
                .ToLowerInvariant();

        return normalizedInterval switch
        {
            "1min" or
            "5min" or
            "15min" =>
                TimeSpan.FromMinutes(1),

            "30min" or
            "45min" or
            "1h" or
            "2h" or
            "4h" =>
                TimeSpan.FromMinutes(5),

            "1day" =>
                TimeSpan.FromMinutes(30),

            "1week" or
            "1month" =>
                TimeSpan.FromHours(12),

            _ =>
                TimeSpan.FromMinutes(10)
        };
    }

    private static string CreateTimeSeriesEndpoint(
        string normalizedSymbol,
        StockTimeSeriesQuery query)
    {
        var parameters =
            new List<string>
            {
                $"symbol={Uri.EscapeDataString(normalizedSymbol)}",
                $"interval={Uri.EscapeDataString(query.Interval.Trim())}",
                "adjust=all"
            };

        if (query.OutputSize.HasValue)
        {
            parameters.Add(
                $"outputsize={query.OutputSize.Value}");
        }

        if (query.StartDate.HasValue)
        {
            string startDate =
                FormatDateParameter(
                    query.StartDate.Value);

            parameters.Add(
                $"start_date={Uri.EscapeDataString(startDate)}");
        }

        if (query.EndDate.HasValue)
        {
            string endDate =
                FormatDateParameter(
                    query.EndDate.Value);

            parameters.Add(
                $"end_date={Uri.EscapeDataString(endDate)}");
        }

        return
            $"/time_series?{string.Join("&", parameters)}";
    }

    private static string FormatDateParameter(
        DateTime dateTime)
    {
        if (dateTime.TimeOfDay == TimeSpan.Zero)
        {
            return dateTime.ToString(
                "yyyy-MM-dd",
                CultureInfo.InvariantCulture);
        }

        return dateTime.ToString(
            "yyyy-MM-ddTHH:mm:ss",
            CultureInfo.InvariantCulture);
    }

    private HttpRequestMessage CreateAuthenticatedRequest(
        string endpoint)
    {
        var request =
            new HttpRequestMessage(
                HttpMethod.Get,
                endpoint);

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "apikey",
                _options.ApiKey);

        return request;
    }

    private static bool TryCreateTimeSeriesPoint(
        TwelveDataTimeSeriesValue responseValue,
        TimeZoneInfo exchangeTimeZone,
        [NotNullWhen(true)] out StockTimeSeriesPoint? point)
    {
        point = null;

        if (!DateTime.TryParseExact(
                responseValue.DateTimeText,
                TimeSeriesDateFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.None,
                out DateTime exchangeDateTime))
        {
            return false;
        }

        if (
            !TryParseDecimal(
                responseValue.Open,
                out decimal open) ||
            !TryParseDecimal(
                responseValue.High,
                out decimal high) ||
            !TryParseDecimal(
                responseValue.Low,
                out decimal low) ||
            !TryParseDecimal(
                responseValue.Close,
                out decimal close))
        {
            return false;
        }

        long.TryParse(
            responseValue.Volume,
            NumberStyles.Integer,
            CultureInfo.InvariantCulture,
            out long volume);

        DateTime unspecifiedDateTime =
            DateTime.SpecifyKind(
                exchangeDateTime,
                DateTimeKind.Unspecified);

        DateTime dateTimeUtc;

        try
        {
            dateTimeUtc =
                TimeZoneInfo.ConvertTimeToUtc(
                    unspecifiedDateTime,
                    exchangeTimeZone);
        }
        catch (ArgumentException)
        {
            return false;
        }

        point = new StockTimeSeriesPoint
        {
            DateTime = dateTimeUtc,
            Open = open,
            High = high,
            Low = low,
            Close = close,
            Volume = volume
        };

        return true;
    }

    private static bool TryParseDecimal(
        string value,
        out decimal result)
    {
        return decimal.TryParse(
            value,
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out result);
    }

    private static TimeZoneInfo ResolveTimeZone(
        string timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return TimeZoneInfo.Utc;
        }

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(
                timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            bool wasConverted =
                TimeZoneInfo.TryConvertIanaIdToWindowsId(
                    timeZoneId,
                    out string? windowsTimeZoneId);

            if (
                wasConverted &&
                !string.IsNullOrWhiteSpace(windowsTimeZoneId))
            {
                return TimeZoneInfo.FindSystemTimeZoneById(
                    windowsTimeZoneId);
            }

            throw new InvalidOperationException(
                $"The exchange timezone '{timeZoneId}' is not supported.");
        }
        catch (InvalidTimeZoneException exception)
        {
            throw new InvalidOperationException(
                $"The exchange timezone '{timeZoneId}' is invalid.",
                exception);
        }
    }

    private static void ValidateTimeSeriesQuery(
        StockTimeSeriesQuery query)
    {
        ArgumentNullException.ThrowIfNull(query);

        if (string.IsNullOrWhiteSpace(query.Interval))
        {
            throw new ArgumentException(
                "The time-series interval is required.",
                nameof(query));
        }

        if (
            query.OutputSize.HasValue &&
            query.OutputSize.Value is < 1 or > 5000)
        {
            throw new ArgumentOutOfRangeException(
                nameof(query),
                "The output size must be between 1 and 5000.");
        }

        if (
            query.StartDate.HasValue &&
            query.EndDate.HasValue &&
            query.StartDate.Value >
            query.EndDate.Value)
        {
            throw new ArgumentException(
                "The start date cannot be after the end date.",
                nameof(query));
        }
    }

    private static void ValidateSymbol(
        string symbol)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException(
                "The stock symbol is required.",
                nameof(symbol));
        }
    }

    private void ValidateApiKey()
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "The Twelve Data API key was not configured.");
        }
    }

    private sealed class TimeSeriesCacheEntry
    {
        public required StockTimeSeries Value { get; init; }

        public DateTime ExpiresAtUtc { get; init; }
    }
}