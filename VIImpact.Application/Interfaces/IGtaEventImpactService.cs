using VIImpact.Application.Models;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for calculating the stock-market impact
/// associated with GTA VI events.
/// </summary>
public interface IGtaEventImpactService
{
    /// <summary>
    /// Calculates the stock-price movement using QQQ as the
    /// default market benchmark.
    /// </summary>
    Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates the stock-price movement and compares it with
    /// the informed market benchmark.
    /// </summary>
    Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
        string benchmarkSymbol,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculates the impact of all eligible occurred events while
    /// sharing the same historical series between the calculations.
    /// </summary>
    Task<IReadOnlyList<GtaEventImpactResult>> CalculateRankingAsync(
        string symbol,
        string benchmarkSymbol,
        CancellationToken cancellationToken = default);
}