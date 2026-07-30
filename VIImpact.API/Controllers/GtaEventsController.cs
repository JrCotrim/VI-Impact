using System.Globalization;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Contracts.GtaEvents;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Domain.Entities;
using VIImpact.Domain.Enums;

namespace VIImpact.API.Controllers;

/// <summary>
/// Provides endpoints for creating, retrieving and analyzing
/// GTA VI events.
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
    /// Creates and stores a manually entered GTA VI event.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<GtaEvent>> Create(
        CreateGtaEventRequest request,
        CancellationToken cancellationToken)
    {
        if (request.OccurredAtUtc == default)
        {
            return BadRequest(new
            {
                Message = "The event date is required."
            });
        }

        Guid eventId = Guid.NewGuid();
        string title = request.Title.Trim();

        var gtaEvent = new GtaEvent
        {
            Id = eventId,
            Slug = CreateManualSlug(title, eventId),
            Title = title,
            Description = request.Description.Trim(),
            Category = GtaEventCategory.Announcement,
            Subcategory = "Manual entry",
            Priority = GtaEventPriority.Relevant,
            SourceType = GtaEventSourceType.Unofficial,
            SourceName = "Manual entry",
            SourceUrl = request.SourceUrl.Trim(),
            OccurredAtUtc =
                request.OccurredAtUtc.ToUniversalTime(),
            DatePrecision = GtaEventDatePrecision.ExactTime,
            Status = GtaEventStatus.Occurred,
            IsOfficial = false,
            IsImpactAnalysisEligible = true
        };

        await _gtaEventRepository.AddAsync(
            gtaEvent,
            cancellationToken);

        return Created(
            $"/api/gtaevents/{gtaEvent.Id}",
            gtaEvent);
    }

    /// <summary>
    /// Calculates the observed market reaction around a GTA VI event.
    /// D+1, D+5 and D+30 are cumulative from the previous close.
    /// </summary>
    [HttpGet("{eventId:guid}/impact")]
    public async Task<ActionResult<GtaEventImpactResponse>> GetImpact(
        Guid eventId,
        [FromQuery] string symbol = "TTWO",
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(symbol))
        {
            return BadRequest(new
            {
                Message = "The stock symbol is required."
            });
        }

        GtaEventImpactResult? result =
            await _gtaEventImpactService.CalculateAsync(
                eventId,
                symbol,
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

    private static string CreateManualSlug(
        string title,
        Guid eventId)
    {
        string normalized = title
            .Normalize(NormalizationForm.FormD);

        var builder = new StringBuilder();
        bool previousCharacterWasSeparator = false;

        foreach (char character in normalized)
        {
            UnicodeCategory category =
                CharUnicodeInfo.GetUnicodeCategory(character);

            if (category == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(character))
            {
                builder.Append(char.ToLowerInvariant(character));
                previousCharacterWasSeparator = false;
                continue;
            }

            if (!previousCharacterWasSeparator && builder.Length > 0)
            {
                builder.Append('-');
                previousCharacterWasSeparator = true;
            }
        }

        string slugBase = builder
            .ToString()
            .Trim('-');

        if (string.IsNullOrWhiteSpace(slugBase))
        {
            slugBase = "gta-vi-event";
        }

        string shortId = eventId
            .ToString("N")[..8];

        return $"{slugBase}-{shortId}";
    }
}