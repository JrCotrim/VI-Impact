using Microsoft.AspNetCore.Mvc;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.API.Controllers;

/// <summary>
/// Provides endpoints for retrieving stock-market information.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class StocksController : ControllerBase
{
    private readonly IStockMarketService _stockMarketService;
    private readonly IStockQuoteRepository _stockQuoteRepository;

    public StocksController(
        IStockMarketService stockMarketService,
        IStockQuoteRepository stockQuoteRepository)
    {
        _stockMarketService = stockMarketService;
        _stockQuoteRepository = stockQuoteRepository;
    }

    /// <summary>
    /// Retrieves the latest quote directly from the market-data provider.
    /// </summary>
    [HttpGet("{symbol}")]
    public async Task<ActionResult<StockQuote>> GetLatestQuote(
        string symbol,
        CancellationToken cancellationToken)
    {
        StockQuote quote =
            await _stockMarketService.GetLatestQuoteAsync(
                symbol,
                cancellationToken);

        return Ok(quote);
    }

    /// <summary>
    /// Retrieves the stored quote history for a stock symbol.
    /// </summary>
    [HttpGet("{symbol}/history")]
    public async Task<ActionResult<IReadOnlyList<StockQuote>>> GetHistory(
        string symbol,
        [FromQuery] int limit = 100,
        CancellationToken cancellationToken = default)
    {
        if (limit is < 1 or > 500)
        {
            return BadRequest(new
            {
                Message = "The limit must be between 1 and 500."
            });
        }

        IReadOnlyList<StockQuote> quotes =
            await _stockQuoteRepository.GetHistoryAsync(
                symbol,
                limit,
                cancellationToken);

        return Ok(quotes);
    }
}