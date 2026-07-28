using System.ComponentModel.DataAnnotations;

namespace VIImpact.API.Contracts.GtaEvents;

/// <summary>
/// Represents the information required to create a GTA VI event.
/// </summary>
public sealed class CreateGtaEventRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [Url]
    [MaxLength(2000)]
    public string SourceUrl { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }
}