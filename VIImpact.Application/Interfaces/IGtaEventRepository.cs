using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for storing and retrieving GTA VI events.
/// </summary>
public interface IGtaEventRepository
{
    /// <summary>
    /// Adds a GTA VI event to the database.
    /// </summary>
    Task AddAsync(
        GtaEvent gtaEvent,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all stored GTA VI events ordered by date.
    /// </summary>
    Task<IReadOnlyList<GtaEvent>> GetAllAsync(
        CancellationToken cancellationToken = default);
}