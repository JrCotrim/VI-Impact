using VIImpact.API.Configuration;
using VIImpact.Infrastructure.Configuration;

namespace VIImpact.Tests.Configuration;

/// <summary>
/// Verifies fail-fast validation for deployment-facing API settings.
/// </summary>
public sealed class RuntimeConfigurationValidatorTests
{
    [Fact]
    public void GetAllowedOrigins_DevelopmentWithoutConfiguration_AddsLocalViteOrigin()
    {
        string[] origins =
            RuntimeConfigurationValidator.GetAllowedOrigins(
                configuredOrigins: null,
                isDevelopment: true,
                isProduction: false);

        Assert.Equal(
            ["http://localhost:5173"],
            origins);
    }

    [Fact]
    public void GetAllowedOrigins_ProductionWithoutConfiguration_Throws()
    {
        InvalidOperationException exception =
            Assert.Throws<InvalidOperationException>(
                () =>
                    RuntimeConfigurationValidator.GetAllowedOrigins(
                        configuredOrigins: null,
                        isDevelopment: false,
                        isProduction: true));

        Assert.Equal(
            "CORS configuration is invalid.",
            exception.Message);
    }

    [Fact]
    public void GetAllowedOrigins_ProductionWithHttpOrigin_Throws()
    {
        InvalidOperationException exception =
            Assert.Throws<InvalidOperationException>(
                () =>
                    RuntimeConfigurationValidator.GetAllowedOrigins(
                        "http://vi-impact.vercel.app",
                        isDevelopment: false,
                        isProduction: true));

        Assert.Equal(
            "CORS configuration is invalid.",
            exception.Message);
    }

    [Fact]
    public void GetAllowedOrigins_WithDuplicates_NormalizesAndDeduplicates()
    {
        string[] origins =
            RuntimeConfigurationValidator.GetAllowedOrigins(
                "https://vi-impact.vercel.app/, "
                + "https://VI-IMPACT.VERCEL.APP",
                isDevelopment: false,
                isProduction: true);

        Assert.Single(origins);
        Assert.Equal(
            "https://vi-impact.vercel.app",
            origins[0],
            ignoreCase: true);
    }

    [Theory]
    [InlineData("https://vi-impact.vercel.app/events")]
    [InlineData("https://vi-impact.vercel.app/?preview=true")]
    [InlineData("https://user:password@vi-impact.vercel.app")]
    [InlineData("ftp://vi-impact.vercel.app")]
    public void GetAllowedOrigins_WithInvalidOrigin_Throws(
        string origin)
    {
        Assert.Throws<InvalidOperationException>(
            () =>
                RuntimeConfigurationValidator.GetAllowedOrigins(
                    origin,
                    isDevelopment: false,
                    isProduction: true));
    }


