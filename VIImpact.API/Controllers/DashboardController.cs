using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Contracts.Dashboard;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.API.Controllers;

/// <summary>
/// Provides the information required by the VI Impact dashboard.
/// </summary>
[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController : ControllerBase
{
    private readonly IStockQuoteRepository _stockQuoteRepository;
    private readonly IGtaEventRepository _gtaEventRepository;

    public DashboardController(
        IStockQuoteRepository stockQuoteRepository,
        IGtaEventRepository gtaEventRepository)
    {
        _stockQuoteRepository = stockQuoteRepository;
        _gtaEventRepository = gtaEventRepository;
    }

    /// <summary>
    /// Retrieves stock history and optionally includes GTA VI events.
    /// </summary>
    [HttpGet("{symbol}")]
    public async Task<ActionResult<DashboardResponse>> GetDashboard(
        string symbol,
        [FromQuery] bool includeGtaEvents = true,
        [FromQuery] int limit = 500,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest(new
            {
                Message = "The stock symbol is required."
            });
        }

        if (limit is < 1 or > 2000)
        {
            return BadRequest(new
            {
                Message = "The limit must be between 1 and 2000."
            });
        }

        string normalizedSymbol =
            symbol.Trim().ToUpperInvariant();

        IReadOnlyList<StockQuote> quotes =
            await _stockQuoteRepository.GetHistoryAsync(
                normalizedSymbol,
                limit,
                cancellationToken);

        IReadOnlyList<GtaEvent> gtaEvents =
            includeGtaEvents
                ? await _gtaEventRepository.GetAllAsync(
                    cancellationToken)
                : Array.Empty<GtaEvent>();

        var response = new DashboardResponse
        {
            Symbol = normalizedSymbol,

            Quotes = quotes
                .OrderBy(quote => quote.RecordedAtUtc)
                .Select(quote => new StockQuotePointResponse
                {
                    Price = quote.Price,
                    ChangePercent = quote.ChangePercent,
                    Volume = quote.Volume,
                    RecordedAtUtc = quote.RecordedAtUtc,
                    MarketTimestampUtc =
                        quote.MarketTimestampUtc
                })
                .ToList(),

            GtaEvents = gtaEvents
                .OrderBy(gtaEvent => gtaEvent.OccurredAtUtc)
                .Select(gtaEvent => new GtaEventMarkerResponse
                {
                    Id = gtaEvent.Id,
                    Title = gtaEvent.Title,
                    Description = gtaEvent.Description,
                    SourceUrl = gtaEvent.SourceUrl,
                    OccurredAtUtc = gtaEvent.OccurredAtUtc
                })
                .ToList()
        };

        return Ok(response);
    }
}