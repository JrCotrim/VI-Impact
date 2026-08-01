using Microsoft.EntityFrameworkCore;
using VIImpact.API.BackgroundServices;
using VIImpact.API.Configuration;
using VIImpact.API.ErrorHandling;
using VIImpact.Application.Interfaces;
using VIImpact.Application.Services;
using VIImpact.Infrastructure.Configuration;
using VIImpact.Infrastructure.Integrations.TwelveData;
using VIImpact.Infrastructure.Persistence;
using VIImpact.Infrastructure.Persistence.Repositories;
using VIImpact.Infrastructure.Persistence.Seed;

const string FrontendCorsPolicy = "Frontend";

var builder = WebApplication.CreateBuilder(args);

// Controllers
builder.Services.AddControllers();

// Shared in-memory services
builder.Services.AddSingleton<
    GtaEventImpactRankingCache>();

builder.Services.AddSingleton<TimeProvider>(
    TimeProvider.System);

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

builder.Services.AddExceptionHandler<
    ApiExceptionHandler>();

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

builder.Services.AddSingleton<
    TwelveDataResilienceState>();

builder.Services.AddHttpClient<
    IStockMarketService,
    TwelveDataStockMarketService>(
        client =>
        {
            client.BaseAddress =
                new Uri(twelveDataOptions.BaseUrl);

            // Per-attempt timeouts are enforced by the provider
            // resilience policy.
            client.Timeout =
                Timeout.InfiniteTimeSpan;
        });

var app = builder.Build();

await InitializeDatabaseAsync(app);

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

/// <summary>
/// Applies pending migrations and synchronizes the GTA VI event catalog.
/// </summary>
static async Task InitializeDatabaseAsync(
    WebApplication application)
{
    const string legacyGtaEventCleanupSql = """
        IF OBJECT_ID(N'[dbo].[GtaEvents]', N'U') IS NOT NULL
        BEGIN
            DELETE FROM [dbo].[GtaEvents]
            WHERE [Title] IN
            (
                N'GTA VI event test',
                N'GTA VI impact calculation test'
            )
            OR [SourceUrl] LIKE N'https://example.com/gta-vi-%';
        END
        """;

    await using AsyncServiceScope scope =
        application.Services.CreateAsyncScope();

    VIImpactDbContext dbContext =
        scope.ServiceProvider
            .GetRequiredService<VIImpactDbContext>();

    if (await dbContext.Database.CanConnectAsync())
    {
        await dbContext.Database.ExecuteSqlRawAsync(
            legacyGtaEventCleanupSql);
    }

    await dbContext.Database.MigrateAsync();
    await GtaEventSeeder.SeedAsync(dbContext);
}