---
paths:
  - "VIImpact.Infrastructure/Data/Seed/gta-events.json"
  - "**/*GtaEvent*"
  - "**/*gta-event*"
  - "VIImpact.Web/**/*event*"
  - "VIImpact.Web/**/*seo*"
  - "VIImpact.Web/**/*sitemap*"
---

# GTA VI event/content rules

Before adding or changing an event:

1. Inspect the current catalog and avoid duplicates.
2. Verify the underlying event date.
3. Verify the source and publication date.
4. Classify the evidence: official, company statement, reputable report, rumor, leak, or speculation.
5. Never promote rumor/leak to official status.
6. Preserve current schema/order conventions.
7. Preserve `Summary` vs `Description` separation if it remains in the current model.
8. Keep summary concise; use description for fuller analysis.
9. Avoid causal financial language unless causation is actually established.
10. Validate SEO/event page generation when affected.

Source preference:

1. Rockstar/Take-Two/official corporate or regulatory material.
2. Primary interview/publication.
3. Reputable major reporting.
4. Specialist reporting with attributable evidence.
5. Community/leak material only when explicitly relevant and clearly labeled.

For leaks, separate artifact evidence from community interpretation and state uncertainty.
