using System.Text.Json.Serialization;

namespace VIImpact.Infrastructure.Integrations.TwelveData.Models;

internal sealed class TwelveDataQuoteResponse
{
    [JsonPropertyName("symbol")]
    public string Symbol { get; set; } = string.Empty;

    [JsonPropertyName("close")]
    public string Close { get; set; } = string.Empty;

    [JsonPropertyName("percent_change")]
    public string PercentChange { get; set; } = string.Empty;

    [JsonPropertyName("volume")]
    public string Volume { get; set; } = string.Empty;

    [JsonPropertyName("datetime")]
    public string DateTimeText { get; set; } = string.Empty;

    [JsonPropertyName("timestamp")]
    public long Timestamp { get; set; }
}