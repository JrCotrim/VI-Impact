using VIImpact.API.Security;

namespace VIImpact.Tests.Security;

/// <summary>
/// Protects the bounded public market-data symbol contract.
/// </summary>
public sealed class PublicMarketSymbolPolicyTests
{
    [Theory]
    [InlineData("TTWO", "TTWO")]
    [InlineData("ttwo", "TTWO")]
    [InlineData(" QqQ ", "QQQ")]
    public void TryNormalize_AcceptsSupportedSymbols(
        string input,
        string expected)
    {
        bool accepted =
            PublicMarketSymbolPolicy.TryNormalize(
                input,
                out string normalizedSymbol);

        Assert.True(accepted);
        Assert.Equal(expected, normalizedSymbol);
    }

    [Theory]
    [InlineData("AAPL")]
    [InlineData("NVDA")]
    [InlineData("")]
    [InlineData("   ")]
    public void TryNormalize_RejectsUnsupportedSymbols(
        string input)
    {
        bool accepted =
            PublicMarketSymbolPolicy.TryNormalize(
                input,
                out _);

        Assert.False(accepted);
    }
}
