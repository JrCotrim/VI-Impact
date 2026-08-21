using Microsoft.EntityFrameworkCore;
using VIImpact.Domain.Entities;

namespace VIImpact.Infrastructure.Persistence;

/// <summary>
/// Represents the VI Impact database context.
/// </summary>
public sealed class VIImpactDbContext : DbContext
{
    public VIImpactDbContext(
        DbContextOptions<VIImpactDbContext> options)
        : base(options)
    {
    }

    public DbSet<StockQuote> StockQuotes { get; set; }

    public DbSet<GtaEvent> GtaEvents { get; set; }

    protected override void OnModelCreating(
        ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<StockQuote>(entity =>
        {
            entity.Property(stockQuote => stockQuote.Price)
                .HasPrecision(18, 6);

            entity.Property(stockQuote =>
                    stockQuote.ChangePercent)
                .HasPrecision(18, 6);

            entity.HasIndex(stockQuote => new
            {
                stockQuote.Symbol,
                stockQuote.RecordedAtUtc
            })
                .HasDatabaseName(
                    "IX_StockQuotes_Symbol_RecordedAtUtc");

            entity.HasIndex(stockQuote => new
            {
                stockQuote.Symbol,
                stockQuote.MarketTimestampUtc
            })
                .HasDatabaseName(
                    "IX_StockQuotes_Symbol_MarketTimestampUtc");
        });

        modelBuilder.Entity<GtaEvent>(entity =>
        {
            entity.Property(gtaEvent => gtaEvent.Slug)
                .HasMaxLength(180)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Title)
                .HasMaxLength(240)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Summary)
                .HasMaxLength(1_000)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Description)
                .HasMaxLength(2_000)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Category)
                .HasConversion<string>()
                .HasMaxLength(40)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Subcategory)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Priority)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.SourceType)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.SourceName)
                .HasMaxLength(160)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.SourceUrl)
                .HasMaxLength(2_048)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.DatePrecision)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(gtaEvent => gtaEvent.Status)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.HasIndex(gtaEvent => gtaEvent.Slug)
                .IsUnique()
                .HasDatabaseName(
                    "UX_GtaEvents_Slug");

            entity.HasIndex(gtaEvent =>
                    gtaEvent.OccurredAtUtc)
                .HasDatabaseName(
                    "IX_GtaEvents_OccurredAtUtc");

            entity.HasIndex(gtaEvent => new
            {
                gtaEvent.Status,
                gtaEvent.OccurredAtUtc
            })
                .HasDatabaseName(
                    "IX_GtaEvents_Status_OccurredAtUtc");
        });
    }
}
