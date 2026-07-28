namespace VIImpact.API.Contracts.Dashboard;

/// <summary>
/// Represents a stock quote point displayed in the dashboard chart.
/// </summary>
public sealed class StockQuotePointResponse
{
    public decimal Price { get; set; }

    public decimal ChangePercent { get; set; }

    public long Volume { get; set; }

    public DateTime RecordedAtUtc { get; set; }

    public DateTime? MarketTimestampUtc { get; set; }
}