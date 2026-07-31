namespace VIImpact.API.Contracts.GtaEvents;

/// <summary>
/// Represents the observed market reaction around a GTA VI event.
/// </summary>
public sealed class GtaEventImpactResponse
{
    public Guid EventId { get; set; }

    public string EventTitle { get; set; } = string.Empty;

    public string Symbol { get; set; } = string.Empty;

    public DateTime OccurredAtUtc { get; set; }

    public DateTime AnalysisTimestampUtc { get; set; }

    public bool UsedPublishedAtUtc { get; set; }

    public bool IsAvailable { get; set; }

    public string? UnavailableReason { get; set; }

    public string Exchange { get; set; } = string.Empty;

    public string ExchangeTimezone { get; set; } = string.Empty;

    public bool? WasPublishedAfterMarketClose { get; set; }

    public DateTime? EffectiveTradingDate { get; set; }

    public DateTime? PreviousTradingDate { get; set; }

    public decimal? PreviousClose { get; set; }

    public decimal? EventDayOpen { get; set; }

    public decimal? EventDayClose { get; set; }

    public long? EventDayVolume { get; set; }

    public decimal? SameDayReturnPercent { get; set; }

    public DateTime? Day1TradingDate { get; set; }

    public decimal? Day1Close { get; set; }

    public decimal? Day1ReturnPercent { get; set; }

    public DateTime? Day5TradingDate { get; set; }

    public decimal? Day5Close { get; set; }

    public decimal? Day5ReturnPercent { get; set; }

    public DateTime? Day30TradingDate { get; set; }

    public decimal? Day30Close { get; set; }

    public decimal? Day30ReturnPercent { get; set; }

    public decimal? AverageVolumeBefore30Sessions { get; set; }

    public int PreviousVolumeSessionsUsed { get; set; }

    public decimal? VolumeChangePercent { get; set; }

    public string BenchmarkSymbol { get; set; } = string.Empty;

    public bool BenchmarkIsAvailable { get; set; }

    public string? BenchmarkUnavailableReason { get; set; }

    public string BenchmarkExchange { get; set; } = string.Empty;

    public string BenchmarkExchangeTimezone { get; set; } = string.Empty;

    public decimal? BenchmarkPreviousClose { get; set; }

    public decimal? BenchmarkEventDayClose { get; set; }

    public decimal? BenchmarkSameDayReturnPercent { get; set; }

    public decimal? BenchmarkDay1Close { get; set; }

    public decimal? BenchmarkDay1ReturnPercent { get; set; }

    public decimal? BenchmarkDay5Close { get; set; }

    public decimal? BenchmarkDay5ReturnPercent { get; set; }

    public decimal? BenchmarkDay30Close { get; set; }

    public decimal? BenchmarkDay30ReturnPercent { get; set; }

    public decimal? SameDayExcessReturnPercent { get; set; }

    public decimal? Day1ExcessReturnPercent { get; set; }

    public decimal? Day5ExcessReturnPercent { get; set; }

    public decimal? Day30ExcessReturnPercent { get; set; }

    public decimal? PriceBefore { get; set; }

    public DateTime? PriceBeforeRecordedAtUtc { get; set; }

    public decimal? PriceAfter { get; set; }

    public DateTime? PriceAfterRecordedAtUtc { get; set; }

    public decimal? PriceChange { get; set; }

    public decimal? PriceChangePercent { get; set; }
}