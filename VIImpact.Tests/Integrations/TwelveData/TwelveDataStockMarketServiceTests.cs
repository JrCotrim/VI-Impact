using System.Net;
using System.Text;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData;

namespace VIImpact.Tests.Integrations.TwelveData;

public sealed class TwelveDataStockMarketServiceTests
{
    [Fact]
    public async Task GetLatestQuoteAsync_WhenFirstResponseIsTransient_RetriesAndReturnsQuote()
    {
        var handler =
            new SequenceHttpMessageHandler(
                CreateJsonResponse(
                    HttpStatusCode.ServiceUnavailable,
                    """
                    {
                      "status": "error",
                      "message": "Temporary provider failure."
                    }
                    """),
                CreateQuoteResponse());

        TwelveDataStockMarketService service =
            CreateService(
                handler,
                CreateOptions(
                    maxRetryAttempts: 2));

        var result =
            await service.GetLatestQuoteAsync(
                "ttwo");

        Assert.Equal(2, handler.CallCount);
        Assert.Equal("TTWO", result.Symbol);
        Assert.Equal(100.50m, result.Price);
        Assert.Equal(1.25m, result.ChangePercent);
        Assert.Equal(1234, result.Volume);
    }

    [Fact]
    public async Task GetLatestQuoteAsync_WhenResponseIsBadRequest_DoesNotRetryOrOpenCircuit()
    {
        var handler =
            new SequenceHttpMessageHandler(
                CreateJsonResponse(
                    HttpStatusCode.BadRequest,
                    """
                    {
                      "status": "error",
                      "message": "Invalid symbol."
                    }
                    """),
                CreateQuoteResponse());

        TwelveDataOptions options =
            CreateOptions(
                maxRetryAttempts: 2);

        options.CircuitBreakerFailureThreshold = 1;

        TwelveDataStockMarketService service =
            CreateService(
                handler,
                options);

        TwelveDataApiException exception =
            await Assert.ThrowsAsync<
                TwelveDataApiException>(
                    () =>
                        service.GetLatestQuoteAsync(
                            "INVALID"));

        Assert.Equal(1, handler.CallCount);
        Assert.Equal(
            HttpStatusCode.BadRequest,
            exception.StatusCode);
        Assert.Contains(
            "Invalid symbol",
            exception.Message);

        var recoveredResult =
            await service.GetLatestQuoteAsync(
                "TTWO");

        Assert.Equal(2, handler.CallCount);
        Assert.Equal(
            "TTWO",
            recoveredResult.Symbol);
    }

    [Fact]
    public async Task GetLatestQuoteAsync_WhenRateLimited_DoesNotRetryAndStartsCooldown()
    {
        var handler =
            new SequenceHttpMessageHandler(
                CreateRateLimitResponse());

        TwelveDataStockMarketService service =
            CreateService(
                handler,
                CreateOptions(
                    maxRetryAttempts: 2));

        TwelveDataRateLimitException exception =
            await Assert.ThrowsAsync<
                TwelveDataRateLimitException>(
                    () =>
                        service.GetLatestQuoteAsync(
                            "TTWO"));

        Assert.Equal(1, handler.CallCount);
        Assert.Equal(
            HttpStatusCode.TooManyRequests,
            exception.StatusCode);
        Assert.True(
            exception.RetryAfter >
            TimeSpan.Zero);
        Assert.Contains(
            "request limit",
            exception.Message.ToLowerInvariant());

        TwelveDataRateLimitException blockedException =
            await Assert.ThrowsAsync<
                TwelveDataRateLimitException>(
                    () =>
                        service.GetLatestQuoteAsync(
                            "QQQ"));

        Assert.Equal(1, handler.CallCount);
        Assert.True(
            blockedException.RetryAfter >
            TimeSpan.Zero);
    }

