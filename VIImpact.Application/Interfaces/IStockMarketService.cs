using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for retrieving stock-market data.
/// </summary>
public interface IStockMarketService
{
    /// <summary>
    /// Retrieves the latest quote for a stock symbol.
    /// </summary>
    Task<StockQuote> GetLatestQuoteAsync(
        string symbol,
        CancellationToken cancellationToken = default);
}