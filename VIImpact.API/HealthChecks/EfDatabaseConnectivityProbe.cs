using VIImpact.Infrastructure.Persistence;

namespace VIImpact.API.HealthChecks;

/// <summary>
/// Checks SQL Server connectivity through the application's DbContext.
/// </summary>
public sealed class EfDatabaseConnectivityProbe
    : IDatabaseConnectivityProbe
{
    private readonly VIImpactDbContext _dbContext;

    public EfDatabaseConnectivityProbe(
        VIImpactDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> CanConnectAsync(
        CancellationToken cancellationToken)
    {
        return _dbContext.Database.CanConnectAsync(
            cancellationToken);
    }
}