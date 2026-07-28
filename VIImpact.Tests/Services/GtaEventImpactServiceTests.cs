using VIImpact.Application.Interfaces;
using VIImpact.Application.Models;
using VIImpact.Application.Services;
using VIImpact.Domain.Entities;

namespace VIImpact.Tests.Services;

/// <summary>
/// Tests the stock-market impact calculation for GTA VI events.
/// </summary>
public sealed class GtaEventImpactServiceTests
{
    [Fact]
    public async Task CalculateAsync_WhenQuotesExist_ReturnsCalculatedImpact()
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
            OccurredAtUtc = eventDateUtc
        };

        var quoteBefore = new StockQuote
        {
            Id = Guid.NewGuid(),
            Symbol = "TTWO",
            Price = 100m,
            ChangePercent = 0m,
            Volume = 1000,
            RecordedAtUtc = eventDateUtc.AddMinutes(-5)
        };

        var quoteAfter = new StockQuote
        {
            Id = Guid.NewGuid(),
            Symbol = "TTWO",
            Price = 110m,
            ChangePercent = 10m,
            Volume = 2000,
            RecordedAtUtc = eventDateUtc.AddMinutes(5)
        };

        var gtaEventRepository =
            new FakeGtaEventRepository(gtaEvent);

        var stockQuoteRepository =
            new FakeStockQuoteRepository(
                quoteBefore,
                quoteAfter);

        var service = new GtaEventImpactService(
            gtaEventRepository,
            stockQuoteRepository);

        GtaEventImpactResult? result =
            await service.CalculateAsync(
                eventId,
                "TTWO");

        Assert.NotNull(result);
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

        var stockQuoteRepository =
            new FakeStockQuoteRepository(
                null,
                null);

        var service = new GtaEventImpactService(
            gtaEventRepository,
            stockQuoteRepository);

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

    private sealed class FakeStockQuoteRepository
        : IStockQuoteRepository
    {
        private readonly StockQuote? _quoteBefore;
        private readonly StockQuote? _quoteAfter;

        public FakeStockQuoteRepository(
            StockQuote? quoteBefore,
            StockQuote? quoteAfter)
        {
            _quoteBefore = quoteBefore;
            _quoteAfter = quoteAfter;
        }

        public Task<bool> AddIfNewAsync(
            StockQuote stockQuote,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(true);
        }

        public Task<IReadOnlyList<StockQuote>> GetHistoryAsync(
            string symbol,
            int limit,
            CancellationToken cancellationToken = default)
        {
            IReadOnlyList<StockQuote> quotes =
                Array.Empty<StockQuote>();

            return Task.FromResult(quotes);
        }

        public Task<StockQuote?> GetNearestBeforeAsync(
            string symbol,
            DateTime dateUtc,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_quoteBefore);
        }

        public Task<StockQuote?> GetNearestAfterAsync(
            string symbol,
            DateTime dateUtc,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_quoteAfter);
        }
    }
}