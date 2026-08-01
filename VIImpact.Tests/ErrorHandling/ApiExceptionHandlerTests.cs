using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using VIImpact.API.ErrorHandling;
using VIImpact.Infrastructure.Integrations.TwelveData;

namespace VIImpact.Tests.ErrorHandling;

/// <summary>
/// Verifies the public HTTP contract produced by the global API
/// exception handler.
/// </summary>
public sealed class ApiExceptionHandlerTests
{
    [Fact]
    public async Task TryHandleAsync_WhenRateLimitIsReached_Returns429WithRetryAfter()
    {
        HandledProblem result =
            await HandleAsync(
                new TwelveDataRateLimitException(
                    "Provider quota details.",
                    TimeSpan.FromSeconds(12.2)));

        Assert.Equal(
            StatusCodes.Status429TooManyRequests,
            result.HttpContext.Response.StatusCode);

        Assert.Equal(
            "13",
            result.HttpContext.Response.Headers.RetryAfter);

        AssertProblemDetails(
            result,
            expectedStatus:
                StatusCodes.Status429TooManyRequests,
            expectedTitle:
                "Limite do provedor atingido",
            expectedErrorCode:
                "provider_rate_limit",
            expectedType:
                "https://httpstatuses.com/429");
    }

    [Fact]
    public async Task TryHandleAsync_WhenProviderRejectsRequest_Returns502WithoutLeakingProviderMessage()
    {
        const string providerMessage =
            "Sensitive provider response details.";

        HandledProblem result =
            await HandleAsync(
                new TwelveDataApiException(
                    providerMessage,
                    HttpStatusCode.BadRequest));

        AssertProblemDetails(
            result,
            expectedStatus:
                StatusCodes.Status502BadGateway,
            expectedTitle:
                "Resposta inválida do provedor",
            expectedErrorCode:
                "provider_bad_response",
            expectedType:
                "https://httpstatuses.com/502");

        Assert.DoesNotContain(
            providerMessage,
            result.ProblemDetails.Detail ??
                string.Empty,
            StringComparison.Ordinal);
    }

    [Fact]
    public async Task TryHandleAsync_WhenCircuitIsOpen_Returns503WithRetryAfter()
    {
        HandledProblem result =
            await HandleAsync(
                new TwelveDataCircuitOpenException(
                    TimeSpan.FromSeconds(30)));

        Assert.Equal(
            "30",
            result.HttpContext.Response.Headers.RetryAfter);

        AssertProblemDetails(
            result,
            expectedStatus:
                StatusCodes.Status503ServiceUnavailable,
            expectedTitle:
                "Provedor temporariamente indisponível",
            expectedErrorCode:
                "provider_circuit_open",
            expectedType:
                "https://httpstatuses.com/503");
    }

    [Fact]
    public async Task TryHandleAsync_WhenProviderTimesOut_Returns504()
    {
        HandledProblem result =
            await HandleAsync(
                new TimeoutException(
                    "Internal timeout diagnostics."));

        Assert.False(
            result.HttpContext.Response.Headers
                .ContainsKey("Retry-After"));

        AssertProblemDetails(
            result,
            expectedStatus:
                StatusCodes.Status504GatewayTimeout,
            expectedTitle:
                "Tempo limite do provedor excedido",
            expectedErrorCode:
                "provider_timeout",
            expectedType:
                "https://httpstatuses.com/504");
    }

    [Fact]
    public async Task TryHandleAsync_WhenUnexpectedExceptionOccurs_ReturnsSafe500()
    {
        const string internalMessage =
            "Database password and internal diagnostics.";

        HandledProblem result =
            await HandleAsync(
                new InvalidOperationException(
                    internalMessage));

        AssertProblemDetails(
            result,
            expectedStatus:
                StatusCodes.Status500InternalServerError,
            expectedTitle:
                "Erro interno do servidor",
            expectedErrorCode:
                "internal_error",
            expectedType:
                "https://httpstatuses.com/500");

        Assert.DoesNotContain(
            internalMessage,
            result.ProblemDetails.Detail ??
                string.Empty,
            StringComparison.Ordinal);
    }

    private static async Task<HandledProblem>
        HandleAsync(
            Exception exception)
    {
        const string requestPath =
            "/api/test/provider";

        const string traceId =
            "trace-api-exception-test";

        var problemDetailsService =
            new RecordingProblemDetailsService();

        var handler =
            new ApiExceptionHandler(
                problemDetailsService,
                new TestLogger<ApiExceptionHandler>());

        var httpContext =
            new DefaultHttpContext
            {
                TraceIdentifier = traceId
            };

        httpContext.Request.Path =
            requestPath;

        bool wasHandled =
            await handler.TryHandleAsync(
                httpContext,
                exception,
                CancellationToken.None);

        Assert.True(wasHandled);
        Assert.NotNull(
            problemDetailsService.LastContext);

        return new HandledProblem(
            httpContext,
            problemDetailsService
                .LastContext!
                .ProblemDetails,
            requestPath,
            traceId);
    }

    private static void AssertProblemDetails(
        HandledProblem result,
        int expectedStatus,
        string expectedTitle,
        string expectedErrorCode,
        string expectedType)
    {
        Assert.Equal(
            expectedStatus,
            result.HttpContext.Response.StatusCode);

        Assert.Equal(
            "no-store",
            result.HttpContext.Response.Headers.CacheControl);

        Assert.Equal(
            expectedStatus,
            result.ProblemDetails.Status);

        Assert.Equal(
            expectedTitle,
            result.ProblemDetails.Title);

        Assert.Equal(
            expectedType,
            result.ProblemDetails.Type);

        Assert.Equal(
            result.RequestPath,
            result.ProblemDetails.Instance);

        Assert.Equal(
            expectedErrorCode,
            result.ProblemDetails
                .Extensions["errorCode"]);

        Assert.Equal(
            result.TraceId,
            result.ProblemDetails
                .Extensions["traceId"]);
    }

    private sealed class RecordingProblemDetailsService
        : IProblemDetailsService
    {
        public ProblemDetailsContext? LastContext
        {
            get;
            private set;
        }

        public ValueTask WriteAsync(
            ProblemDetailsContext context)
        {
            LastContext = context;
            return ValueTask.CompletedTask;
        }

        public ValueTask<bool> TryWriteAsync(
            ProblemDetailsContext context)
        {
            LastContext = context;
            return ValueTask.FromResult(true);
        }
    }

    private sealed class TestLogger<T>
        : ILogger<T>
    {
        public IDisposable? BeginScope<TState>(
            TState state)
            where TState : notnull
        {
            return null;
        }

        public bool IsEnabled(
            LogLevel logLevel)
        {
            return false;
        }

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string>
                formatter)
        {
        }
    }

    private sealed record HandledProblem(
        HttpContext HttpContext,
        ProblemDetails ProblemDetails,
        string RequestPath,
        string TraceId);
}