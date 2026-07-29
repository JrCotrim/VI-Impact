namespace VIImpact.Application.Models;

/// <summary>
/// Represents a historical stock-market price point.
/// </summary>
public sealed class StockTimeSeriesPoint
{
    public DateTime DateTime { get; set; }

    public decimal Open { get; set; }

    public decimal High { get; set; }

    public decimal Low { get; set; }

    public decimal Close { get; set; }

    public long Volume { get; set; }
}