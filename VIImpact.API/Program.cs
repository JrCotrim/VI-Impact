using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using VIImpact.API.BackgroundServices;
using VIImpact.API.Configuration;
using VIImpact.API.ErrorHandling;
using VIImpact.API.HealthChecks;
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
string[] allowedOrigins =
    (builder.Configuration["Cors:AllowedOrigins"]
        ?? "http://localhost:5173")
    .Split(
        ',',
        StringSplitOptions.RemoveEmptyEntries |
        StringSplitOptions.TrimEntries)
    .Append("http://localhost:5173")
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Services.AddCors(options =>
{
    options.AddPolicy(
        FrontendCorsPolicy,
        policy =>
        {
            policy
                .WithOrigins(allowedOrigins)
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

// PostgreSQL configuration
string connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "The database connection string was not configured.");

builder.Services.AddDbContext<VIImpactDbContext>(options =>
    options.UseNpgsql(
        connectionString,
        npgsqlOptions =>
            npgsqlOptions.SetPostgresVersion(18, 0)));

builder.Services.AddScoped<
    IDatabaseConnectivityProbe,
    EfDatabaseConnectivityProbe>();

builder.Services
    .AddHealthChecks()
    .AddCheck<DatabaseHealthCheck>(
        "postgresql",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "ready" });

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

app.MapHealthChecks(
    "/health/live",
    new HealthCheckOptions
    {
        Predicate = _ => false,
        ResponseWriter =
            HealthCheckResponseWriter.WriteAsync
    });

app.MapHealthChecks(
    "/health/ready",
    new HealthCheckOptions
    {
        Predicate = registration =>
            registration.Tags.Contains("ready"),
        ResponseWriter =
            HealthCheckResponseWriter.WriteAsync
    });

app.MapControllers();

app.Run();

/// <summary>
/// Applies pending PostgreSQL migrations and synchronizes
/// the GTA VI event catalog.
/// </summary>
static async Task InitializeDatabaseAsync(
    WebApplication application)
{
    await using AsyncServiceScope scope =
        application.Services.CreateAsyncScope();

    VIImpactDbContext dbContext =
        scope.ServiceProvider
            .GetRequiredService<VIImpactDbContext>();

    await dbContext.Database.MigrateAsync();
    await GtaEventSeeder.SeedAsync(dbContext);
}
