namespace VIImpact.API.Contracts.Dashboard;

/// <summary>
/// Represents a GTA VI event marker displayed in the stock chart.
/// </summary>
public sealed class GtaEventMarkerResponse
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string SourceUrl { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }
}