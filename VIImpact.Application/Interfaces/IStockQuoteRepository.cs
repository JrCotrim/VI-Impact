using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for storing and retrieving stock quotes.
/// </summary>
public interface IStockQuoteRepository
{
    /// <summary>
    /// Adds a stock quote only when an identical quote
    /// does not already exist.
    /// </summary>
    /// <returns>
    /// True when the quote was stored; otherwise, false.
    /// </returns>
    Task<bool> AddIfNewAsync(
        StockQuote stockQuote,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the latest stored quotes for a stock symbol.
    /// </summary>
    Task<IReadOnlyList<StockQuote>> GetHistoryAsync(
        string symbol,
        int limit,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the nearest quote recorded before a specific date.
    /// </summary>
    Task<StockQuote?> GetNearestBeforeAsync(
        string symbol,
        DateTime dateUtc,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the nearest quote recorded after a specific date.
    /// </summary>
    Task<StockQuote?> GetNearestAfterAsync(
        string symbol,
        DateTime dateUtc,
        CancellationToken cancellationToken = default);
}