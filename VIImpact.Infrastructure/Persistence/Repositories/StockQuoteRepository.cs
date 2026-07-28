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
    /// Adds a stock quote and saves the changes to the database.
    /// </summary>
    public async Task AddAsync(
        StockQuote stockQuote,
        CancellationToken cancellationToken = default)
    {
        await _dbContext.StockQuotes.AddAsync(
            stockQuote,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// Retrieves stored quotes ordered from newest to oldest.
    /// </summary>
    public async Task<IReadOnlyList<StockQuote>> GetHistoryAsync(
        string symbol,
        int limit,
        CancellationToken cancellationToken = default)
    {
        string normalizedSymbol = symbol.Trim().ToUpperInvariant();

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
        string normalizedSymbol = symbol.Trim().ToUpperInvariant();

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
        string normalizedSymbol = symbol.Trim().ToUpperInvariant();

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