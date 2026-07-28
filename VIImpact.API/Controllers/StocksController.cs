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
    /// Retrieves the latest quote for a stock symbol and stores it
    /// in the database.
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

        await _stockQuoteRepository.AddAsync(
            quote,
            cancellationToken);

        return Ok(quote);
    }
}