using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData.Models;

namespace VIImpact.Infrastructure.Integrations.TwelveData;

/// <summary>
/// Retrieves stock quotes from the Twelve Data API.
/// </summary>
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

    /// <summary>
    /// Retrieves the latest quote for a stock symbol.
    /// </summary>
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

        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        string endpoint =
            $"/quote?symbol={Uri.EscapeDataString(normalizedSymbol)}";

        using var request =
            new HttpRequestMessage(HttpMethod.Get, endpoint);

        request.Headers.Authorization =
            new AuthenticationHeaderValue(
                "apikey",
                _options.ApiKey);

        using HttpResponseMessage response =
            await _httpClient.SendAsync(
                request,
                cancellationToken);

        response.EnsureSuccessStatusCode();

        TwelveDataQuoteResponse quote =
            await response.Content
                .ReadFromJsonAsync<TwelveDataQuoteResponse>(
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

        long marketTimestamp =
            quote.LastQuoteAt > 0
                ? quote.LastQuoteAt
                : quote.Timestamp;

        DateTime? marketTimestampUtc =
            marketTimestamp > 0
                ? DateTimeOffset
                    .FromUnixTimeSeconds(marketTimestamp)
                    .UtcDateTime
                : null;

        return new StockQuote
        {
            Id = Guid.NewGuid(),
            Symbol = string.IsNullOrWhiteSpace(quote.Symbol)
                ? normalizedSymbol
                : quote.Symbol.Trim().ToUpperInvariant(),
            Price = price,
            ChangePercent = changePercent,
            Volume = volume,

            // Horário em que o VI Impact coletou o dado.
            RecordedAtUtc = DateTime.UtcNow,

            // Horário informado pela fonte de mercado.
            MarketTimestampUtc = marketTimestampUtc
        };
    }
}