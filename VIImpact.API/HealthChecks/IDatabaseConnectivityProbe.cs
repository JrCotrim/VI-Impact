namespace VIImpact.API.HealthChecks;

/// <summary>
/// Defines the database connectivity operation used by readiness checks.
/// </summary>
public interface IDatabaseConnectivityProbe
{
    Task<bool> CanConnectAsync(
        CancellationToken cancellationToken);
}