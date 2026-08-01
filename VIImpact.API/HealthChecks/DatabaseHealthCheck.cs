using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace VIImpact.API.HealthChecks;

/// <summary>
/// Reports whether the API can establish a connection to SQL Server.
/// </summary>
public sealed class DatabaseHealthCheck : IHealthCheck
{
    private readonly IServiceScopeFactory _scopeFactory;

    public DatabaseHealthCheck(
        IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken =
            default)
    {
        try
        {
            await using AsyncServiceScope scope =
                _scopeFactory.CreateAsyncScope();

            IDatabaseConnectivityProbe probe =
                scope.ServiceProvider.GetRequiredService<
                    IDatabaseConnectivityProbe>();

            bool canConnect =
                await probe.CanConnectAsync(
                    cancellationToken);

            if (canConnect)
            {
                return HealthCheckResult.Healthy(
                    "SQL Server connection is available.");
            }

            return HealthCheckResult.Unhealthy(
                "SQL Server connection is unavailable.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy(
                "SQL Server connectivity check failed.",
                exception);
        }
    }
}