using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData.Models;

namespace VIImpact.Infrastructure.Integrations.TwelveData;

public sealed class TwelveDataStockMarketService : IStockMarketService
{
    private readonly HttpClient _httpClient;
    private readonly TwelveDataOptions _options;

    public TwelveDataStockMarketService(
        HttpClient httpClient,
        TwelveDataOptions options)
    {
        _httpClient = httpClient;
        _options = options;
    }

    public async Task<StockQuote> GetLatestQuoteAsync(
        string symbol,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            throw new ArgumentException(
                "The stock symbol is required.",
                nameof(symbol));
        }

        if (string.IsNullOrWhiteSpace(_options.ApiKey))
        {
            throw new InvalidOperationException(
                "The Twelve Data API key was not configured.");
        }

        string endpoint = $"/quote?symbol={Uri.EscapeDataString(symbol)}";

        using var request = new HttpRequestMessage(HttpMethod.Get, endpoint);

        request.Headers.Authorization =
            new AuthenticationHeaderValue("apikey", _options.ApiKey);

        using HttpResponseMessage response =
            await _httpClient.SendAsync(request, cancellationToken);

        response.EnsureSuccessStatusCode();

        TwelveDataQuoteResponse quote =
            await response.Content.ReadFromJsonAsync<TwelveDataQuoteResponse>(
                cancellationToken: cancellationToken)
            ?? throw new InvalidOperationException(
                "Twelve Data returned an empty response.");

        if (!decimal.TryParse(
                quote.Close,
                NumberStyles.Any,
                CultureInfo.InvariantCulture,
                out decimal price))
        {
            throw new InvalidOperationException(
                "The stock price returned by Twelve Data is invalid.");
        }

        decimal.TryParse(
            quote.PercentChange,
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out decimal changePercent);

        long.TryParse(
            quote.Volume,
            NumberStyles.Any,
            CultureInfo.InvariantCulture,
            out long volume);

        DateTime recordedAtUtc = quote.Timestamp > 0
            ? DateTimeOffset.FromUnixTimeSeconds(quote.Timestamp).UtcDateTime
            : DateTime.UtcNow;

        return new StockQuote
        {
            Id = Guid.NewGuid(),
            Symbol = quote.Symbol,
            Price = price,
            ChangePercent = changePercent,
            Volume = volume,
            RecordedAtUtc = recordedAtUtc
        };
    }
}