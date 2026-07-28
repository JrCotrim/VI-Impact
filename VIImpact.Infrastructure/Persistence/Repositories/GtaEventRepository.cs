using Microsoft.EntityFrameworkCore;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.Infrastructure.Persistence.Repositories;

/// <summary>
/// Persists and retrieves GTA VI events using Entity Framework Core.
/// </summary>
public sealed class GtaEventRepository : IGtaEventRepository
{
    private readonly VIImpactDbContext _dbContext;

    public GtaEventRepository(VIImpactDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Adds a GTA VI event and saves the changes to the database.
    /// </summary>
    public async Task AddAsync(
        GtaEvent gtaEvent,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.GtaEvents.AddAsync(
            gtaEvent,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Retrieves all GTA VI events from newest to oldest.
    /// </summary>
    public async Task<IReadOnlyList<GtaEvent>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.GtaEvents
            .AsNoTracking()
            .OrderByDescending(gtaEvent =>
                gtaEvent.OccurredAtUtc)
            .ToListAsync(cancellationToken);
    }
}