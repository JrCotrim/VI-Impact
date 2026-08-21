using VIImpact.Domain.Enums;

namespace VIImpact.Domain.Entities;

/// <summary>
/// Represents a GTA VI-related event tracked by VI Impact.
/// </summary>
public sealed class GtaEvent
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

    /// <summary>
    /// Gets or sets the event start date in UTC.
    /// DatePrecision indicates whether the stored time is exact.
    /// </summary>
    public DateTime OccurredAtUtc { get; set; }

    /// <summary>
    /// Gets or sets the optional end date for events represented by a range.
    /// </summary>
    public DateTime? OccurredUntilUtc { get; set; }

    /// <summary>
    /// Gets or sets the source publication date when it differs from the event date.
    /// </summary>
    public DateTime? PublishedAtUtc { get; set; }

    public GtaEventDatePrecision DatePrecision { get; set; }

    public GtaEventStatus Status { get; set; }

    public bool IsOfficial { get; set; }

    public bool IsImpactAnalysisEligible { get; set; }
}
