using Microsoft.EntityFrameworkCore;
using VIImpact.Domain.Entities;

namespace VIImpact.Infrastructure.Persistence;

public sealed class VIImpactDbContext : DbContext
{
    public VIImpactDbContext(
        DbContextOptions<VIImpactDbContext> options)
        : base(options)
    {
    }

    public DbSet<StockQuote> StockQuotes { get; set; }

    public DbSet<GtaEvent> GtaEvents { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<StockQuote>(entity =>
        {
            entity.Property(stockQuote => stockQuote.Price)
                .HasPrecision(18, 6);

            entity.Property(stockQuote => stockQuote.ChangePercent)
                .HasPrecision(18, 6);
        });
    }
}