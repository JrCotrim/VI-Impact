namespace VIImpact.API.Contracts.Stocks;

/// <summary>
/// Represents a historical stock-market time series returned by the API.
/// </summary>
public sealed class StockTimeSeriesResponse
{
    public string Symbol { get; set; } = string.Empty;

    public string Interval { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    public string Exchange { get; set; } = string.Empty;

    public string ExchangeTimezone { get; set; } = string.Empty;

    public IReadOnlyList<StockTimeSeriesPointResponse> Values { get; set; } =
        Array.Empty<StockTimeSeriesPointResponse>();

    public IReadOnlyList<StockPeriodPerformanceResponse> Performances { get; set; } =
        Array.Empty<StockPeriodPerformanceResponse>();
}

/// <summary>
/// Represents one historical stock-market price point returned by the API.
/// </summary>
public sealed class StockTimeSeriesPointResponse
{
    public DateTime DateTimeUtc { get; set; }

    public decimal Open { get; set; }

    public decimal High { get; set; }

    public decimal Low { get; set; }

    public decimal Close { get; set; }

    public long Volume { get; set; }
}

/// <summary>
/// Represents the stock performance for a predefined period.
/// </summary>
public sealed class StockPeriodPerformanceResponse
{
    public string Period { get; set; } = string.Empty;

    public decimal? ChangePercent { get; set; }
}