namespace VIImpact.Domain.Enums;

/// <summary>
/// Defines the origin of the information associated with an event.
/// </summary>
public enum GtaEventSourceType
{
    Official = 1,
    Journalism = 2,
    Unofficial = 3,
    Judicial = 4,
    Union = 5,
    Mixed = 6
}