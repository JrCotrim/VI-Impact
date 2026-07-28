namespace VIImpact.Domain.Entities;

public class GtaEvent
{
    public Guid Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string SourceUrl { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }
}