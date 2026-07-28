using Microsoft.EntityFrameworkCore;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.Infrastructure.Persistence.Repositories;

/// <summary>
/// Persists and retrieves stock quotes using Entity Framework Core.
/// </summary>
public sealed class StockQuoteRepository : IStockQuoteRepository
{
    private readonly VIImpactDbContext _dbContext;

    public StockQuoteRepository(VIImpactDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Adds a stock quote only when an identical quote
    /// does not already exist.
    /// </summary>
    public async Task<bool> AddIfNewAsync(
        StockQuote stockQuote,
        CancellationToken cancellationToken = default)
    {
        string normalizedSymbol =
            stockQuote.Symbol.Trim().ToUpperInvariant();

        bool identicalQuoteExists =
            await _dbContext.StockQuotes
                .AsNoTracking()
                .AnyAsync(
                    existingQuote =>
                        existingQuote.Symbol == normalizedSymbol &&
                        existingQuote.Price == stockQuote.Price &&
                        existingQuote.ChangePercent ==
                            stockQuote.ChangePercent &&
                        existingQuote.Volume == stockQuote.Volume &&
                        existingQuote.MarketTimestampUtc ==
                            stockQuote.MarketTimestampUtc,
                    cancellationToken);

        if (identicalQuoteExists)
        {
            return false;
        }

        stockQuote.Symbol = normalizedSymbol;

        await _dbContext.StockQuotes.AddAsync(
            stockQuote,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return true;
    }

    /// <summary>
    /// Retrieves stored quotes ordered from newest to oldest.
    /// </summary>
    public async Task<IReadOnlyList<StockQuote>> GetHistoryAsync(
        string symbol,
        int limit,
        CancellationToken cancellationToken = default)
    {
        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        return await _dbContext.StockQuotes
            .AsNoTracking()
            .Where(stockQuote =>
                stockQuote.Symbol == normalizedSymbol)
            .OrderByDescending(stockQuote =>
                stockQuote.RecordedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Retrieves the most recent quote recorded before a specific date.
    /// </summary>
    public async Task<StockQuote?> GetNearestBeforeAsync(
        string symbol,
        DateTime dateUtc,
        CancellationToken cancellationToken = default)
    {
        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        return await _dbContext.StockQuotes
            .AsNoTracking()
            .Where(stockQuote =>
                stockQuote.Symbol == normalizedSymbol &&
                stockQuote.RecordedAtUtc <= dateUtc)
            .OrderByDescending(stockQuote =>
                stockQuote.RecordedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }

    /// <summary>
    /// Retrieves the first quote recorded after a specific date.
    /// </summary>
    public async Task<StockQuote?> GetNearestAfterAsync(
        string symbol,
        DateTime dateUtc,
        CancellationToken cancellationToken = default)
    {
        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        return await _dbContext.StockQuotes
            .AsNoTracking()
            .Where(stockQuote =>
                stockQuote.Symbol == normalizedSymbol &&
                stockQuote.RecordedAtUtc >= dateUtc)
            .OrderBy(stockQuote =>
                stockQuote.RecordedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);
    }
}