    [Fact]
    public async Task GetLatestQuoteAsync_WhenRequestTimesOut_ThrowsTimeoutException()
    {
        var handler =
            new TimeoutHttpMessageHandler();

        TwelveDataOptions options =
            CreateOptions(
                maxRetryAttempts: 0);

        options.RequestTimeoutSeconds = 1;

        TwelveDataStockMarketService service =
            CreateService(
                handler,
                options);

        await Assert.ThrowsAsync<
            TimeoutException>(
                () =>
                    service.GetLatestQuoteAsync(
                        "TTWO"));

        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task GetLatestQuoteAsync_WhenFailureThresholdIsReached_OpensCircuit()
    {
        var handler =
            new SequenceHttpMessageHandler(
                CreateJsonResponse(
                    HttpStatusCode.ServiceUnavailable,
                    """
                    {
                      "status": "error",
                      "message": "Provider unavailable."
                    }
                    """),
                CreateJsonResponse(
                    HttpStatusCode.ServiceUnavailable,
                    """
                    {
                      "status": "error",
                      "message": "Provider unavailable."
                    }
                    """));

        TwelveDataOptions options =
            CreateOptions(
                maxRetryAttempts: 0);

        options.CircuitBreakerFailureThreshold = 2;
        options.CircuitBreakerDurationSeconds = 60;

        TwelveDataStockMarketService service =
            CreateService(
                handler,
                options);

        await Assert.ThrowsAsync<
            TwelveDataApiException>(
                () =>
                    service.GetLatestQuoteAsync(
                        "TTWO"));

        await Assert.ThrowsAsync<
            TwelveDataApiException>(
                () =>
                    service.GetLatestQuoteAsync(
                        "TTWO"));

        TwelveDataCircuitOpenException exception =
            await Assert.ThrowsAsync<
                TwelveDataCircuitOpenException>(
                    () =>
                        service.GetLatestQuoteAsync(
                            "TTWO"));

        Assert.Equal(2, handler.CallCount);
        Assert.True(
            exception.RetryAfter >
            TimeSpan.Zero);
    }

    private static TwelveDataStockMarketService CreateService(
        HttpMessageHandler handler,
        TwelveDataOptions options)
    {
        var httpClient =
            new HttpClient(
                handler)
            {
                BaseAddress =
                    new Uri(
                        options.BaseUrl),

                Timeout =
                    Timeout.InfiniteTimeSpan
            };

        return new TwelveDataStockMarketService(
            httpClient,
            options,
            new TwelveDataResilienceState(),
            TimeProvider.System,
            logger: null);
    }

    private static TwelveDataOptions CreateOptions(
        int maxRetryAttempts)
    {
        return new TwelveDataOptions
        {
            ApiKey = "test-api-key",
            BaseUrl = "https://api.twelvedata.com",
            RequestTimeoutSeconds = 2,
            MaxRetryAttempts = maxRetryAttempts,
            RetryBaseDelayMilliseconds = 0,
            MaximumRetryDelaySeconds = 1,
            CircuitBreakerFailureThreshold = 3,
            CircuitBreakerDurationSeconds = 30
        };
    }

    private static HttpResponseMessage CreateQuoteResponse()
    {
        return CreateJsonResponse(
            HttpStatusCode.OK,
            """
            {
              "symbol": "TTWO",
              "close": "100.50",
              "percent_change": "1.25",
              "volume": "1234",
              "timestamp": 1777777777,
              "last_quote_at": 1777777777
            }
            """);
    }

    private static HttpResponseMessage CreateRateLimitResponse()
    {
        return CreateJsonResponse(
            HttpStatusCode.TooManyRequests,
            """
            {
              "status": "error",
              "message": "Twelve Data request limit reached."
            }
            """);
    }

    private static HttpResponseMessage CreateJsonResponse(
        HttpStatusCode statusCode,
        string json)
    {
        return new HttpResponseMessage(
            statusCode)
        {
            Content =
                new StringContent(
                    json,
                    Encoding.UTF8,
                    "application/json")
        };
    }

    private sealed class SequenceHttpMessageHandler
        : HttpMessageHandler
    {
        private readonly Queue<HttpResponseMessage>
            _responses;

        public SequenceHttpMessageHandler(
            params HttpResponseMessage[] responses)
        {
            _responses =
                new Queue<HttpResponseMessage>(
                    responses);
        }

        public int CallCount { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;

            if (_responses.Count == 0)
            {
                throw new InvalidOperationException(
                    "No HTTP response was configured for this request.");
            }

            return Task.FromResult(
                _responses.Dequeue());
        }

        protected override void Dispose(
            bool disposing)
        {
            if (disposing)
            {
                while (_responses.Count > 0)
                {
                    _responses
                        .Dequeue()
                        .Dispose();
                }
            }

            base.Dispose(
                disposing);
        }
    }

    private sealed class TimeoutHttpMessageHandler
        : HttpMessageHandler
    {
        public int CallCount { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            CallCount++;

            await Task.Delay(
                Timeout.InfiniteTimeSpan,
                cancellationToken);

            throw new InvalidOperationException(
                "The timeout handler unexpectedly completed.");
        }
    }
}
