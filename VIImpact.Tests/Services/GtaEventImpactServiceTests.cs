using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Application.Services;
using VIImpact.Domain.Entities;
using VIImpact.Domain.Enums;

namespace VIImpact.Tests.Services;

/// <summary>
/// Tests the stock-market impact calculation for GTA VI events.
/// </summary>
public sealed class GtaEventImpactServiceTests
{
    [Fact]
    public async Task CalculateAsync_WhenTimeSeriesExists_ReturnsCalculatedImpact()
    {
        Guid eventId = Guid.NewGuid();

        DateTime eventDateUtc = new(
            2026,
            7,
            28,
            18,
            0,
            0,
            DateTimeKind.Utc);

        var gtaEvent = new GtaEvent
        {
            Id = eventId,
            Title = "GTA VI trailer announced",
            Description = "Test event.",
            SourceUrl = "https://example.com",
            OccurredAtUtc = eventDateUtc,
            DatePrecision = GtaEventDatePrecision.ExactTime,
            Status = GtaEventStatus.Occurred,
            IsImpactAnalysisEligible = true
        };

        var previousSession = new StockTimeSeriesPoint
        {
            DateTime = eventDateUtc.Date.AddDays(-1),
            Open = 99m,
            Close = 100m,
            Volume = 1000
        };

        var eventSession = new StockTimeSeriesPoint
        {
            DateTime = eventDateUtc.Date,
            Open = 101m,
            Close = 110m,
            Volume = 2000
        };

        var timeSeries = new StockTimeSeries
        {
            Exchange = "NASDAQ",
            ExchangeTimezone = "America/New_York",
            Values =
            [
                previousSession,
                eventSession
            ]
        };

        var gtaEventRepository =
            new FakeGtaEventRepository(gtaEvent);

        var stockMarketService =
            new FakeStockMarketService(timeSeries);

        var service = new GtaEventImpactService(
            gtaEventRepository,
            stockMarketService);

        GtaEventImpactResult? result =
            await service.CalculateAsync(
                eventId,
                "TTWO");

        Assert.NotNull(result);
        Assert.True(result.IsAvailable);
        Assert.Equal(eventId, result.EventId);
        Assert.Equal("GTA VI trailer announced", result.EventTitle);
        Assert.Equal(100m, result.PriceBefore);
        Assert.Equal(110m, result.PriceAfter);
        Assert.Equal(10m, result.PriceChange);
        Assert.Equal(10m, result.PriceChangePercent);
    }

    [Fact]
    public async Task CalculateAsync_WhenEventDoesNotExist_ReturnsNull()
    {
        var gtaEventRepository =
            new FakeGtaEventRepository(null);

        var stockMarketService =
            new FakeStockMarketService(null);

        var service = new GtaEventImpactService(
            gtaEventRepository,
            stockMarketService);

        GtaEventImpactResult? result =
            await service.CalculateAsync(
                Guid.NewGuid(),
                "TTWO");

        Assert.Null(result);
    }

    private sealed class FakeGtaEventRepository
        : IGtaEventRepository
    {
        private readonly GtaEvent? _gtaEvent;

        public FakeGtaEventRepository(
            GtaEvent? gtaEvent)
        {
            _gtaEvent = gtaEvent;
        }

        public Task AddAsync(
            GtaEvent gtaEvent,
            CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task<IReadOnlyList<GtaEvent>> GetAllAsync(
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<GtaEvent> events =
                _gtaEvent is null
                    ? Array.Empty<GtaEvent>()
                    : new[] { _gtaEvent };

            return Task.FromResult(events);
        }

        public Task<GtaEvent?> GetByIdAsync(
            Guid id,
            CancellationToken cancellationToken = default)
        {
            GtaEvent? result =
                _gtaEvent?.Id == id
                    ? _gtaEvent
                    : null;

            return Task.FromResult(result);
        }
    }

    private sealed class FakeStockMarketService
        : IStockMarketService
    {
        private readonly StockTimeSeries? _timeSeries;

        public FakeStockMarketService(
            StockTimeSeries? timeSeries)
        {
            _timeSeries = timeSeries;
        }

        public Task<StockQuote> GetLatestQuoteAsync(
            string symbol,
            CancellationToken cancellationToken = default)
        {
            throw new NotSupportedException(
                "This test does not use the latest-quote operation.");
        }

        public Task<StockTimeSeries> GetTimeSeriesAsync(
            string symbol,
            StockTimeSeriesQuery query,
            CancellationToken cancellationToken = default)
        {
            StockTimeSeries timeSeries =
                _timeSeries ??
                throw new InvalidOperationException(
                    "The time series was not configured for this test.");

            return Task.FromResult(timeSeries);
        }
    }
}