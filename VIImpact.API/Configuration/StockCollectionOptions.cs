namespace VIImpact.API.Configuration;

/// <summary>
/// Defines the settings used by the automatic stock quote collector.
/// </summary>
public sealed class StockCollectionOptions
{
    public const string SectionName = "StockCollection";

    public bool Enabled { get; set; } = true;

    public string Symbol { get; set; } = "TTWO";

    public int IntervalMinutes { get; set; } = 5;
}