namespace VIImpact.API.Contracts.Dashboard;

/// <summary>
/// Represents the stock quotes and GTA VI events displayed
/// in the VI Impact dashboard.
/// </summary>
public sealed class DashboardResponse
{
    public string Symbol { get; set; } = string.Empty;

    public IReadOnlyList<StockQuotePointResponse> Quotes { get; set; } =
        Array.Empty<StockQuotePointResponse>();

    public IReadOnlyList<GtaEventMarkerResponse> GtaEvents { get; set; } =
        Array.Empty<GtaEventMarkerResponse>();
}