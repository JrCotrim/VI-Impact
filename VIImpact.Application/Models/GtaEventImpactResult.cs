namespace VIImpact.Application.Models;

/// <summary>
/// Represents the calculated stock-market impact of a GTA VI event.
/// </summary>
public sealed class GtaEventImpactResult
{
    public Guid EventId { get; set; }

    public string EventTitle { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }

    public decimal? PriceBefore { get; set; }

    public DateTime? PriceBeforeRecordedAtUtc { get; set; }

    public decimal? PriceAfter { get; set; }

    public DateTime? PriceAfterRecordedAtUtc { get; set; }

    public decimal? PriceChange { get; set; }

    public decimal? PriceChangePercent { get; set; }
}