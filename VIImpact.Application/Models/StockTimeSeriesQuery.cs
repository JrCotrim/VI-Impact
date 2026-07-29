namespace VIImpact.Application.Models;

/// <summary>
/// Defines the parameters used to retrieve a stock-market time series.
/// </summary>
public sealed class StockTimeSeriesQuery
{
    public string Interval { get; init; } = "1day";

    public int? OutputSize { get; init; }

    public DateTime? StartDate { get; init; }

    public DateTime? EndDate { get; init; }
}