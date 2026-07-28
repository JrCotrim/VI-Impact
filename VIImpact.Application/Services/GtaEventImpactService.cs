using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Domain.Entities;

namespace VIImpact.Application.Services;

/// <summary>
/// Calculates the stock-market movement associated with GTA VI events.
/// </summary>
public sealed class GtaEventImpactService : IGtaEventImpactService
{
    private readonly IGtaEventRepository _gtaEventRepository;
    private readonly IStockQuoteRepository _stockQuoteRepository;

    public GtaEventImpactService(
        IGtaEventRepository gtaEventRepository,
        IStockQuoteRepository stockQuoteRepository)
    {
        _gtaEventRepository = gtaEventRepository;
        _stockQuoteRepository = stockQuoteRepository;
    }

    /// <summary>
    /// Calculates the nearest stock prices before and after an event
    /// and determines the resulting price movement.
    /// </summary>
    public async Task<GtaEventImpactResult?> CalculateAsync(
        Guid eventId,
        string symbol,
        CancellationToken cancellationToken = default)
    {
        GtaEvent? gtaEvent =
            await _gtaEventRepository.GetByIdAsync(
                eventId,
                cancellationToken);

        if (gtaEvent is null)
        {
            return null;
        }

        StockQuote? quoteBefore =
            await _stockQuoteRepository.GetNearestBeforeAsync(
                symbol,
                gtaEvent.OccurredAtUtc,
                cancellationToken);

        StockQuote? quoteAfter =
            await _stockQuoteRepository.GetNearestAfterAsync(
                symbol,
                gtaEvent.OccurredAtUtc,
                cancellationToken);

        decimal? priceChange = null;
        decimal? priceChangePercent = null;

        if (quoteBefore is not null && quoteAfter is not null)
        {
            priceChange =
                quoteAfter.Price - quoteBefore.Price;

            if (quoteBefore.Price != 0)
            {
                priceChangePercent =
                    priceChange.Value
                    / quoteBefore.Price
                    * 100;
            }
        }

        return new GtaEventImpactResult
        {
            EventId = gtaEvent.Id,
            EventTitle = gtaEvent.Title,
            OccurredAtUtc = gtaEvent.OccurredAtUtc,

            PriceBefore = quoteBefore?.Price,
            PriceBeforeRecordedAtUtc =
                quoteBefore?.RecordedAtUtc,

            PriceAfter = quoteAfter?.Price,
            PriceAfterRecordedAtUtc =
                quoteAfter?.RecordedAtUtc,

            PriceChange = priceChange,
            PriceChangePercent = priceChangePercent
        };
    }
}