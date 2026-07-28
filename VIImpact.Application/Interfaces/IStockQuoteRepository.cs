using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for storing stock quotes.
/// </summary>
public interface IStockQuoteRepository
{
    /// <summary>
    /// Adds a stock quote to the database.
    /// </summary>
    Task AddAsync(
        StockQuote stockQuote,
        CancellationToken cancellationToken = default);
}