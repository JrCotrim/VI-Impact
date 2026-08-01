using System.Net;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using VIImpact.Infrastructure.Integrations.TwelveData;

namespace VIImpact.API.ErrorHandling;

/// <summary>
/// Converts application and provider exceptions into safe,
/// standardized RFC 7807 responses.
/// </summary>
public sealed class ApiExceptionHandler : IExceptionHandler
{
    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ILogger<ApiExceptionHandler> _logger;

    public ApiExceptionHandler(
        IProblemDetailsService problemDetailsService,
        ILogger<ApiExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (httpContext.RequestAborted.IsCancellationRequested)
        {
            return false;
        }

        ApiErrorDescriptor descriptor =
            MapException(exception);

        LogException(
            exception,
            descriptor,
            httpContext.TraceIdentifier);

        httpContext.Response.StatusCode =
            descriptor.StatusCode;

        httpContext.Response.Headers.CacheControl =
            "no-store";

        if (descriptor.RetryAfter.HasValue)
        {
            int retryAfterSeconds =
                Math.Max(
                    1,
                    (int)Math.Ceiling(
                        descriptor.RetryAfter.Value.TotalSeconds));

            httpContext.Response.Headers.RetryAfter =
                retryAfterSeconds.ToString(
                    System.Globalization.CultureInfo.InvariantCulture);
        }

        var problemDetails = new ProblemDetails
        {
            Status = descriptor.StatusCode,
            Title = descriptor.Title,
            Detail = descriptor.Detail,
            Type = descriptor.Type,
            Instance = httpContext.Request.Path
        };

        problemDetails.Extensions["errorCode"] =
            descriptor.ErrorCode;

        var problemDetailsContext =
            new ProblemDetailsContext
            {
                HttpContext = httpContext,
                ProblemDetails = problemDetails,
                Exception = exception
            };

        return await _problemDetailsService.TryWriteAsync(
            problemDetailsContext);
    }

    private static ApiErrorDescriptor MapException(
        Exception exception)
    {
        return exception switch
        {
            TwelveDataRateLimitException rateLimitException =>
                new ApiErrorDescriptor(
                    StatusCodes.Status429TooManyRequests,
                    "Limite do provedor atingido",
                    "O provedor de dados de mercado atingiu o limite "
                    + "de requisições. Tente novamente em instantes.",
                    "provider_rate_limit",
                    "https://httpstatuses.com/429",
                    rateLimitException.RetryAfter),

            TwelveDataCircuitOpenException circuitOpenException =>
                new ApiErrorDescriptor(
                    StatusCodes.Status503ServiceUnavailable,
                    "Provedor temporariamente indisponível",
                    "As consultas ao provedor de dados foram pausadas "
                    + "temporariamente após falhas consecutivas.",
                    "provider_circuit_open",
                    "https://httpstatuses.com/503",
                    circuitOpenException.RetryAfter),

            TimeoutException =>
                new ApiErrorDescriptor(
                    StatusCodes.Status504GatewayTimeout,
                    "Tempo limite do provedor excedido",
                    "O provedor de dados de mercado demorou mais que "
                    + "o permitido para responder.",
                    "provider_timeout",
                    "https://httpstatuses.com/504"),

            TwelveDataApiException providerException
                when providerException.StatusCode ==
                    HttpStatusCode.RequestTimeout =>
                new ApiErrorDescriptor(
                    StatusCodes.Status504GatewayTimeout,
                    "Tempo limite do provedor excedido",
                    "O provedor de dados de mercado não concluiu "
                    + "a solicitação dentro do prazo.",
                    "provider_timeout",
                    "https://httpstatuses.com/504"),

            TwelveDataApiException providerException
                when IsProviderUnavailable(
                    providerException.StatusCode) =>
                new ApiErrorDescriptor(
                    StatusCodes.Status503ServiceUnavailable,
                    "Provedor temporariamente indisponível",
                    "Não foi possível consultar os dados de mercado "
                    + "neste momento. Tente novamente mais tarde.",
                    "provider_unavailable",
                    "https://httpstatuses.com/503"),

            TwelveDataApiException =>
                new ApiErrorDescriptor(
                    StatusCodes.Status502BadGateway,
                    "Resposta inválida do provedor",
                    "O provedor de dados de mercado rejeitou ou não "
                    + "conseguiu processar a solicitação.",
                    "provider_bad_response",
                    "https://httpstatuses.com/502"),

            ArgumentException argumentException =>
                new ApiErrorDescriptor(
                    StatusCodes.Status400BadRequest,
                    "Solicitação inválida",
                    argumentException.Message,
                    "invalid_request",
                    "https://httpstatuses.com/400"),

            _ =>
                new ApiErrorDescriptor(
                    StatusCodes.Status500InternalServerError,
                    "Erro interno do servidor",
                    "Ocorreu um erro inesperado ao processar "
                    + "a solicitação.",
                    "internal_error",
                    "https://httpstatuses.com/500")
        };
    }

    private static bool IsProviderUnavailable(
        HttpStatusCode? statusCode)
    {
        if (!statusCode.HasValue)
        {
            return true;
        }

        int numericStatusCode =
            (int)statusCode.Value;

        return numericStatusCode >= 500;
    }

    private void LogException(
        Exception exception,
        ApiErrorDescriptor descriptor,
        string traceId)
    {
        if (descriptor.StatusCode >= 500)
        {
            _logger.LogError(
                exception,
                "Request failed with API error {ErrorCode}. "
                + "TraceId: {TraceId}.",
                descriptor.ErrorCode,
                traceId);

            return;
        }

        _logger.LogWarning(
            exception,
            "Request was rejected with API error {ErrorCode}. "
            + "TraceId: {TraceId}.",
            descriptor.ErrorCode,
            traceId);
    }

    private sealed record ApiErrorDescriptor(
        int StatusCode,
        string Title,
        string Detail,
        string ErrorCode,
        string Type,
        TimeSpan? RetryAfter = null);
}