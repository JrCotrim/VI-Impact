using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using VIImpact.API.HealthChecks;

namespace VIImpact.Tests.HealthChecks;

/// <summary>
/// Verifies the PostgreSQL readiness health check.
/// </summary>
public sealed class DatabaseHealthCheckTests
{
    [Fact]
    public async Task CheckHealthAsync_WhenDatabaseIsAvailable_ReturnsHealthy()
    {
        HealthCheckResult result =
            await ExecuteHealthCheckAsync(
                canConnect: true);

        Assert.Equal(
            HealthStatus.Healthy,
            result.Status);

        Assert.Equal(
            "PostgreSQL connection is available.",
            result.Description);
    }

    [Fact]
    public async Task CheckHealthAsync_WhenDatabaseIsUnavailable_ReturnsUnhealthy()
    {
        HealthCheckResult result =
            await ExecuteHealthCheckAsync(
                canConnect: false);

        Assert.Equal(
            HealthStatus.Unhealthy,
            result.Status);

        Assert.Equal(
            "PostgreSQL connection is unavailable.",
            result.Description);
    }

    private static async Task<HealthCheckResult>
        ExecuteHealthCheckAsync(
            bool canConnect)
    {
        var services =
            new ServiceCollection();

        services.AddScoped<
            IDatabaseConnectivityProbe>(
                _ =>
                    new StubDatabaseConnectivityProbe(
                        canConnect));

        await using ServiceProvider provider =
            services.BuildServiceProvider(
                validateScopes: true);

        var healthCheck =
            new DatabaseHealthCheck(
                provider.GetRequiredService<
                    IServiceScopeFactory>());

        return await healthCheck.CheckHealthAsync(
            new HealthCheckContext(),
            CancellationToken.None);
    }

    private sealed class StubDatabaseConnectivityProbe
        : IDatabaseConnectivityProbe
    {
        private readonly bool _canConnect;

        public StubDatabaseConnectivityProbe(
            bool canConnect)
        {
            _canConnect = canConnect;
        }

        public Task<bool> CanConnectAsync(
            CancellationToken cancellationToken)
        {
            return Task.FromResult(_canConnect);
        }
    }
}