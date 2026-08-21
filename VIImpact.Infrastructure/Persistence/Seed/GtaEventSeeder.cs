using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using VIImpact.Domain.Entities;

namespace VIImpact.Infrastructure.Persistence.Seed;

/// <summary>
/// Inserts or updates the embedded GTA VI event catalog without creating duplicates.
/// </summary>
public static class GtaEventSeeder
{
    private const string SeedResourceName =
        "VIImpact.Infrastructure.Data.Seed.gta-events.json";

    private static readonly string[] LegacyTestTitles =
    [
        "GTA VI event test",
        "GTA VI impact calculation test"
    ];

    private static readonly JsonSerializerOptions SerializerOptions =
        new()
        {
            PropertyNameCaseInsensitive = true,
            Converters =
            {
                new JsonStringEnumConverter()
            }
        };

    /// <summary>
    /// Synchronizes the database with the embedded GTA VI event catalog.
    /// </summary>
    public static async Task SeedAsync(
        VIImpactDbContext dbContext,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dbContext);

        IReadOnlyList<GtaEventSeedItem> seedItems =
            await LoadSeedItemsAsync(cancellationToken);

        ValidateSeedItems(seedItems);

        List<GtaEvent> legacyTestEvents =
            await dbContext.GtaEvents
                .Where(gtaEvent =>
                    LegacyTestTitles.Contains(gtaEvent.Title) ||
                    gtaEvent.SourceUrl.StartsWith(
                        "https://example.com/gta-vi-"))
                .ToListAsync(cancellationToken);

        if (legacyTestEvents.Count > 0)
        {
            dbContext.GtaEvents.RemoveRange(legacyTestEvents);
        }

        string[] slugs = seedItems
            .Select(seedItem => seedItem.Slug)
            .ToArray();

        Dictionary<string, GtaEvent> existingEvents =
            await dbContext.GtaEvents
                .Where(gtaEvent => slugs.Contains(gtaEvent.Slug))
                .ToDictionaryAsync(
                    gtaEvent => gtaEvent.Slug,
                    StringComparer.OrdinalIgnoreCase,
                    cancellationToken);

        foreach (GtaEventSeedItem seedItem in seedItems)
        {
            if (!existingEvents.TryGetValue(
                    seedItem.Slug,
                    out GtaEvent? gtaEvent))
            {
                gtaEvent = new GtaEvent
                {
                    Id = Guid.NewGuid(),
                    Slug = seedItem.Slug
                };

                dbContext.GtaEvents.Add(gtaEvent);
                existingEvents.Add(seedItem.Slug, gtaEvent);
            }

            ApplySeedItem(gtaEvent, seedItem);
        }

        await dbContext.SaveChangesAsync(cancellationToken);

        List<GtaEvent> eventsMissingSummary =
            await dbContext.GtaEvents
                .Where(gtaEvent => gtaEvent.Summary == string.Empty)
                .ToListAsync(cancellationToken);

        if (eventsMissingSummary.Count > 0)
        {
            foreach (GtaEvent gtaEvent in eventsMissingSummary)
            {
                gtaEvent.Summary = gtaEvent.Description;
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private static async Task<IReadOnlyList<GtaEventSeedItem>>
        LoadSeedItemsAsync(
            CancellationToken cancellationToken)
    {
        Assembly assembly = typeof(GtaEventSeeder).Assembly;

        await using Stream stream =
            assembly.GetManifestResourceStream(SeedResourceName)
            ?? throw new InvalidOperationException(
                $"The embedded resource '{SeedResourceName}' was not found.");

        List<GtaEventSeedItem>? seedItems =
            await JsonSerializer.DeserializeAsync<
                List<GtaEventSeedItem>>(
                stream,
                SerializerOptions,
                cancellationToken);

        return seedItems
            ?? throw new InvalidOperationException(
                "The GTA VI event seed catalog could not be deserialized.");
    }

    private static void ValidateSeedItems(
        IReadOnlyList<GtaEventSeedItem> seedItems)
    {
        if (seedItems.Count == 0)
        {
            throw new InvalidOperationException(
                "The GTA VI event seed catalog is empty.");
        }

        string[] duplicateSlugs = seedItems
            .GroupBy(
                seedItem => seedItem.Slug,
                StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToArray();

        if (duplicateSlugs.Length > 0)
        {
            throw new InvalidOperationException(
                "The GTA VI event seed catalog contains duplicate slugs: " +
                string.Join(", ", duplicateSlugs));
        }

        GtaEventSeedItem? invalidSeedItem = seedItems
            .FirstOrDefault(seedItem =>
                string.IsNullOrWhiteSpace(seedItem.Slug) ||
                string.IsNullOrWhiteSpace(seedItem.Title) ||
                string.IsNullOrWhiteSpace(seedItem.Summary) ||
                string.IsNullOrWhiteSpace(seedItem.Description) ||
                string.IsNullOrWhiteSpace(seedItem.Subcategory) ||
                string.IsNullOrWhiteSpace(seedItem.SourceName));

        if (invalidSeedItem is not null)
        {
            throw new InvalidOperationException(
                "Every GTA VI seed event must have a slug, title, " +
                "summary, description, subcategory and source name.");
        }
    }

    private static void ApplySeedItem(
        GtaEvent gtaEvent,
        GtaEventSeedItem seedItem)
    {
        gtaEvent.Slug = seedItem.Slug;
        gtaEvent.Title = seedItem.Title;
        gtaEvent.Summary = seedItem.Summary;
        gtaEvent.Description = seedItem.Description;
        gtaEvent.Category = seedItem.Category;
        gtaEvent.Subcategory = seedItem.Subcategory;
        gtaEvent.Priority = seedItem.Priority;
        gtaEvent.SourceType = seedItem.SourceType;
        gtaEvent.SourceName = seedItem.SourceName;
        gtaEvent.SourceUrl = seedItem.SourceUrl;
        gtaEvent.OccurredAtUtc = seedItem.OccurredAtUtc;
        gtaEvent.OccurredUntilUtc = seedItem.OccurredUntilUtc;
        gtaEvent.PublishedAtUtc = seedItem.PublishedAtUtc;
        gtaEvent.DatePrecision = seedItem.DatePrecision;
        gtaEvent.Status = seedItem.Status;
        gtaEvent.IsOfficial = seedItem.IsOfficial;
        gtaEvent.IsImpactAnalysisEligible =
            seedItem.IsImpactAnalysisEligible;
    }
}
