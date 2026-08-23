using VIImpact.Infrastructure.Configuration;

namespace VIImpact.API.Configuration;

/// <summary>
/// Validates deployment-facing settings before the application starts.
/// </summary>
public static class RuntimeConfigurationValidator
{
    private const string CorsValidationError =
        "CORS configuration is invalid.";

    private const string TwelveDataValidationError =
        "Twelve Data configuration is invalid.";

    private const string StockCollectionValidationError =
        "Stock collection configuration is invalid.";

    private const string DatabaseConfigurationError =
        "The database connection string was not configured.";

    /// <summary>
    /// Builds the exact CORS origin allowlist for the current environment.
    /// Local Vite access is implicit only during Development.
    /// </summary>
    public static string[] GetAllowedOrigins(
        string? configuredOrigins,
        bool isDevelopment,
        bool isProduction)
    {
        IEnumerable<string> candidates =
            (configuredOrigins ?? string.Empty)
            .Split(
                ',',
                StringSplitOptions.RemoveEmptyEntries |
                StringSplitOptions.TrimEntries);

        if (isDevelopment)
        {
            candidates = candidates.Append(
                "http://localhost:5173");
        }

        string[] origins = candidates
            .Select(origin =>
                NormalizeCorsOrigin(
                    origin,
                    requireHttps: isProduction))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (origins.Length == 0)
        {
            throw new InvalidOperationException(
                CorsValidationError);
        }

        return origins;
    }

    /// <summary>
    /// Fails startup when the automatic collector configuration is unusable.
    /// </summary>
    public static void ValidateStockCollectionOptions(
        StockCollectionOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        bool invalidSymbol =
            string.IsNullOrWhiteSpace(options.Symbol) ||
            !string.Equals(
                options.Symbol,
                options.Symbol.Trim(),
                StringComparison.Ordinal);

        bool invalidInterval =
            options.IntervalMinutes < 1;

        if (
            invalidSymbol ||
            invalidInterval)
        {
            throw new InvalidOperationException(
                StockCollectionValidationError);
        }
    }

    /// <summary>
    /// Returns a non-empty database connection string or fails startup.
    /// </summary>
    public static string GetRequiredConnectionString(
        string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                DatabaseConfigurationError);
        }

        return connectionString;
    }

    /// <summary>
    /// Fails startup when the market-provider configuration is unusable.
    /// Provider/network failures remain the responsibility of runtime
    /// resilience.
    /// </summary>
    public static void ValidateTwelveDataOptions(
        TwelveDataOptions options,
        bool isProduction)
    {
        ArgumentNullException.ThrowIfNull(options);

        bool invalidApiKey =
            string.IsNullOrWhiteSpace(options.ApiKey) ||
            !string.Equals(
                options.ApiKey,
                options.ApiKey.Trim(),
                StringComparison.Ordinal);

        bool invalidBaseUrl =
            !Uri.TryCreate(
                options.BaseUrl,
                UriKind.Absolute,
                out Uri? baseUri) ||
            (
                baseUri.Scheme != Uri.UriSchemeHttp &&
                baseUri.Scheme != Uri.UriSchemeHttps) ||
            !string.IsNullOrEmpty(baseUri.UserInfo) ||
            baseUri.AbsolutePath != "/" ||
            !string.IsNullOrEmpty(baseUri.Query) ||
            !string.IsNullOrEmpty(baseUri.Fragment) ||
            (isProduction &&
                baseUri.Scheme != Uri.UriSchemeHttps);

        bool invalidResilienceConfiguration =
            options.RequestTimeoutSeconds is < 1 or > 120 ||
            options.MaxRetryAttempts is < 0 or > 5 ||
            options.RetryBaseDelayMilliseconds is < 0 or > 10_000 ||
            options.MaximumRetryDelaySeconds is < 1 or > 60 ||
            options.CircuitBreakerFailureThreshold is < 1 or > 20 ||
            options.CircuitBreakerDurationSeconds is < 1 or > 300 ||
            options.RetryBaseDelayMilliseconds >
                options.MaximumRetryDelaySeconds * 1_000;

        if (
            invalidApiKey ||
            invalidBaseUrl ||
            invalidResilienceConfiguration)
        {
            throw new InvalidOperationException(
                TwelveDataValidationError);
        }
    }

    private static string NormalizeCorsOrigin(
        string origin,
        bool requireHttps)
    {
        if (
            !Uri.TryCreate(
                origin,
                UriKind.Absolute,
                out Uri? uri) ||
            (
                uri.Scheme != Uri.UriSchemeHttp &&
                uri.Scheme != Uri.UriSchemeHttps) ||
            !string.IsNullOrEmpty(uri.UserInfo) ||
            uri.AbsolutePath != "/" ||
            !string.IsNullOrEmpty(uri.Query) ||
            !string.IsNullOrEmpty(uri.Fragment) ||
            (requireHttps &&
                uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new InvalidOperationException(
                CorsValidationError);
        }

        return uri.GetLeftPart(
            UriPartial.Authority);
    }
}
