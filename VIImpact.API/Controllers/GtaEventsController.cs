using Microsoft.AspNetCore.Mvc;
using VIImpact.API.Contracts.GtaEvents;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.API.Controllers;

/// <summary>
/// Provides endpoints for creating and retrieving GTA VI events.
/// </summary>
[ApiController]
[Route("api/gtaevents")]
public sealed class GtaEventsController : ControllerBase
{
    private readonly IGtaEventRepository _gtaEventRepository;

    public GtaEventsController(
        IGtaEventRepository gtaEventRepository)
    {
        _gtaEventRepository = gtaEventRepository;
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
            OccurredAtUtc = request.OccurredAtUtc.ToUniversalTime()
        };

        await _gtaEventRepository.AddAsync(
            gtaEvent,
            cancellationToken);

        return Created(
            $"/api/gtaevents/{gtaEvent.Id}",
            gtaEvent);
    }
}