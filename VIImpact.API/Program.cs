using Microsoft.EntityFrameworkCore;
using VIImpact.API.BackgroundServices;
using VIImpact.API.Configuration;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Services;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData;
using VIImpact.Infrastructure.Persistence;
using VIImpact.Infrastructure.Persistence.Repositories;

const string FrontendCorsPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Frontend access
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        FrontendCorsPolicy,
        policy =>
        {
            policy
                .WithOrigins("http://localhost:5173")
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
});

// Standardized API error responses
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] =
            context.HttpContext.TraceIdentifier;
    };
});

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
builder.Services.AddScoped<
    IStockQuoteRepository,
    StockQuoteRepository>();

builder.Services.AddScoped<
    IGtaEventRepository,
    GtaEventRepository>();

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

// Global error handling
app.UseExceptionHandler();
app.UseStatusCodePages();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors(FrontendCorsPolicy);
app.UseAuthorization();
app.MapControllers();

app.Run();