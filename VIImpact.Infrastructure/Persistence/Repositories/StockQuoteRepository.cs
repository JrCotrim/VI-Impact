using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.Infrastructure.Persistence.Repositories;

/// <summary>
/// Persists stock quotes in the database using Entity Framework Core.
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
}