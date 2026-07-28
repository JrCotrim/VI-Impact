namespace VIImpact.Infrastructure.Configuration;

public class TwelveDataOptions
{
    public const string SectionName = "TwelveData";

    public string ApiKey { get; set; } = string.Empty;

    public string BaseUrl { get; set; } = "https://api.twelvedata.com";
}