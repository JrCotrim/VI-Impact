namespace VIImpact.Application.Models;

/// <summary>
/// Represents a historical stock-market time series.
/// </summary>
public sealed class StockTimeSeries
{
    public string Symbol { get; set; } = string.Empty;

    public string Interval { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    public string Exchange { get; set; } = string.Empty;

    public string ExchangeTimezone { get; set; } = string.Empty;

    public IReadOnlyList<StockTimeSeriesPoint> Values { get; set; } =
        Array.Empty<StockTimeSeriesPoint>();
}