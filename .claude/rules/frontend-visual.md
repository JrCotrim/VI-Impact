---
paths:
  - "VIImpact.Web/**/*.{ts,tsx,js,jsx,css,scss,html}"
---

# Frontend and approved visual state

- Preserve strict typing and existing React/component patterns.
- Reuse established tokens/components.
- Avoid unnecessary `any`, duplicate fetches, stale effects, and render churn.
- Clean listeners/timers/resources.
- Preserve accessibility, keyboard/focus behavior, and responsive behavior.
- Diagnose the actual layout constraint before adding CSS hacks.

For visual work, define:

- `LOCKED`
- `EDITABLE`
- `OUT OF SCOPE`

Principle: refine, do not reinvent.

Validate relevant combinations of:

- desktop dark;
- desktop light;
- mobile dark;
- mobile light.

Check horizontal overflow, clipped labels, chart responsiveness, tooltips, hero crop, navigation, filters, quote bar, touch targets, and theme persistence when affected.

Automated design findings are hypotheses. Reproduce them before editing.

The project has an approved polished baseline influenced by Apple-style restraint/Liquid-Glass ideas, but do not turn every surface into glass or replace approved official imagery.
