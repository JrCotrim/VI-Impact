# VI Impact — Claude Code project instructions

VI Impact is an educational/portfolio dashboard that relates public GTA VI events to observed Take-Two Interactive (`TTWO`) market movements and compares them with `QQQ`.

## Source of truth

- The current repository is authoritative for structure, versions, commands, data schema, deployment configuration, and implementation state.
- Inspect existing code/data before introducing a new pattern.
- Historical context is context only; verify the checkout before acting on old task numbers, counts, commits, or UI decisions.
- The legacy `.agents/` directory remains during migration for rollback/Codex compatibility. Do not edit or delete it unless the user asks.

## Communication

- Speak to the user in Brazilian Portuguese.
- Keep code, identifiers, commands, APIs, filenames, and commit messages in English when appropriate.
- Be concise, concrete, and technical.
- Explain what changed, why, where, and how it was validated.
- Separate verified facts from inference.

## Default workflow

For non-trivial work:

1. Understand the objective.
2. Inspect `git status --short --untracked-files=all`.
3. Inspect targeted files and current implementation/data first.
4. Define `LOCKED`, `EDITABLE`, and `OUT OF SCOPE` for visual work.
5. Make the smallest complete change.
6. Run focused validation first.
7. Broaden validation when scope/risk requires it.
8. Inspect the final diff and run `git diff --check`.
9. Report results and unresolved limitations concisely.

## Scope discipline

- Modify only what the objective requires.
- Preserve existing behavior and approved visual state unless the task intentionally changes them.
- Do not perform opportunistic redesigns, framework migrations, broad dependency upgrades, or unrelated cleanup.
- Prefer existing abstractions, scripts, tests, components, and tokens.
- Report unrelated findings separately.

## Editorial and market-data invariants

- Temporal association is not proof of financial causality.
- Never state that a GTA VI event caused a TTWO move unless evidence genuinely establishes causation.
- Prefer wording such as “coincided with”, “was followed by”, or “over the measured window”.
- Use the same defined measurement window when comparing TTWO and QQQ.
- Distinguish calendar dates, trading dates, market holidays, time zones, and after-hours timing.
- Never fabricate market data when an external provider fails.
- Distinguish official announcements, company statements, reputable reporting, rumors, leaks, and speculation.
- Never promote a rumor or leak to official status.
- Distinguish the date an event happened from the date an article was published.

Detailed file-scoped rules under `.claude/rules/` load automatically when relevant files are read.

## Visual preservation

Use:

- `LOCKED`: approved; do not alter.
- `EDITABLE`: may change for the current objective.
- `OUT OF SCOPE`: leave untouched.

Principle: refine, do not reinvent.

For relevant UI work validate the required matrix, typically:

- desktop dark;
- desktop light;
- mobile dark;
- mobile light.

Automated design findings are hypotheses, not implementation orders. Reproduce first, then make the smallest fix.

## Event catalog

The known primary catalog is:

`VIImpact.Infrastructure/Data/Seed/gta-events.json`

Before adding an event:

1. inspect current entries;
2. avoid duplicates;
3. verify event date and source;
4. classify official/report/rumor/leak correctly;
5. preserve schema and existing ordering conventions;
6. preserve the `Summary` vs `Description` distinction if it still exists;
7. avoid causal financial claims;
8. validate generated SEO/event pages when applicable.

## Special `att` protocol

When the user sends exactly `att` in the VI Impact update context:

- research current public GTA VI developments;
- return only new events that could reasonably merit inclusion in VI Impact;
- avoid duplicates already present in the catalog/site;
- clearly classify official vs rumor vs leak;
- give only a short relevance justification;
- if there are no relevant candidates, reply exactly: `0 eventos`.

This is a candidate-event workflow, not a general GTA VI news digest.

## Validation

Use repository scripts/commands as the source of truth.

Typical checks historically include:

- backend build/tests;
- frontend lint/tests/build;
- `git diff --check`;
- production smoke/health checks when deployment/runtime changes.

Do not report historical test counts as current results.

Use `/vi-impact-verify` after meaningful implementation work.

## Git safety

Treat the working tree as user-owned.

Unless explicitly requested, do not:

- stage;
- commit;
- push;
- merge;
- rebase;
- amend;
- create/delete branches;
- modify remotes;
- reset;
- clean;
- restore;
- destructively checkout;
- discard work.

Never use destructive Git operations without explicit authorization.

If a commit is requested, inspect the diff, validate first, stage only intended files, and keep the commit focused.
Do not push unless explicitly requested.

## Claude Code autonomy

Claude Code may implement directly in this repository, but keep the user's established control model:

- small tasks;
- explicit scope;
- minimal diffs;
- validation after meaningful changes;
- no silent staging/commit/push;
- no broad autonomous rewrite.

Do not delegate to another autonomous coding agent unless the user explicitly requests it.

## Skills

Important project skills:

- `/vi-impact-verify` — risk-proportional project validation.
- `/vi-impact-project-context` — load dated/historical project context when continuing prior work.
- `/redesign-existing-projects` — redesign existing UI when the user explicitly opens that scope.
- `/impeccable` — visual design workflow when relevant.
- `/apple-design` — Apple/fluid-interface design guidance when relevant.
- `/vercel-react-best-practices` — React performance guidance.
- `/web-design-guidelines` — UI/accessibility review.
- `/ponytail` — minimal/YAGNI coding mode when relevant.
- `/caveman` — terse mode when explicitly requested.

## Completion

Report:

- objective completed;
- important files changed;
- validation run and result;
- unresolved blockers/risks/environment limitations.

Do not dump full diffs, full files, or long logs unless needed.
