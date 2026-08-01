namespace VIImpact.Infrastructure.Configuration;

public sealed class TwelveDataOptions
{
    public const string SectionName = "TwelveData";

    public string ApiKey { get; set; } = string.Empty;

    public string BaseUrl { get; set; } =
        "https://api.twelvedata.com";

    public int RequestTimeoutSeconds { get; set; } = 10;

    public int MaxRetryAttempts { get; set; } = 2;

    public int RetryBaseDelayMilliseconds { get; set; } = 400;

    public int MaximumRetryDelaySeconds { get; set; } = 5;

    public int CircuitBreakerFailureThreshold { get; set; } = 3;

    public int CircuitBreakerDurationSeconds { get; set; } = 30;
}