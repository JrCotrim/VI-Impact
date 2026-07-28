using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

public interface IStockMarketService
{
    Task<StockQuote> GetLatestQuoteAsync(
        string symbol,
        CancellationToken cancellationToken = default);
}