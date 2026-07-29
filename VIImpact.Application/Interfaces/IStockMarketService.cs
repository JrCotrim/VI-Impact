using VIImpact.Application.Models;
using VIImpact.Domain.Entities;

namespace VIImpact.Application.Interfaces;

/// <summary>
/// Defines operations for retrieving stock-market data.
/// </summary>
public interface IStockMarketService
{
    Task<StockQuote> GetLatestQuoteAsync(
        string symbol,
        CancellationToken cancellationToken = default);

    Task<StockTimeSeries> GetTimeSeriesAsync(
        string symbol,
        string interval,
        int outputSize,
        CancellationToken cancellationToken = default);
}