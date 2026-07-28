using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for storing and retrieving stock quotes.
/// </summary>
public interface IStockQuoteRepository
{
    /// <summary>
    /// Adds a stock quote to the database.
    /// </summary>
    Task AddAsync(
        StockQuote stockQuote,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the latest stored quotes for a stock symbol.
    /// </summary>
    Task<IReadOnlyList<StockQuote>> GetHistoryAsync(
        string symbol,
        int limit,
        CancellationToken cancellationToken = default);
}