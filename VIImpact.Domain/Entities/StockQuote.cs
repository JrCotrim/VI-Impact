namespace VIImpact.Domain.Entities;

public class StockQuote
{
    public Guid Id { get; set; }

    public string Symbol { get; set; } = string.Empty;

    public decimal Price { get; set; }

    public decimal ChangePercent { get; set; }

    public long Volume { get; set; }

    public DateTime RecordedAtUtc { get; set; }
}