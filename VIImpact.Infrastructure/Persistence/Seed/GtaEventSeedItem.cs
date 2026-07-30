using VIImpact.Domain.Enums;

namespace VIImpact.Infrastructure.Persistence.Seed;

/// <summary>
/// Represents one GTA VI event loaded from the embedded seed catalog.
/// </summary>
internal sealed class GtaEventSeedItem
{
    public string Slug { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public GtaEventCategory Category { get; set; }

    public string Subcategory { get; set; } = string.Empty;

    public GtaEventPriority Priority { get; set; }

    public GtaEventSourceType SourceType { get; set; }

    public string SourceName { get; set; } = string.Empty;

    public string SourceUrl { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }

    public DateTime? OccurredUntilUtc { get; set; }

    public DateTime? PublishedAtUtc { get; set; }

    public GtaEventDatePrecision DatePrecision { get; set; }

    public GtaEventStatus Status { get; set; }

    public bool IsOfficial { get; set; }

    public bool IsImpactAnalysisEligible { get; set; }
}