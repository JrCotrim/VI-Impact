namespace VIImpact.API.Security;

/// <summary>
/// Defines the stock symbols that the public VI Impact HTTP API may accept.
/// This bounds market-data provider usage to assets required by the product.
/// </summary>
public static class PublicMarketSymbolPolicy
{
    public const string SupportedSymbolsDisplay = "TTWO, QQQ";

    private static readonly HashSet<string> SupportedSymbols =
        new(StringComparer.Ordinal)
        {
            "TTWO",
            "QQQ"
        };

    public static bool TryNormalize(
        string? symbol,
        out string normalizedSymbol)
    {
        normalizedSymbol =
            symbol?.Trim().ToUpperInvariant() ?? string.Empty;

        return SupportedSymbols.Contains(normalizedSymbol);
    }
}
