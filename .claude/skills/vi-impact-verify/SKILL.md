---
name: vi-impact-verify
description: Run risk-proportional validation for VI Impact changes. Use after implementation, content/data edits, visual work, deployment/config changes, or before reporting a meaningful task complete.
---

# VI Impact Verify

Treat the repository as source of truth. Validate the current diff with the minimum sufficient checks, then broaden only when scope/risk requires it.

## 1. Inspect state

Start with:

```powershell
git status --short --untracked-files=all
git diff --stat
git diff
```

Identify:

- files changed;
- pre-existing unrelated user changes;
- change class: backend, frontend, event/content, visual, SEO, dependency, infra/deploy;
- whether market/date methodology changed.

Do not stage, commit, push, reset, restore, clean, or discard work.

## 2. Focused validation

Use the project's real scripts/commands.

### Backend

Inspect solution/project files and run the smallest relevant build/test first.

Common baseline:

```powershell
dotnet build -c Release
dotnet test -c Release
```

Narrow tests first when the suite supports filtering.

### Frontend

Inspect `VIImpact.Web/package.json` and only run scripts that actually exist.

Common categories:

- focused tests;
- typecheck if defined;
- lint;
- production build.

### Event/content changes

For `gta-events.json` or equivalent:

- validate JSON/schema;
- check duplicate identifiers/slugs/events;
- verify event/source dates;
- verify classification;
- verify Summary/Description semantics if current schema uses them;
- build backend/frontend as needed;
- validate event-page/SEO generation if affected.

### Visual changes

Validate the affected matrix rather than one screenshot only:

- desktop dark/light;
- mobile dark/light;

as applicable.

Check:

- overflow;
- clipping;
- hero crop;
- theme;
- charts/tooltips;
- navigation/filters;
- accessibility/focus.

Do not broaden visual scope beyond the objective.

### Market/date changes

Add/run tests that cover relevant:

- trading vs calendar dates;
- weekends/holidays;
- after-hours timing;
- timezone behavior;
- TTWO/QQQ window consistency;
- missing/partial provider data.

### Deployment/config

If runtime/deployment changed, validate relevant build/config/health behavior.
Do not make unrelated production changes merely to make validation pass.

## 3. Failure handling

On failure:

1. identify root cause;
2. classify as change-caused, pre-existing, test problem, or environment limitation;
3. fix only authorized scope;
4. rerun the smallest failing check;
5. broaden after it passes.

Do not blindly rerun, weaken tests, hide warnings, or fabricate success.

## 4. Final checks

Always run:

```powershell
git diff --check
git status --short --untracked-files=all
```

Review for:

- unrelated files;
- secrets;
- local-only config;
- line-ending noise;
- accidental visual changes;
- unexpected generated artifacts.

## 5. Report

Use one status:

- `PASSED`
- `FAILED`
- `BLOCKED`
- `NOT EXECUTED`

Report only:

- checks run;
- results;
- relevant counts when actually observed;
- environment limitation/blocker;
- anything intentionally not run and why.

Never present a historical test count as a current result.
