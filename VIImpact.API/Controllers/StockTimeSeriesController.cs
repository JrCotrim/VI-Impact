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
    private static readonly string[] SupportedPeriods =
    [
        "1D",
        "7D",
        "1M",
        "3M",
        "6M",
        "YTD",
        "1Y",
        "2Y",
        "5Y",
        "MAX",
        "CUSTOM"
    ];

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
    [ProducesResponseType(
        StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<StockTimeSeriesResponse>> GetTimeSeries(
        string symbol,
        [FromQuery] string period = "1Y",
        [FromQuery] DateOnly? startDate = null,
        [FromQuery] DateOnly? endDate = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest(
                new
                {
                    Message =
                        "The stock symbol is required."
                });
        }

        string normalizedPeriod =
            period.Trim().ToUpperInvariant();

        if (!SupportedPeriods.Contains(normalizedPeriod))
        {
            return BadRequest(
                new
                {
                    Message =
                        $"Unsupported period. Supported periods: {string.Join(", ", SupportedPeriods)}."
                });
        }

        DateTime currentDate =
            DateTime.UtcNow.Date;

        StockTimeSeriesQuery? query =
            CreateTimeSeriesQuery(
                normalizedPeriod,
                currentDate,
                startDate,
                endDate);

        if (query is null)
        {
            return BadRequest(
                new
                {
                    Message =
                        "The custom period requires valid startDate and endDate values."
                });
        }

        try
        {
            StockTimeSeries timeSeries =
                await _stockMarketService.GetTimeSeriesAsync(
                    symbol,
                    query,
                    cancellationToken);

            StockTimeSeriesResponse response =
                CreateResponse(
                    timeSeries,
                    normalizedPeriod,
                    currentDate);

            return Ok(response);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(
                new
                {
                    Message = exception.Message
                });
        }
        catch (InvalidOperationException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new
                {
                    Message = exception.Message
                });
        }
        catch (HttpRequestException exception)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new
                {
                    Message =
                        $"The stock-market provider could not be reached. {exception.Message}"
                });
        }
    }

    private static StockTimeSeriesResponse CreateResponse(
        StockTimeSeries timeSeries,
        string period,
        DateTime currentDate)
    {
        IReadOnlyList<StockTimeSeriesPoint> values =
            FilterValuesForPeriod(
                timeSeries.Values,
                period,
                currentDate);

        return new StockTimeSeriesResponse
        {
            Symbol = timeSeries.Symbol,
            Interval = timeSeries.Interval,
            Currency = timeSeries.Currency,
            Exchange = timeSeries.Exchange,

            ExchangeTimezone =
                timeSeries.ExchangeTimezone,

            Values = values
                .Select(value =>
                    new StockTimeSeriesPointResponse
                    {
                        DateTimeUtc =
                            value.DateTime,

                        Open = value.Open,
                        High = value.High,
                        Low = value.Low,
                        Close = value.Close,
                        Volume = value.Volume
                    })
                .ToList()
        };
    }

    private static IReadOnlyList<StockTimeSeriesPoint>
        FilterValuesForPeriod(
            IReadOnlyList<StockTimeSeriesPoint> values,
            string period,
            DateTime currentDate)
    {
        DateTime? minimumDate =
            period switch
            {
                "1M" =>
                    currentDate.AddMonths(-1),

                "3M" =>
                    currentDate.AddMonths(-3),

                "6M" =>
                    currentDate.AddMonths(-6),

                "YTD" =>
                    new DateTime(
                        currentDate.Year,
                        1,
                        1),

                "1Y" =>
                    currentDate.AddYears(-1),

                "2Y" =>
                    currentDate.AddYears(-2),

                "5Y" =>
                    currentDate.AddYears(-5),

                _ => null
            };

        if (!minimumDate.HasValue)
        {
            return values;
        }

        return values
            .Where(value =>
                value.DateTime >= minimumDate.Value)
            .ToList();
    }

    private static StockTimeSeriesQuery? CreateTimeSeriesQuery(
        string period,
        DateTime currentDate,
        DateOnly? startDate,
        DateOnly? endDate)
    {
        return period switch
        {
            "1D" => new StockTimeSeriesQuery
            {
                Interval = "5min",
                OutputSize = 78
            },

            "7D" => new StockTimeSeriesQuery
            {
                Interval = "30min",
                StartDate =
                    currentDate.AddDays(-7),

                EndDate = currentDate
            },

            "1M" or
            "3M" or
            "6M" or
            "YTD" or
            "1Y" or
            "2Y" or
            "5Y" =>
                CreateFiveYearQuery(
                    currentDate),

            "MAX" => new StockTimeSeriesQuery
            {
                Interval = "1week",

                StartDate =
                    new DateTime(1970, 1, 1),

                EndDate = currentDate
            },

            "CUSTOM" =>
                CreateCustomQuery(
                    startDate,
                    endDate),

            _ => null
        };
    }

    private static StockTimeSeriesQuery CreateFiveYearQuery(
        DateTime currentDate)
    {
        return new StockTimeSeriesQuery
        {
            Interval = "1day",

            StartDate =
                currentDate.AddYears(-5),

            EndDate = currentDate
        };
    }

    private static StockTimeSeriesQuery? CreateCustomQuery(
        DateOnly? startDate,
        DateOnly? endDate)
    {
        if (
            !startDate.HasValue ||
            !endDate.HasValue ||
            startDate.Value > endDate.Value)
        {
            return null;
        }

        DateTime start =
            startDate.Value.ToDateTime(
                TimeOnly.MinValue);

        DateTime end =
            endDate.Value.ToDateTime(
                TimeOnly.MinValue);

        int rangeInDays =
            endDate.Value.DayNumber -
            startDate.Value.DayNumber;

        string interval =
            rangeInDays switch
            {
                <= 2 => "5min",
                <= 14 => "30min",
                <= 730 => "1day",
                _ => "1week"
            };

        return new StockTimeSeriesQuery
        {
            Interval = interval,
            StartDate = start,
            EndDate = end
        };
    }
}