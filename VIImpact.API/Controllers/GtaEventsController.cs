using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Contracts.GtaEvents;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Domain.Entities;

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
    /// Creates and stores a new GTA VI event.
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

        var gtaEvent = new GtaEvent
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            SourceUrl = request.SourceUrl.Trim(),
            OccurredAtUtc =
                request.OccurredAtUtc.ToUniversalTime()
        };

        await _gtaEventRepository.AddAsync(
            gtaEvent,
            cancellationToken);

        return Created(
            $"/api/gtaevents/{gtaEvent.Id}",
            gtaEvent);
    }

    /// <summary>
    /// Calculates the movement of a stock before and after
    /// a GTA VI event.
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

        var response = new GtaEventImpactResponse
        {
            EventId = result.EventId,
            EventTitle = result.EventTitle,
            OccurredAtUtc = result.OccurredAtUtc,

            PriceBefore = result.PriceBefore,
            PriceBeforeRecordedAtUtc =
                result.PriceBeforeRecordedAtUtc,

            PriceAfter = result.PriceAfter,
            PriceAfterRecordedAtUtc =
                result.PriceAfterRecordedAtUtc,

            PriceChange = result.PriceChange,
            PriceChangePercent =
                result.PriceChangePercent
        };

        return Ok(response);
    }
}