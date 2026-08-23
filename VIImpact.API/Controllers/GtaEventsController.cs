using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Contracts.GtaEvents;
using VIImpact.API.Security;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Domain.Entities;

namespace VIImpact.API.Controllers;

/// <summary>
/// Provides endpoints for retrieving and analyzing GTA VI events.
/// </summary>
[ApiController]
[Route("api/gtaevents")]
public sealed class GtaEventsController : ControllerBase
{
    private readonly IGtaEventRepository _gtaEventRepository;
    private readonly IGtaEventImpactService _gtaEventImpactService;

    public GtaEventsController(
        IGtaEventRepository gtaEventRepository,
        IGtaEventImpactService gtaEventImpactService)
    {
        _gtaEventRepository = gtaEventRepository;
        _gtaEventImpactService = gtaEventImpactService;
    }

    /// <summary>
    /// Retrieves all stored GTA VI events.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<GtaEvent>>> GetAll(
        CancellationToken cancellationToken)
    {
        IReadOnlyList<GtaEvent> events =
            await _gtaEventRepository.GetAllAsync(
                cancellationToken);

        return Ok(events);
    }

    /// <summary>
    /// Calculates the market reaction for all eligible occurred
    /// GTA VI events using shared historical market series.
    /// </summary>
    [HttpGet("impact-ranking")]
    public async Task<ActionResult<IReadOnlyList<GtaEventImpactResponse>>>
        GetImpactRanking(
            [FromQuery] string symbol = "TTWO",
            [FromQuery] string benchmarkSymbol = "QQQ",
            CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest(new
            {
                Message = "The stock symbol is required."
            });
        }

        if (string.IsNullOrWhiteSpace(benchmarkSymbol))
        {
            return BadRequest(new
            {
                Message = "The benchmark symbol is required."
            });
        }

        if (!PublicMarketSymbolPolicy.TryNormalize(
                symbol,
                out string normalizedSymbol))
        {
            return BadRequest(new
            {
                Message =
                    $"Unsupported stock symbol. Supported symbols: {PublicMarketSymbolPolicy.SupportedSymbolsDisplay}."
            });
        }

        if (!PublicMarketSymbolPolicy.TryNormalize(
                benchmarkSymbol,
                out string normalizedBenchmarkSymbol))
        {
            return BadRequest(new
            {
                Message =
                    $"Unsupported benchmark symbol. Supported symbols: {PublicMarketSymbolPolicy.SupportedSymbolsDisplay}."
            });
        }

        IReadOnlyList<GtaEventImpactResult> results =
            await _gtaEventImpactService.CalculateRankingAsync(
                normalizedSymbol,
                normalizedBenchmarkSymbol,
                cancellationToken);

        IReadOnlyList<GtaEventImpactResponse> response =
            results
                .Select(MapImpactResponse)
                .ToArray();

        return Ok(response);
    }

    /// <summary>
    /// Calculates the observed market reaction around a GTA VI event.
    /// D+1, D+5 and D+30 are cumulative from the previous close.
    /// The stock returns are also compared with a market benchmark.
    /// </summary>
    [HttpGet("{eventId:guid}/impact")]
    public async Task<ActionResult<GtaEventImpactResponse>> GetImpact(
        Guid eventId,
        [FromQuery] string symbol = "TTWO",
        [FromQuery] string benchmarkSymbol = "QQQ",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest(new
            {
                Message = "The stock symbol is required."
            });
        }

        if (string.IsNullOrWhiteSpace(benchmarkSymbol))
        {
            return BadRequest(new
            {
                Message = "The benchmark symbol is required."
            });
        }

        if (!PublicMarketSymbolPolicy.TryNormalize(
                symbol,
                out string normalizedSymbol))
        {
            return BadRequest(new
            {
                Message =
                    $"Unsupported stock symbol. Supported symbols: {PublicMarketSymbolPolicy.SupportedSymbolsDisplay}."
            });
        }

        if (!PublicMarketSymbolPolicy.TryNormalize(
                benchmarkSymbol,
                out string normalizedBenchmarkSymbol))
        {
            return BadRequest(new
            {
                Message =
                    $"Unsupported benchmark symbol. Supported symbols: {PublicMarketSymbolPolicy.SupportedSymbolsDisplay}."
            });
        }

        GtaEventImpactResult? result =
            await _gtaEventImpactService.CalculateAsync(
                eventId,
                normalizedSymbol,
                normalizedBenchmarkSymbol,
                cancellationToken);

        if (result is null)
        {
            return NotFound(new
            {
                Message = "The GTA VI event was not found."
            });
        }

        return Ok(MapImpactResponse(result));
    }

    private static GtaEventImpactResponse MapImpactResponse(
        GtaEventImpactResult result)
    {
        return new GtaEventImpactResponse
        {
            EventId = result.EventId,
            EventTitle = result.EventTitle,
            Symbol = result.Symbol,
            OccurredAtUtc = result.OccurredAtUtc,
            AnalysisTimestampUtc = result.AnalysisTimestampUtc,
            UsedPublishedAtUtc = result.UsedPublishedAtUtc,
            IsAvailable = result.IsAvailable,
            UnavailableReason = result.UnavailableReason,
            Exchange = result.Exchange,
            ExchangeTimezone = result.ExchangeTimezone,
            WasPublishedAfterMarketClose =
                result.WasPublishedAfterMarketClose,
            EffectiveTradingDate = result.EffectiveTradingDate,
            PreviousTradingDate = result.PreviousTradingDate,
            PreviousClose = result.PreviousClose,
            EventDayOpen = result.EventDayOpen,
            EventDayClose = result.EventDayClose,
            EventDayVolume = result.EventDayVolume,
            SameDayReturnPercent = result.SameDayReturnPercent,
            Day1TradingDate = result.Day1TradingDate,
            Day1Close = result.Day1Close,
            Day1ReturnPercent = result.Day1ReturnPercent,
            Day5TradingDate = result.Day5TradingDate,
            Day5Close = result.Day5Close,
            Day5ReturnPercent = result.Day5ReturnPercent,
            Day30TradingDate = result.Day30TradingDate,
            Day30Close = result.Day30Close,
            Day30ReturnPercent = result.Day30ReturnPercent,
            AverageVolumeBefore30Sessions =
                result.AverageVolumeBefore30Sessions,
            PreviousVolumeSessionsUsed =
                result.PreviousVolumeSessionsUsed,
            VolumeChangePercent = result.VolumeChangePercent,
            BenchmarkSymbol = result.BenchmarkSymbol,
            BenchmarkIsAvailable = result.BenchmarkIsAvailable,
            BenchmarkUnavailableReason =
                result.BenchmarkUnavailableReason,
            BenchmarkExchange = result.BenchmarkExchange,
            BenchmarkExchangeTimezone =
                result.BenchmarkExchangeTimezone,
            BenchmarkPreviousClose =
                result.BenchmarkPreviousClose,
            BenchmarkEventDayClose =
                result.BenchmarkEventDayClose,
            BenchmarkSameDayReturnPercent =
                result.BenchmarkSameDayReturnPercent,
            BenchmarkDay1Close = result.BenchmarkDay1Close,
            BenchmarkDay1ReturnPercent =
                result.BenchmarkDay1ReturnPercent,
            BenchmarkDay5Close = result.BenchmarkDay5Close,
            BenchmarkDay5ReturnPercent =
                result.BenchmarkDay5ReturnPercent,
            BenchmarkDay30Close = result.BenchmarkDay30Close,
            BenchmarkDay30ReturnPercent =
                result.BenchmarkDay30ReturnPercent,
            SameDayExcessReturnPercent =
                result.SameDayExcessReturnPercent,
            Day1ExcessReturnPercent =
                result.Day1ExcessReturnPercent,
            Day5ExcessReturnPercent =
                result.Day5ExcessReturnPercent,
            Day30ExcessReturnPercent =
                result.Day30ExcessReturnPercent,
            PriceBefore = result.PriceBefore,
            PriceBeforeRecordedAtUtc =
                result.PriceBeforeRecordedAtUtc,
            PriceAfter = result.PriceAfter,
            PriceAfterRecordedAtUtc =
                result.PriceAfterRecordedAtUtc,
            PriceChange = result.PriceChange,
            PriceChangePercent = result.PriceChangePercent
        };
    }
}