    [Fact]
    public void GetRequiredConnectionString_WithConfiguredValue_ReturnsValue()
    {
        const string connectionString =
            "Host=localhost;Database=VIImpactDb";

        string result =
            RuntimeConfigurationValidator.GetRequiredConnectionString(
                connectionString);

        Assert.Equal(
            connectionString,
            result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void GetRequiredConnectionString_WithMissingValue_Throws(
        string? connectionString)
    {
        InvalidOperationException exception =
            Assert.Throws<InvalidOperationException>(
                () =>
                    RuntimeConfigurationValidator
                        .GetRequiredConnectionString(
                            connectionString));

        Assert.Equal(
            "The database connection string was not configured.",
            exception.Message);
    }

    [Fact]
    public void ValidateStockCollectionOptions_WithValidConfiguration_DoesNotThrow()
    {
        var options =
            new StockCollectionOptions
            {
                Enabled = true,
                Symbol = "TTWO",
                IntervalMinutes = 5
            };

        RuntimeConfigurationValidator.ValidateStockCollectionOptions(
            options);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(" TTWO")]
    [InlineData("TTWO ")]
    public void ValidateStockCollectionOptions_WithInvalidSymbol_Throws(
        string symbol)
    {
        var options =
            new StockCollectionOptions
            {
                Enabled = true,
                Symbol = symbol,
                IntervalMinutes = 5
            };

        AssertInvalidStockCollectionOptions(
            options);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void ValidateStockCollectionOptions_WithInvalidInterval_Throws(
        int intervalMinutes)
    {
        var options =
            new StockCollectionOptions
            {
                Enabled = true,
                Symbol = "TTWO",
                IntervalMinutes = intervalMinutes
            };

        AssertInvalidStockCollectionOptions(
            options);
    }

    [Fact]
    public void ValidateTwelveDataOptions_WithValidConfiguration_DoesNotThrow()
    {
        TwelveDataOptions options =
            CreateValidOptions();

        RuntimeConfigurationValidator.ValidateTwelveDataOptions(
            options,
            isProduction: true);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(" api-key")]
    [InlineData("api-key ")]
    public void ValidateTwelveDataOptions_WithInvalidApiKey_Throws(
        string apiKey)
    {
        TwelveDataOptions options =
            CreateValidOptions();

        options.ApiKey = apiKey;

        AssertInvalidTwelveDataOptions(
            options,
            isProduction: true);
    }

    [Theory]
    [InlineData("not-a-url", false)]
    [InlineData("ftp://api.twelvedata.com", false)]
    [InlineData("https://user:pass@api.twelvedata.com", false)]
    [InlineData("https://api.twelvedata.com/v1", false)]
    [InlineData("https://api.twelvedata.com?test=true", false)]
    [InlineData("https://api.twelvedata.com#fragment", false)]
    [InlineData("http://api.twelvedata.com", true)]
    public void ValidateTwelveDataOptions_WithInvalidBaseUrl_Throws(
        string baseUrl,
        bool isProduction)
    {
        TwelveDataOptions options =
            CreateValidOptions();

        options.BaseUrl = baseUrl;

        AssertInvalidTwelveDataOptions(
            options,
            isProduction);
    }

    [Theory]
    [InlineData(nameof(TwelveDataOptions.RequestTimeoutSeconds), 0)]
    [InlineData(nameof(TwelveDataOptions.RequestTimeoutSeconds), 121)]
    [InlineData(nameof(TwelveDataOptions.MaxRetryAttempts), -1)]
    [InlineData(nameof(TwelveDataOptions.MaxRetryAttempts), 6)]
    [InlineData(nameof(TwelveDataOptions.RetryBaseDelayMilliseconds), -1)]
    [InlineData(nameof(TwelveDataOptions.RetryBaseDelayMilliseconds), 10_001)]
    [InlineData(nameof(TwelveDataOptions.MaximumRetryDelaySeconds), 0)]
    [InlineData(nameof(TwelveDataOptions.MaximumRetryDelaySeconds), 61)]
    [InlineData(nameof(TwelveDataOptions.CircuitBreakerFailureThreshold), 0)]
    [InlineData(nameof(TwelveDataOptions.CircuitBreakerFailureThreshold), 21)]
    [InlineData(nameof(TwelveDataOptions.CircuitBreakerDurationSeconds), 0)]
    [InlineData(nameof(TwelveDataOptions.CircuitBreakerDurationSeconds), 301)]
    public void ValidateTwelveDataOptions_WithOutOfRangeResilienceSetting_Throws(
        string propertyName,
        int value)
    {
        TwelveDataOptions options =
            CreateValidOptions();

        typeof(TwelveDataOptions)
            .GetProperty(propertyName)!
            .SetValue(
                options,
                value);

        AssertInvalidTwelveDataOptions(
            options,
            isProduction: true);
    }

    [Fact]
    public void ValidateTwelveDataOptions_WhenBaseRetryDelayExceedsMaximum_Throws()
    {
        TwelveDataOptions options =
            CreateValidOptions();

        options.RetryBaseDelayMilliseconds = 5_001;
        options.MaximumRetryDelaySeconds = 5;

        AssertInvalidTwelveDataOptions(
            options,
            isProduction: true);
    }

    [Fact]
    public void ValidateTwelveDataOptions_DevelopmentAllowsHttpProviderUrl()
    {
        TwelveDataOptions options =
            CreateValidOptions();

        options.BaseUrl =
            "http://localhost:9999";

        RuntimeConfigurationValidator.ValidateTwelveDataOptions(
            options,
            isProduction: false);
    }


    private static void AssertInvalidStockCollectionOptions(
        StockCollectionOptions options)
    {
        InvalidOperationException exception =
            Assert.Throws<InvalidOperationException>(
                () =>
                    RuntimeConfigurationValidator
                        .ValidateStockCollectionOptions(
                            options));

        Assert.Equal(
            "Stock collection configuration is invalid.",
            exception.Message);
    }

    private static TwelveDataOptions CreateValidOptions()
    {
        return new TwelveDataOptions
        {
            ApiKey = "test-api-key",
            BaseUrl = "https://api.twelvedata.com",
            RequestTimeoutSeconds = 10,
            MaxRetryAttempts = 2,
            RetryBaseDelayMilliseconds = 400,
            MaximumRetryDelaySeconds = 5,
            CircuitBreakerFailureThreshold = 3,
            CircuitBreakerDurationSeconds = 30
        };
    }

    private static void AssertInvalidTwelveDataOptions(
        TwelveDataOptions options,
        bool isProduction)
    {
        InvalidOperationException exception =
            Assert.Throws<InvalidOperationException>(
                () =>
                    RuntimeConfigurationValidator
                        .ValidateTwelveDataOptions(
                            options,
                            isProduction));

        Assert.Equal(
            "Twelve Data configuration is invalid.",
            exception.Message);
    }
}
