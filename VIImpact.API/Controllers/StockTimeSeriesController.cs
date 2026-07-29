using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Contracts.Stocks;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;

namespace VIImpact.API.Controllers;

/// <summary>
/// Provides historical stock-market time-series data.
/// </summary>
[ApiController]
[Route("api/stocks")]
public sealed class StockTimeSeriesController : ControllerBase
{
    private readonly IStockMarketService _stockMarketService;

    public StockTimeSeriesController(
        IStockMarketService stockMarketService)
    {
        _stockMarketService = stockMarketService;
    }

    /// <summary>
    /// Retrieves historical price data for a stock symbol.
    /// </summary>
    [HttpGet("{symbol}/time-series")]
    [ProducesResponseType<StockTimeSeriesResponse>(
        StatusCodes.Status200OK)]
    [ProducesResponseType(
        StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<StockTimeSeriesResponse>> GetTimeSeries(
        string symbol,
        [FromQuery] string interval = "1day",
        [FromQuery] int outputSize = 365,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest(
                "The stock symbol is required.");
        }

        if (string.IsNullOrWhiteSpace(interval))
        {
            return BadRequest(
                "The interval is required.");
        }

        if (outputSize is < 1 or > 5000)
        {
            return BadRequest(
                "The output size must be between 1 and 5000.");
        }

        StockTimeSeries timeSeries =
            await _stockMarketService.GetTimeSeriesAsync(
                symbol,
                interval,
                outputSize,
                cancellationToken);

        var response = new StockTimeSeriesResponse
        {
            Symbol = timeSeries.Symbol,
            Interval = timeSeries.Interval,
            Currency = timeSeries.Currency,
            Exchange = timeSeries.Exchange,
            ExchangeTimezone =
                timeSeries.ExchangeTimezone,

            Values = timeSeries.Values
                .Select(value =>
                    new StockTimeSeriesPointResponse
                    {
                        DateTimeUtc = value.DateTime,
                        Open = value.Open,
                        High = value.High,
                        Low = value.Low,
                        Close = value.Close,
                        Volume = value.Volume
                    })
                .ToList()
        };

        return Ok(response);
    }
}