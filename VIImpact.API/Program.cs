using Microsoft.EntityFrameworkCore;
using VIImpact.API.BackgroundServices;
using VIImpact.API.Configuration;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Services;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData;
using VIImpact.Infrastructure.Persistence;
using VIImpact.Infrastructure.Persistence.Repositories;

var builder = WebApplication.CreateBuilder(args);

// Controllers

builder.Services.AddControllers();

// Automatic stock quote collection

builder.Services.Configure<StockCollectionOptions>(
    builder.Configuration.GetSection(
        StockCollectionOptions.SectionName));

builder.Services.AddHostedService<StockQuoteCollectionWorker>();

// Database configuration

string connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "The database connection string was not configured.");

builder.Services.AddDbContext<VIImpactDbContext>(options =>
    options.UseSqlServer(connectionString));

// Repositories

builder.Services.AddScoped<IStockQuoteRepository, StockQuoteRepository>();
builder.Services.AddScoped<IGtaEventRepository, GtaEventRepository>();

// Application services

builder.Services.AddScoped<
    IGtaEventImpactService,
    GtaEventImpactService>();

// Twelve Data configuration

var twelveDataOptions = new TwelveDataOptions();

builder.Configuration
    .GetSection(TwelveDataOptions.SectionName)
    .Bind(twelveDataOptions);

builder.Services.AddSingleton(twelveDataOptions);

builder.Services.AddHttpClient<
    IStockMarketService,
    TwelveDataStockMarketService>(
        client =>
        {
            client.BaseAddress =
                new Uri(twelveDataOptions.BaseUrl);
        });

var app = builder.Build();

// HTTP request pipeline

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();