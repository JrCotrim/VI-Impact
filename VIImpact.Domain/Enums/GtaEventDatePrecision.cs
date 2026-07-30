namespace VIImpact.Domain.Enums;

/// <summary>
/// Defines how precisely the event date is known.
/// </summary>
public enum GtaEventDatePrecision
{
    ExactTime = 1,
    DateOnly = 2,
    DateRange = 3
}