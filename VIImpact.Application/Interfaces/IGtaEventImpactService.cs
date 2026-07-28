using VIImpact.Application.Models;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for calculating the stock-market impact
/// associated with GTA VI events.
/// </summary>
public interface IGtaEventImpactService
{
    /// <summary>
    /// Calculates the stock-price movement before and after an event.
    /// </summary>
    Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
        CancellationToken cancellationToken = default);
}