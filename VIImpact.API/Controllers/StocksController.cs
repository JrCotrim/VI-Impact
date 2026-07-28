using Microsoft.AspNetCore.Mvc;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class StocksController : ControllerBase
{
    private readonly IStockMarketService _stockMarketService;

    public StocksController(IStockMarketService stockMarketService)
    {
        _stockMarketService = stockMarketService;
    }

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
}