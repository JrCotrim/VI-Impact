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
    public async Task CalculateAsync_WhenTimeSeriesExists_ReturnsImpactAndBenchmarkComparison()
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

        DateTime previousDate = eventDateUtc.Date.AddDays(-1);

        StockTimeSeries stockTimeSeries = CreateTimeSeries(
            previousDate,
            previousClose: 100m,
            eventClose: 110m,
            day1Close: 112m,
            day5Close: 120m,
            day30Close: 130m);

        StockTimeSeries benchmarkTimeSeries = CreateTimeSeries(
            previousDate,
            previousClose: 200m,
            eventClose: 204m,
            day1Close: 206m,
            day5Close: 210m,
            day30Close: 220m);

        var gtaEventRepository =
            new FakeGtaEventRepository(gtaEvent);

        var stockMarketService =
            new FakeStockMarketService(
                new Dictionary<string, StockTimeSeries>(
                    StringComparer.OrdinalIgnoreCase)
                {
                    ["TTWO"] = stockTimeSeries,
                    ["QQQ"] = benchmarkTimeSeries
                });

        var service = new GtaEventImpactService(
            gtaEventRepository,
            stockMarketService);

        GtaEventImpactResult? result =
            await service.CalculateAsync(
                eventId,
                "TTWO",
                "QQQ");

        Assert.NotNull(result);
        Assert.True(result.IsAvailable);
        Assert.Equal(eventId, result.EventId);
        Assert.Equal("GTA VI trailer announced", result.EventTitle);
        Assert.Equal(100m, result.PriceBefore);
        Assert.Equal(110m, result.PriceAfter);
        Assert.Equal(10m, result.PriceChange);
        Assert.Equal(10m, result.PriceChangePercent);

        Assert.True(result.BenchmarkIsAvailable);
        Assert.Equal("QQQ", result.BenchmarkSymbol);
        Assert.Equal(2m, result.BenchmarkSameDayReturnPercent);
        Assert.Equal(3m, result.BenchmarkDay1ReturnPercent);
        Assert.Equal(5m, result.BenchmarkDay5ReturnPercent);
        Assert.Equal(10m, result.BenchmarkDay30ReturnPercent);

        Assert.Equal(8m, result.SameDayExcessReturnPercent);
        Assert.Equal(9m, result.Day1ExcessReturnPercent);
        Assert.Equal(15m, result.Day5ExcessReturnPercent);
        Assert.Equal(20m, result.Day30ExcessReturnPercent);
    }

    [Fact]
    public async Task CalculateAsync_WhenBenchmarkDataIsIncomplete_KeepsStockImpactAvailable()
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
            Title = "GTA VI event",
            Description = "Test event.",
            SourceUrl = "https://example.com",
            OccurredAtUtc = eventDateUtc,
            DatePrecision = GtaEventDatePrecision.ExactTime,
            Status = GtaEventStatus.Occurred,
            IsImpactAnalysisEligible = true
        };

        StockTimeSeries stockTimeSeries = CreateTimeSeries(
            eventDateUtc.Date.AddDays(-1),
            previousClose: 100m,
            eventClose: 110m,
            day1Close: 112m,
            day5Close: 120m,
            day30Close: 130m);

        var incompleteBenchmark = new StockTimeSeries
        {
            Exchange = "NASDAQ",
            ExchangeTimezone = "America/New_York",
            Values =
            [
                new StockTimeSeriesPoint
                {
                    DateTime = eventDateUtc.Date,
                    Open = 203m,
                    Close = 204m,
                    Volume = 1000
                }
            ]
        };

        var stockMarketService =
            new FakeStockMarketService(
                new Dictionary<string, StockTimeSeries>(
                    StringComparer.OrdinalIgnoreCase)
                {
                    ["TTWO"] = stockTimeSeries,
                    ["QQQ"] = incompleteBenchmark
                });

        var service = new GtaEventImpactService(
            new FakeGtaEventRepository(gtaEvent),
            stockMarketService);

        GtaEventImpactResult? result =
            await service.CalculateAsync(
                eventId,
                "TTWO");

        Assert.NotNull(result);
        Assert.True(result.IsAvailable);
        Assert.False(result.BenchmarkIsAvailable);
        Assert.NotNull(result.BenchmarkUnavailableReason);
        Assert.Null(result.SameDayExcessReturnPercent);
    }

    [Fact]
    public async Task CalculateAsync_WhenEventDoesNotExist_ReturnsNull()
    {
        var gtaEventRepository =
            new FakeGtaEventRepository(null);

        var stockMarketService =
            new FakeStockMarketService(
                new Dictionary<string, StockTimeSeries>(
                    StringComparer.OrdinalIgnoreCase));

        var service = new GtaEventImpactService(
            gtaEventRepository,
            stockMarketService);

        GtaEventImpactResult? result =
            await service.CalculateAsync(
                Guid.NewGuid(),
                "TTWO");

        Assert.Null(result);
    }

    private static StockTimeSeries CreateTimeSeries(
        DateTime previousDate,
        decimal previousClose,
        decimal eventClose,
        decimal day1Close,
        decimal day5Close,
        decimal day30Close)
    {
        var values = new List<StockTimeSeriesPoint>();

        for (int index = 0; index <= 31; index++)
        {
            decimal close = previousClose + index;

            if (index == 1)
            {
                close = eventClose;
            }
            else if (index == 2)
            {
                close = day1Close;
            }
            else if (index == 6)
            {
                close = day5Close;
            }
            else if (index == 31)
            {
                close = day30Close;
            }

            values.Add(new StockTimeSeriesPoint
            {
                DateTime = previousDate.AddDays(index),
                Open = close,
                Close = close,
                Volume = 1000 + index
            });
        }

        return new StockTimeSeries
        {
            Exchange = "NASDAQ",
            ExchangeTimezone = "America/New_York",
            Values = values
        };
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
        private readonly IReadOnlyDictionary<string, StockTimeSeries>
            _timeSeriesBySymbol;

        public FakeStockMarketService(
            IReadOnlyDictionary<string, StockTimeSeries>
                timeSeriesBySymbol)
        {
            _timeSeriesBySymbol = timeSeriesBySymbol;
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
            if (!_timeSeriesBySymbol.TryGetValue(
                    symbol,
                    out StockTimeSeries? timeSeries))
            {
                throw new InvalidOperationException(
                    $"No time series was configured for {symbol}.");
            }

            return Task.FromResult(timeSeries);
        }
    }
}