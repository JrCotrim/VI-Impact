using VIImpact.Domain.Enums;

namespace VIImpact.API.Contracts.Dashboard;

/// <summary>
/// Represents a GTA VI event displayed in the dashboard and stock chart.
/// </summary>
public sealed class GtaEventMarkerResponse
{
    public Guid Id { get; set; }

    public string Slug { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Summary { get; set; } = string.Empty;

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
