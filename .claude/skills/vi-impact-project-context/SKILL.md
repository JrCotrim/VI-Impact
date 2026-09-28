---
name: vi-impact-project-context
description: Load the consolidated historical/project context for VI Impact. Use when the user asks to continue prior VI Impact work, references old task numbers, approved visual states, event updates, deployment history, SEO counts, or previous implementation decisions.
---

# VI Impact project context

Everything below is dated context. Inspect the current repository and current public sources before treating it as present fact.

## Product

VI Impact is an educational/portfolio dashboard correlating public GTA VI events with observed TTWO market behavior and comparing QQQ as a benchmark.

Core product ideas have included:

- TTWO historical data;
- QQQ comparison;
- GTA VI events aligned with charts/timeline;
- filters/sorting/categories;
- source traceability;
- analysis pages;
- dark/light themes;
- event-specific SEO pages;
- quote/market UI.

The editorial principle has consistently been to show observed association without asserting unsupported causality.

## Repository/deployment

Known repository:

`H:\source\repos\VI-Impact`

Known frontend:

`H:\source\repos\VI-Impact\VIImpact.Web`

Known production branch: `master`
Known GitHub repository: `JrCotrim/VI-Impact`

Known frontend production URL:

`https://vi-impact.vercel.app`

Known API host historically:

`https://vi-impact-api.onrender.com`

Known readiness route historically:

`/health/ready`

Production infrastructure has included Vercel, Render, and Neon/PostgreSQL.

Verify current deployment/configuration before operational conclusions.

## Stack history

Backend has included:

- .NET / ASP.NET Core
- EF Core
- Npgsql
- PostgreSQL
- xUnit
- background workers
- health checks
- ProblemDetails / trace IDs
- CORS
- caching/resiliency patterns as implemented

Known solution areas:

- `VIImpact.Domain`
- `VIImpact.Application`
- `VIImpact.Infrastructure`
- `VIImpact.API`
- `VIImpact.Tests`

Frontend has included React, TypeScript, Vite, and Recharts.

Market data provider: Twelve Data.

Infra has included Docker Compose and GitHub Actions.

## Event model history

Primary known seed:

`VIImpact.Infrastructure/Data/Seed/gta-events.json`

A `Summary` / `Description` split was introduced so timeline/list content could stay concise while detail pages retained fuller analysis.

Historical migration:

`20260821181100_AddGtaEventSummary`

A previous frontend content fallback was removed after editorial content moved into the seed/catalog.

Always inspect the current schema before editing.

## `att` protocol

When the user sends exactly `att` in the update context:

- research new relevant GTA VI developments;
- list only candidate events worth possible inclusion;
- avoid duplicates;
- distinguish official/rumor/leak;
- include a short relevance reason;
- if none: `0 eventos`.

Do not turn this into a generic news roundup.

## Visual history

The project went through a deliberate visual refinement phase influenced by Apple/Liquid-Glass restraint while preserving its own GTA VI identity.

Historical work included:

- official GTA VI banners;
- Dark/Light x Desktop/Mobile asset matrices;
- carefully tuned hero heights/crops/fades;
- theme control refinements;
- mobile work;
- visual audit passes.

Around late August 2026, the main dashboard/analysis baseline was treated as LOCKED.

A mobile theme-toggle pattern was approved around:

`[icon][Noite/Claro][switch]`

There were deliberately tiny fixes, including tooltip font-family consistency, reinforcing minimal-diff visual work.

Automated audit findings were triaged; false positives and low-value redesign suggestions were rejected.

Always verify the current UI and current task scope before using these historical approvals.

## SEO history

Event SEO/page counts changed over time.

Historical references included roughly:

- 44 event pages / sitemap around 45 URLs in one phase;
- later references around 48 pages.

Never hardcode these counts as current. Re-run the current generation/build.

## Test history

Frontend and backend suites existed.

A historical frontend snapshot reported 23/23 tests.
Backend counts changed over milestones, including references in roughly the 60–70+ range.

Never cite these as current results without running the present suite.

## Stock collection

A known background worker:

`StockQuoteCollectionWorker`

Market-data code has depended on external-provider reliability and persistence.

Preserve health/readiness meaning, avoid duplicate collection, and verify provider/date/timezone assumptions before changing it.

## Production context

Historical Vercel setup included:

- repo `JrCotrim/VI-Impact`;
- branch `master`;
- root `VIImpact.Web`;
- `npm run build`;
- output `dist`;
- framework `Other`;
- `VITE_API_BASE_URL`;
- Node 24.x at one point.

Historical API smoke routes included:

- `/health/live`
- `/health/ready`
- `/api/gtaevents`

Treat all of this as old configuration until checked.

## Task history

A historical milestone had Tasks 1–19 complete, Task 20 associated with performance, and later Task 21 with visual/audit work.

Task IDs are historical anchors, not a live backlog.

## Agent workflow history

The VI Impact Codex-era repo had `.agents/skills/` but no root `AGENTS.md` in the migration source.

The user previously preferred manual, tightly controlled work on VI Impact rather than broad autonomous delegation.

Claude Code is now the direct coding agent, but preserve the intent:

- small tasks;
- explicit scope;
- minimal diffs;
- validation;
- no silent Git mutations;
- approved visual state preservation.

## Rule for using this context

Use historical context to reconstruct intent and avoid regressions.

Never use it to:

- reapply old commits/fixes;
- assume task IDs are still open;
- restore older UI over newer approved state;
- use old port/deploy/test-count assumptions as current fact;
- add an event without checking the current catalog;
- rely on old news instead of current public verification.
