using System.Collections.Concurrent;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
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
    private readonly TwelveDataResilienceState _resilienceState;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<TwelveDataStockMarketService>? _logger;

    internal TwelveDataStockMarketService(
        HttpClient httpClient,
        TwelveDataOptions options)
        : this(
            httpClient,
            options,
            new TwelveDataResilienceState(),
            TimeProvider.System,
            null)
    {
    }

    public TwelveDataStockMarketService(
        HttpClient httpClient,
        TwelveDataOptions options,
        TwelveDataResilienceState resilienceState,
        TimeProvider timeProvider,
        ILogger<TwelveDataStockMarketService>? logger)
    {
        ArgumentNullException.ThrowIfNull(httpClient);
        ArgumentNullException.ThrowIfNull(options);
        ArgumentNullException.ThrowIfNull(resilienceState);
        ArgumentNullException.ThrowIfNull(timeProvider);

        _httpClient = httpClient;
        _options = options;
        _resilienceState = resilienceState;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<StockQuote> GetLatestQuoteAsync(
        string symbol,
        CancellationToken cancellationToken = default)
    {
        ValidateSymbol(symbol);
        ValidateApiKey();

        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        return await ExecuteProviderOperationAsync(
            $"latest quote for {normalizedSymbol}",
            token =>
                GetLatestQuoteFromProviderAsync(
                    normalizedSymbol,
                    token),
            cancellationToken);
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
                await ExecuteProviderOperationAsync(
                    $"time series for {normalizedSymbol}",
                    token =>
                        GetTimeSeriesFromProviderAsync(
                            normalizedSymbol,
                            query,
                            token),
                    cancellationToken);

            TimeSpan cacheDuration =
                GetTimeSeriesCacheDuration(query);

            TimeSeriesCache[cacheKey] =
                new TimeSeriesCacheEntry
                {
                    Value = timeSeries,
                    ExpiresAtUtc =
                        _timeProvider
                            .GetUtcNow()
                            .UtcDateTime
                            .Add(
                                cacheDuration)
                };

            return timeSeries;
        }
        finally
        {
            cacheLock.Release();
        }
    }

    private async Task<StockQuote> GetLatestQuoteFromProviderAsync(
        string normalizedSymbol,
        CancellationToken cancellationToken)
    {
        string endpoint =
            $"/quote?symbol={Uri.EscapeDataString(normalizedSymbol)}";

        using HttpResponseMessage response =
            await SendWithResilienceAsync(
                endpoint,
                $"latest quote for {normalizedSymbol}",
                cancellationToken);

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
            RecordedAtUtc =
                _timeProvider.GetUtcNow().UtcDateTime,
            MarketTimestampUtc = marketTimestampUtc
        };
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

        using HttpResponseMessage response =
            await SendWithResilienceAsync(
                endpoint,
                $"time series for {normalizedSymbol}",
                cancellationToken);

        TwelveDataTimeSeriesResponse responseBody =
            await response.Content
                .ReadFromJsonAsync<TwelveDataTimeSeriesResponse>(
                    cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "Twelve Data returned an empty time-series response.");

        if (
            string.Equals(
                responseBody.Status,
                "error",
                StringComparison.OrdinalIgnoreCase))
        {
            string message =
                string.IsNullOrWhiteSpace(responseBody.Message)
                    ? "Twelve Data returned an error response."
                    : responseBody.Message;

            throw new TwelveDataApiException(
                message,
                response.StatusCode);
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

    private async Task<T> ExecuteProviderOperationAsync<T>(
        string operationName,
        Func<CancellationToken, Task<T>> operation,
        CancellationToken cancellationToken)
    {
        DateTimeOffset now =
            _timeProvider.GetUtcNow();

        if (!_resilienceState.TryEnter(
                now,
                out bool isHalfOpenProbe,
                out TimeSpan retryAfter))
        {
            _logger?.LogWarning(
                "The Twelve Data circuit is open. The {Operation} request "
                + "was blocked for another {RetryAfterSeconds:F1} seconds.",
                operationName,
                retryAfter.TotalSeconds);

            throw new TwelveDataCircuitOpenException(
                retryAfter);
        }

        try
        {
            T result =
                await operation(
                    cancellationToken);

            bool recovered =
                _resilienceState.RecordSuccess();

            if (recovered)
            {
                _logger?.LogInformation(
                    "The Twelve Data circuit recovered after a successful "
                    + "{Operation} request.",
                    operationName);
            }

            return result;
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            _resilienceState.RecordCancellation(
                isHalfOpenProbe);

            throw;
        }
        catch (Exception exception)
            when (!ShouldRecordCircuitFailure(
                exception))
        {
            _logger?.LogWarning(
                exception,
                "The Twelve Data {Operation} request was rejected and "
                + "will not affect the circuit breaker.",
                operationName);

            throw;
        }
        catch (Exception exception)
        {
            bool circuitOpened =
                _resilienceState.RecordFailure(
                    _timeProvider.GetUtcNow(),
                    GetCircuitBreakerFailureThreshold(),
                    GetCircuitBreakerDuration());

            if (circuitOpened)
            {
                _logger?.LogError(
                    exception,
                    "The Twelve Data circuit opened after the {Operation} "
                    + "request failed. Calls will be blocked for "
                    + "{BreakDurationSeconds} seconds.",
                    operationName,
                    GetCircuitBreakerDuration().TotalSeconds);
            }
            else
            {
                _logger?.LogWarning(
                    exception,
                    "The Twelve Data {Operation} request failed.",
                    operationName);
            }

            throw;
        }
    }

    private async Task<HttpResponseMessage> SendWithResilienceAsync(
        string endpoint,
        string operationName,
        CancellationToken cancellationToken)
    {
        int maximumRetryAttempts =
            GetMaximumRetryAttempts();

        int totalAttempts =
            maximumRetryAttempts + 1;

        for (
            int attempt = 1;
            attempt <= totalAttempts;
            attempt++)
        {
            using HttpRequestMessage request =
                CreateAuthenticatedRequest(
                    endpoint);

            using var timeoutCancellation =
                CancellationTokenSource
                    .CreateLinkedTokenSource(
                        cancellationToken);

            timeoutCancellation.CancelAfter(
                GetRequestTimeout());

            try
            {
                HttpResponseMessage response =
                    await _httpClient.SendAsync(
                        request,
                        HttpCompletionOption.ResponseContentRead,
                        timeoutCancellation.Token);

                if (response.IsSuccessStatusCode)
                {
                    return response;
                }

                bool shouldRetry =
                    IsTransientStatusCode(
                        response.StatusCode);

                if (
                    !shouldRetry ||
                    attempt >= totalAttempts)
                {
                    Exception exception;

                    try
                    {
                        exception =
                            await CreateApiExceptionAsync(
                                response,
                                cancellationToken);
                    }
                    finally
                    {
                        response.Dispose();
                    }

                    throw exception;
                }

                TimeSpan delay =
                    GetRetryDelay(
                        response,
                        attempt);

                _logger?.LogWarning(
                    "Twelve Data returned HTTP {StatusCode} during "
                    + "{Operation}. Attempt {Attempt}/{TotalAttempts}; "
                    + "retrying in {DelayMilliseconds} ms.",
                    (int)response.StatusCode,
                    operationName,
                    attempt,
                    totalAttempts,
                    delay.TotalMilliseconds);

                response.Dispose();

                await DelayBeforeRetryAsync(
                    delay,
                    cancellationToken);
            }
            catch (OperationCanceledException exception)
                when (!cancellationToken.IsCancellationRequested)
            {
                if (attempt >= totalAttempts)
                {
                    throw new TimeoutException(
                        $"Twelve Data did not complete the {operationName} "
                        + $"request within {GetRequestTimeout().TotalSeconds:F0} "
                        + "seconds.",
                        exception);
                }

                TimeSpan delay =
                    GetRetryDelay(
                        response: null,
                        attempt);

                _logger?.LogWarning(
                    exception,
                    "The Twelve Data {Operation} request timed out. "
                    + "Attempt {Attempt}/{TotalAttempts}; retrying in "
                    + "{DelayMilliseconds} ms.",
                    operationName,
                    attempt,
                    totalAttempts,
                    delay.TotalMilliseconds);

                await DelayBeforeRetryAsync(
                    delay,
                    cancellationToken);
            }
            catch (HttpRequestException exception)
            {
                if (attempt >= totalAttempts)
                {
                    throw new TwelveDataApiException(
                        $"Could not reach Twelve Data while requesting "
                        + $"{operationName}.",
                        statusCode: null,
                        innerException: exception);
                }

                TimeSpan delay =
                    GetRetryDelay(
                        response: null,
                        attempt);

                _logger?.LogWarning(
                    exception,
                    "A network error occurred during the Twelve Data "
                    + "{Operation} request. Attempt "
                    + "{Attempt}/{TotalAttempts}; retrying in "
                    + "{DelayMilliseconds} ms.",
                    operationName,
                    attempt,
                    totalAttempts,
                    delay.TotalMilliseconds);

                await DelayBeforeRetryAsync(
                    delay,
                    cancellationToken);
            }
        }

        throw new InvalidOperationException(
            "The Twelve Data request ended in an unexpected state.");
    }

    private async Task DelayBeforeRetryAsync(
        TimeSpan delay,
        CancellationToken cancellationToken)
    {
        if (delay <= TimeSpan.Zero)
        {
            return;
        }

        await Task.Delay(
            delay,
            _timeProvider,
            cancellationToken);
    }

    private async Task<Exception> CreateApiExceptionAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        string? providerMessage =
            await TryReadProviderMessageAsync(
                response,
                cancellationToken);

        if (response.StatusCode == HttpStatusCode.TooManyRequests)
        {
            TimeSpan? retryAfter =
                TryGetRetryAfter(
                    response);

            string message =
                string.IsNullOrWhiteSpace(providerMessage)
                    ? "Twelve Data request limit reached."
                    : providerMessage;

            if (retryAfter.HasValue)
            {
                message +=
                    $" Try again in approximately "
                    + $"{Math.Ceiling(retryAfter.Value.TotalSeconds)} seconds.";
            }

            return new TwelveDataRateLimitException(
                message,
                retryAfter);
        }

        string fallbackMessage =
            $"Twelve Data returned HTTP status "
            + $"{(int)response.StatusCode} "
            + $"({response.ReasonPhrase}).";

        return new TwelveDataApiException(
            string.IsNullOrWhiteSpace(providerMessage)
                ? fallbackMessage
                : providerMessage,
            response.StatusCode);
    }

    private static async Task<string?> TryReadProviderMessageAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        try
        {
            string payload =
                await response.Content.ReadAsStringAsync(
                    cancellationToken);

            if (string.IsNullOrWhiteSpace(payload))
            {
                return null;
            }

            using JsonDocument document =
                JsonDocument.Parse(
                    payload);

            if (
                document.RootElement.TryGetProperty(
                    "message",
                    out JsonElement messageElement) &&
                messageElement.ValueKind ==
                    JsonValueKind.String)
            {
                return messageElement.GetString();
            }
        }
        catch (
            Exception exception)
            when (
                exception is JsonException ||
                exception is InvalidOperationException ||
                exception is NotSupportedException)
        {
            return null;
        }

        return null;
    }

    private TimeSpan GetRetryDelay(
        HttpResponseMessage? response,
        int attempt)
    {
        TimeSpan? retryAfter =
            response is null
                ? null
                : TryGetRetryAfter(
                    response);

        TimeSpan maximumDelay =
            GetMaximumRetryDelay();

        if (retryAfter.HasValue)
        {
            return retryAfter.Value <= maximumDelay
                ? retryAfter.Value
                : maximumDelay;
        }

        int baseDelayMilliseconds =
            Math.Clamp(
                _options.RetryBaseDelayMilliseconds,
                0,
                10_000);

        if (baseDelayMilliseconds == 0)
        {
            return TimeSpan.Zero;
        }

        double exponentialDelay =
            baseDelayMilliseconds *
            Math.Pow(
                2,
                Math.Max(
                    0,
                    attempt - 1));

        int jitterLimit =
            Math.Max(
                1,
                baseDelayMilliseconds / 4);

        int jitter =
            Random.Shared.Next(
                0,
                jitterLimit);

        double delayMilliseconds =
            Math.Min(
                exponentialDelay + jitter,
                maximumDelay.TotalMilliseconds);

        return TimeSpan.FromMilliseconds(
            delayMilliseconds);
    }

    private TimeSpan? TryGetRetryAfter(
        HttpResponseMessage response)
    {
        RetryConditionHeaderValue? retryAfter =
            response.Headers.RetryAfter;

        if (retryAfter?.Delta is TimeSpan delta)
        {
            return delta > TimeSpan.Zero
                ? delta
                : TimeSpan.Zero;
        }

        if (retryAfter?.Date is DateTimeOffset date)
        {
            TimeSpan delay =
                date - _timeProvider.GetUtcNow();

            return delay > TimeSpan.Zero
                ? delay
                : TimeSpan.Zero;
        }

        return null;
    }

    private TimeSpan GetRequestTimeout()
    {
        int timeoutSeconds =
            Math.Clamp(
                _options.RequestTimeoutSeconds,
                1,
                120);

        return TimeSpan.FromSeconds(
            timeoutSeconds);
    }

    private int GetMaximumRetryAttempts()
    {
        return Math.Clamp(
            _options.MaxRetryAttempts,
            0,
            5);
    }

    private TimeSpan GetMaximumRetryDelay()
    {
        int delaySeconds =
            Math.Clamp(
                _options.MaximumRetryDelaySeconds,
                1,
                60);

        return TimeSpan.FromSeconds(
            delaySeconds);
    }

    private int GetCircuitBreakerFailureThreshold()
    {
        return Math.Clamp(
            _options.CircuitBreakerFailureThreshold,
            1,
            20);
    }

    private TimeSpan GetCircuitBreakerDuration()
    {
        int durationSeconds =
            Math.Clamp(
                _options.CircuitBreakerDurationSeconds,
                1,
                300);

        return TimeSpan.FromSeconds(
            durationSeconds);
    }

    private static bool ShouldRecordCircuitFailure(
        Exception exception)
    {
        if (
            exception is TwelveDataApiException apiException &&
            apiException.StatusCode.HasValue)
        {
            return IsTransientStatusCode(
                apiException.StatusCode.Value);
        }

        return true;
    }

    private static bool IsTransientStatusCode(
        HttpStatusCode statusCode)
    {
        int numericStatusCode =
            (int)statusCode;

        return
            statusCode ==
                HttpStatusCode.RequestTimeout ||
            statusCode ==
                HttpStatusCode.TooManyRequests ||
            numericStatusCode >= 500;
    }

    private bool TryGetCachedTimeSeries(
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

        if (
            cacheEntry.ExpiresAtUtc <=
            _timeProvider.GetUtcNow().UtcDateTime)
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

/// <summary>
/// Shared circuit-breaker state for all Twelve Data typed-client instances.
/// </summary>
public sealed class TwelveDataResilienceState
{
    private readonly object _syncRoot = new();

    private int _consecutiveFailures;
    private DateTimeOffset? _openUntilUtc;
    private bool _halfOpenProbeInProgress;

    internal bool TryEnter(
        DateTimeOffset now,
        out bool isHalfOpenProbe,
        out TimeSpan retryAfter)
    {
        lock (_syncRoot)
        {
            isHalfOpenProbe = false;
            retryAfter = TimeSpan.Zero;

            if (!_openUntilUtc.HasValue)
            {
                return true;
            }

            if (_openUntilUtc.Value > now)
            {
                retryAfter =
                    _openUntilUtc.Value - now;

                return false;
            }

            if (_halfOpenProbeInProgress)
            {
                retryAfter =
                    TimeSpan.FromSeconds(1);

                return false;
            }

            _halfOpenProbeInProgress = true;
            isHalfOpenProbe = true;

            return true;
        }
    }

    internal bool RecordSuccess()
    {
        lock (_syncRoot)
        {
            bool recovered =
                _consecutiveFailures > 0 ||
                _openUntilUtc.HasValue ||
                _halfOpenProbeInProgress;

            _consecutiveFailures = 0;
            _openUntilUtc = null;
            _halfOpenProbeInProgress = false;

            return recovered;
        }
    }

    internal bool RecordFailure(
        DateTimeOffset now,
        int failureThreshold,
        TimeSpan breakDuration)
    {
        lock (_syncRoot)
        {
            _consecutiveFailures++;
            _halfOpenProbeInProgress = false;

            bool shouldOpen =
                _openUntilUtc.HasValue ||
                _consecutiveFailures >=
                    failureThreshold;

            if (!shouldOpen)
            {
                return false;
            }

            _openUntilUtc =
                now.Add(
                    breakDuration);

            return true;
        }
    }

    internal void RecordCancellation(
        bool wasHalfOpenProbe)
    {
        if (!wasHalfOpenProbe)
        {
            return;
        }

        lock (_syncRoot)
        {
            _halfOpenProbeInProgress = false;
        }
    }
}

/// <summary>
/// Represents a provider or transport failure returned by Twelve Data.
/// </summary>
public class TwelveDataApiException : InvalidOperationException
{
    public TwelveDataApiException(
        string message,
        HttpStatusCode? statusCode,
        Exception? innerException = null)
        : base(
            message,
            innerException)
    {
        StatusCode = statusCode;
    }

    public HttpStatusCode? StatusCode { get; }
}

/// <summary>
/// Indicates that Twelve Data rejected a request because its rate limit
/// was reached.
/// </summary>
public sealed class TwelveDataRateLimitException
    : TwelveDataApiException
{
    public TwelveDataRateLimitException(
        string message,
        TimeSpan? retryAfter)
        : base(
            message,
            HttpStatusCode.TooManyRequests)
    {
        RetryAfter = retryAfter;
    }

    public TimeSpan? RetryAfter { get; }
}

/// <summary>
/// Indicates that provider calls are temporarily blocked after repeated
/// failures.
/// </summary>
public sealed class TwelveDataCircuitOpenException
    : InvalidOperationException
{
    public TwelveDataCircuitOpenException(
        TimeSpan retryAfter)
        : base(
            "Twelve Data is temporarily unavailable because repeated "
            + "requests failed. Try again after the circuit breaker "
            + "recovery period.")
    {
        RetryAfter = retryAfter;
    }

    public TimeSpan RetryAfter { get; }
}