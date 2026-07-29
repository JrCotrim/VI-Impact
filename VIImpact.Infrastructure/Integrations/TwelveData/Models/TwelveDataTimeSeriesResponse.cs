using System.Text.Json.Serialization;

namespace VIImpact.Infrastructure.Integrations.TwelveData.Models;

/// <summary>
/// Represents the historical time-series response returned by Twelve Data.
/// </summary>
internal sealed class TwelveDataTimeSeriesResponse
{
    [JsonPropertyName("meta")]
    public TwelveDataTimeSeriesMeta? Meta { get; set; }

    [JsonPropertyName("values")]
    public List<TwelveDataTimeSeriesValue>? Values { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public int? Code { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Represents the metadata returned with a Twelve Data time series.
/// </summary>
internal sealed class TwelveDataTimeSeriesMeta
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("interval")]
    public string Interval { get; set; } = string.Empty;

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;

    [JsonPropertyName("exchange")]
    public string Exchange { get; set; } = string.Empty;

    [JsonPropertyName("exchange_timezone")]
    public string ExchangeTimezone { get; set; } = string.Empty;
}

/// <summary>
/// Represents one historical price point returned by Twelve Data.
/// </summary>
internal sealed class TwelveDataTimeSeriesValue
{
    [JsonPropertyName("datetime")]
    public string DateTimeText { get; set; } = string.Empty;

    [JsonPropertyName("open")]
    public string Open { get; set; } = string.Empty;

    [JsonPropertyName("high")]
    public string High { get; set; } = string.Empty;

    [JsonPropertyName("low")]
    public string Low { get; set; } = string.Empty;

    [JsonPropertyName("close")]
    public string Close { get; set; } = string.Empty;

    [JsonPropertyName("volume")]
    public string Volume { get; set; } = string.Empty;
}   