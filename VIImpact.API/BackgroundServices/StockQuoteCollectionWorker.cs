using Microsoft.Extensions.Options;
using VIImpact.API.Configuration;
using VIImpact.Application.Interfaces;
using VIImpact.Domain.Entities;

namespace VIImpact.API.BackgroundServices;

/// <summary>
/// Periodically retrieves and stores stock quotes in the background.
/// </summary>
public sealed class StockQuoteCollectionWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOptionsMonitor<StockCollectionOptions> _options;
    private readonly ILogger<StockQuoteCollectionWorker> _logger;

    public StockQuoteCollectionWorker(
        IServiceScopeFactory scopeFactory,
        IOptionsMonitor<StockCollectionOptions> options,
        ILogger<StockQuoteCollectionWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        _logger.LogInformation(
            "The automatic stock quote collector has started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            StockCollectionOptions settings =
                _options.CurrentValue;

            if (!settings.Enabled)
            {
                _logger.LogInformation(
                    "The automatic stock quote collector is disabled.");

                await Task.Delay(
                    TimeSpan.FromMinutes(1),
                    stoppingToken);

                continue;
            }

            try
            {
                await using AsyncServiceScope scope =
                    _scopeFactory.CreateAsyncScope();

                IStockMarketService stockMarketService =
                    scope.ServiceProvider
                        .GetRequiredService<IStockMarketService>();

                IStockQuoteRepository stockQuoteRepository =
                    scope.ServiceProvider
                        .GetRequiredService<IStockQuoteRepository>();

                StockQuote quote =
                    await stockMarketService.GetLatestQuoteAsync(
                        settings.Symbol,
                        stoppingToken);

                bool stored =
                    await stockQuoteRepository.AddIfNewAsync(
                        quote,
                        stoppingToken);

                if (stored)
                {
                    _logger.LogInformation(
                        "Quote for {Symbol} stored successfully at {RecordedAtUtc}.",
                        quote.Symbol,
                        quote.RecordedAtUtc);
                }
                else
                {
                    _logger.LogInformation(
                        "An identical quote for {Symbol} already exists and was not stored.",
                        quote.Symbol);
                }
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(
                    exception,
                    "An error occurred while collecting the quote for {Symbol}.",
                    settings.Symbol);
            }

            int intervalMinutes =
                Math.Max(1, settings.IntervalMinutes);

            await Task.Delay(
                TimeSpan.FromMinutes(intervalMinutes),
                stoppingToken);
        }
    }
}