using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace VIImpact.API.HealthChecks;

/// <summary>
/// Writes health-check results as a compact JSON document.
/// </summary>
public static class HealthCheckResponseWriter
{
    private static readonly JsonSerializerOptions
        SerializerOptions =
            new(JsonSerializerDefaults.Web);

    public static Task WriteAsync(
        HttpContext httpContext,
        HealthReport report)
    {
        httpContext.Response.ContentType =
            "application/json; charset=utf-8";

        httpContext.Response.Headers.CacheControl =
            "no-store";

        var response = new
        {
            status =
                report.Status
                    .ToString()
                    .ToLowerInvariant(),
            durationMilliseconds =
                Math.Round(
                    report.TotalDuration.TotalMilliseconds,
                    2),
            checks =
                report.Entries.Select(entry => new
                {
                    name = entry.Key,
                    status =
                        entry.Value.Status
                            .ToString()
                            .ToLowerInvariant(),
                    durationMilliseconds =
                        Math.Round(
                            entry.Value.Duration
                                .TotalMilliseconds,
                            2),
                    description =
                        entry.Value.Description
                })
        };

        return httpContext.Response.WriteAsJsonAsync(
            response,
            SerializerOptions,
            httpContext.RequestAborted);
    }
}