---
name: "VI Impact"
description: "Vice City-inspired financial editorial interface connecting GTA VI events with TTWO market behavior."

colors:
  day-page: "#f8f9fa"
  day-surface: "#ffffff"
  day-card: "#ffffff"
  day-border: "rgba(11, 19, 43, 0.14)"
  day-text-primary: "#0b132b"
  day-text-secondary: "#48516b"
  day-text-muted: "#687187"

  day-brand-pink: "#e6007a"
  brand-purple: "#9d4edd"
  day-brand-cyan: "#00b4d8"
  day-brand-navy: "#0b132b"

  day-positive: "#079669"
  day-negative: "#dc2626"
  day-pending: "#956a19"
  day-pending-table: "#956a19"
  day-pending-muted: "#786039"
  day-pending-border: "rgba(181, 126, 24, 0.28)"
  day-pending-surface-start: "rgba(255, 250, 237, 0.98)"
  day-pending-surface-end: "rgba(255, 255, 255, 0.94)"
  day-date-text: "#526078"

  day-control-text: "#48516b"
  day-control-text-strong: "#11182b"
  day-control-border: "rgba(63, 72, 101, 0.18)"
  day-control-border-hover: "rgba(230, 0, 122, 0.34)"
  day-control-background: "rgba(255, 255, 255, 0.82)"
  day-control-background-hover: "#ffffff"
  day-control-active-text: "#b30d65"
  day-control-active-border: "rgba(230, 0, 122, 0.38)"
  day-control-active-background: "rgba(230, 0, 122, 0.075)"
  day-control-focus-ring: "rgba(230, 0, 122, 0.56)"
  day-control-accent-text: "#b30d65"
  day-control-accent-border: "rgba(230, 0, 122, 0.28)"
  day-control-accent-background: "rgba(230, 0, 122, 0.065)"
  day-control-accent-background-hover: "rgba(230, 0, 122, 0.11)"

  hero-control-text: "#ffe0ef"
  hero-control-text-hover: "#ffffff"
  hero-control-border: "rgba(255, 111, 187, 0.28)"
  hero-control-border-hover: "rgba(255, 111, 187, 0.56)"
  hero-control-background: "rgba(8, 13, 30, 0.56)"
  hero-control-background-hover: "rgba(25, 19, 47, 0.76)"
  hero-control-focus: "rgba(255, 132, 197, 0.86)"
  hero-control-shadow-color: "rgba(0, 0, 0, 0.1)"

  day-editorial-divider: "rgba(11, 19, 43, 0.14)"
  day-editorial-divider-strong: "rgba(11, 19, 43, 0.22)"
  day-editorial-insight-accent: "#009ec1"

  night-page: "#0a0915"
  night-surface: "#15132b"
  night-card: "#15132b"
  night-border: "rgba(157, 78, 221, 0.28)"
  night-text-primary: "#f8f7ff"
  night-text-secondary: "#c8c4dc"
  night-text-muted: "#918ca8"

  night-brand-pink: "#ff2a85"
  night-brand-purple: "#9d4edd"
  night-brand-cyan: "#00f2fe"
  night-brand-navy: "#0a0915"

  night-positive: "#38df9d"
  night-negative: "#ff4d6d"
  night-pending: "#f0c46d"
  night-pending-table: "#d8b66f"
  night-pending-muted: "#cbb98f"
  night-pending-border: "rgba(240, 190, 92, 0.24)"
  night-pending-surface-start: "rgba(25, 27, 39, 0.98)"
  night-pending-surface-end: "rgba(17, 21, 35, 0.98)"
  night-date-text: "#b4bfd3"

  night-control-text: "#b8bfd2"
  night-control-text-strong: "#ffffff"
  night-control-border: "rgba(132, 153, 199, 0.22)"
  night-control-border-hover: "rgba(255, 82, 170, 0.42)"
  night-control-background: "rgba(7, 16, 34, 0.5)"
  night-control-background-hover: "rgba(255, 255, 255, 0.055)"
  night-control-active-text: "#ff82c2"
  night-control-active-border: "rgba(255, 73, 166, 0.44)"
  night-control-active-background: "rgba(242, 49, 147, 0.13)"
  night-control-focus-ring: "rgba(255, 105, 184, 0.72)"
  night-control-accent-text: "#ff83c2"
  night-control-accent-border: "rgba(255, 74, 166, 0.34)"
  night-control-accent-background: "rgba(255, 54, 154, 0.09)"
  night-control-accent-background-hover: "rgba(255, 54, 154, 0.16)"

  night-editorial-divider: "rgba(157, 78, 221, 0.22)"
  night-editorial-divider-strong: "rgba(157, 78, 221, 0.34)"
  night-editorial-insight-accent: "#31d7ee"

typography:
  body:
    fontFamily: "ArtDecoMedium, Trebuchet MS, Segoe UI, sans-serif"
    fontSize: "0.82rem"
    lineHeight: 1.5

  display:
    fontFamily: "ArtDecoCondensedBold, Arial Narrow, Franklin Gothic Condensed, sans-serif"

  micro:
    fontSize: "0.7rem"

  caption:
    fontSize: "0.72rem"

  caption-readable:
    fontSize: "0.75rem"

  label:
    fontSize: "0.78rem"
    fontWeight: 800
    letterSpacing: "0.06em"

  body-sm:
    fontSize: "0.78rem"

  data-sm:
    fontSize: "0.92rem"
    letterSpacing: "-0.03em"

  section-title:
    fontSize: "1.08rem"
    fontWeight: 850

rounded:
  control: "9px"
  control-sm: "7px"
  chip: "7px"
  pill: "999px"

spacing:
  space-2: "8px"
---
# VI Impact Design System

## Overview

VI Impact is a financial and editorial interface that relates public GTA VI events to the behavior of Take-Two Interactive (TTWO), using QQQ as a market reference.

Creative direction: **Vice City Financial Editorial**.

The product combines financial-data clarity with a deliberate GTA VI / Vice City-inspired identity. It should feel editorial, analytical, energetic and distinctive rather than like a generic SaaS dashboard.

The interface is intentionally information-dense but must remain readable. Financial interpretation and event chronology take precedence over decorative styling.

The main experience is composed of:

- a theme-responsive branded hero (pastel daylight in Day, neon night in Night);
- market-summary information;
- the primary TTWO × QQQ chart;
- the GTA VI event timeline;
- the impact ranking;
- full editorial and market analysis for individual events.

The relationship between events and the chart is a core product interaction and must be preserved.

Day and Night are two expressions of the same design system. The hero follows the theme: a pastel Vice City daylight scene in Day and a deep neon night scene in Night. Both retain a controlled dark readability veil behind hero copy rather than flattening the image into a dark header.

The original VI Impact loading splash is an approved product surface. It must not be replaced with a generic spinner or plain loading state unless explicitly requested.

The interface is responsive through component-specific breakpoints. Important layout ranges include wide desktop at 1451px+, desktop around 1181–1450px, compact desktop/tablet around 901–1180px, mobile at 700px and below, and small-device adjustments below approximately 460px and 360px. Existing breakpoint behavior must not be consolidated merely for code cleanliness.

Motion should be subtle, functional and fast. Existing interactive motion is approximately 150–170ms. All animation, transitions and smooth scrolling must respect `prefers-reduced-motion`.

Accessibility, responsiveness and performance are design requirements, not post-processing concerns.

For more detailed human-facing rationale and preservation rules, see `docs/VI-IMPACT-DESIGN-CONTRACT.md`.

## Colors

The palette deliberately uses pink, purple, cyan and deep navy as part of the GTA VI / Vice City identity.

Their presence alone is not an AI-design anti-pattern.

### Day foundation

- Page: `#f8f9fa`
- Surface: `#ffffff`
- Card: `#ffffff`
- Primary text: `#0b132b`
- Secondary text: `#48516b`
- Muted text: `#687187`
- Border: `rgba(11, 19, 43, 0.14)`

### Day brand

- Pink: `#e6007a`
- Purple: `#9d4edd`
- Cyan: `#00b4d8`
- Navy: `#0b132b`

### Night foundation

- Page: `#0a0915`
- Surface: `#15132b`
- Card: `#15132b`
- Primary text: `#f8f7ff`
- Secondary text: `#c8c4dc`
- Muted text: `#918ca8`
- Border: `rgba(157, 78, 221, 0.28)`

### Night brand

- Pink: `#ff2a85`
- Purple: `#9d4edd`
- Cyan: `#00f2fe`
- Navy: `#0a0915`

### Semantic market colors

Day:

- Positive: `#079669`
- Negative: `#dc2626`
- Pending: `#956a19`

Night:

- Positive: `#38df9d`
- Negative: `#ff4d6d`
- Pending: `#f0c46d`

Positive, negative and pending colors communicate financial state and must remain distinguishable from decorative brand accents.

### Controls

Controls are neutral by default and use branded pink accents for selected, focused or emphasized states.

Day active control text: `#b30d65`.

Night active control text: `#ff82c2`.

Focus rings must remain clearly visible.

### Editorial accents

Day editorial insight accent: `#009ec1`.

Night editorial insight accent: `#31d7ee`.

Editorial hierarchy should generally use typography, spacing and dividers before adding additional surfaces.

### Event categories

Event categories intentionally use distinct color and gradient treatments. Categories include development, announcement, game information, trailer, leak, delay, security, financial, distribution, release window, pre-order, corporate, market analysis, labor/legal, pricing and launch.

These category colors are semantic navigation aids. Do not normalize them into one generic accent.

Gradients are allowed when they support Vice City atmosphere, event classification, hero/loading presentation or meaningful state hierarchy. Gratuitous gradients without a concrete role should not be added.

## Typography

### Families

Body:

`ArtDecoMedium`, `'Trebuchet MS'`, `'Segoe UI'`, sans-serif.

Display:

`ArtDecoCondensedBold`, `'Arial Narrow'`, `'Franklin Gothic Condensed'`, sans-serif.

The Art Deco families are part of the identity and should not be replaced with generic UI fonts without explicit approval.

### Canonical scale

- Micro: `0.7rem`
- Caption: `0.72rem`
- Readable caption: `0.75rem`
- Label: `0.78rem`
- Small body: `0.78rem`
- Body: `0.82rem`
- Small data: `0.92rem`
- Section title: `1.08rem`

### Weights and rhythm

- Label weight: `800`
- Heading weight: `850`
- Eyebrow letter spacing: `0.12em`
- Label letter spacing: `0.06em`
- Data letter spacing: `-0.03em`
- Tight line height: `1.12`
- Compact line height: `1.35`
- Readable line height: `1.5`

Use the shared scale before introducing ad-hoc micro sizes.

Uppercase, condensed type and deliberate letter spacing are valid for dates, labels, eyebrows and editorial hierarchy.

Functional information such as financial values, controls, event dates, categories, reaction labels and ranking actions must remain legible. Density is not sufficient justification for making functional text difficult to read.

Very small type may be used for genuinely secondary or decorative metadata, but not as an escape hatch for important content.

## Elevation

VI Impact uses restrained elevation.

Hierarchy should normally be established in this order:

1. typography;
2. spacing;
3. dividers;
4. restrained surface changes;
5. shadow or glow only when additional separation is useful.

Large generic dashboard shadows are not part of the design direction.

Glow may be used selectively where it reinforces the Vice City identity, loading presentation, chart/event focus or a meaningful interactive state. Avoid decorative glow without purpose.

Hero controls currently use a subtle shadow:

`0 8px 24px rgba(0, 0, 0, 0.1)`.

Editorial dividers use:

- Day: `rgba(11, 19, 43, 0.14)`
- Day strong: `rgba(11, 19, 43, 0.22)`
- Night: `rgba(157, 78, 221, 0.22)`
- Night strong: `rgba(157, 78, 221, 0.34)`

Shared geometry:

- Control radius: `9px`
- Small control radius: `7px`
- Chip radius: `7px`
- Pill radius: `999px`

Different component families do not need identical radii or elevation. Do not force all surfaces into a single generic card style.

Side accents and borders may be legitimate when they communicate editorial hierarchy, category, state or an intentionally approved component treatment.

## Components

### Hero

The hero is a primary identity surface, not a generic dashboard header.

Day uses the approved pastel Vice City skyline and Night uses the approved neon nighttime skyline. Their lower palette should transition into the page atmosphere so the hero does not read as a detached banner. A directional readability veil is allowed behind hero copy, but it must not erase the character of either image.

Text contrast over hero imagery must remain accessible.

### Loading splash

The existing splash is approved and should be preserved.

It includes the VI Impact logo, framed composition, dark background, controlled pink/purple/cyan lighting, progress feedback and subtle motion.

It must respect `prefers-reduced-motion`.

### Market summary

Summary cards provide fast financial context before the main analytical surface.

They may be more compact than ordinary editorial content but must preserve readable financial values and labels.

### Main chart

The chart is the primary financial visualization.

It must preserve:

- TTWO readability;
- QQQ comparison;
- event markers;
- tooltips;
- period controls;
- chart ↔ event synchronization;
- keyboard focus;
- responsive behavior.

Decorative styling must never compromise data interpretation.

### Event timeline

Events are editorial and analytical objects rather than generic cards.

They can communicate date, category, source nature, title, summary, impact status, observed reaction and access to detailed analysis.

Date headings are part of the chronology hierarchy.

Multiple independent events may exist on the same date.

Timeline mode controls intentionally use a tab-like lower indicator. A child sitting against the bottom divider is not automatically a padding defect.

### Event badges

Badges use category-specific color identity.

Their geometry should remain compact, but functional category text must remain legible.

### Impact reaction

Positive, negative, neutral and pending reaction states communicate financial information.

Reaction label and percentage are functional content, not decorative microcopy.

### Impact ranking

The ranking is a secondary analytical tool and can be collapsed or expanded.

On wide desktop, its vertical launcher is an approved interaction pattern.

Do not replace the launcher merely because a generic heuristic identifies side-tab patterns as undesirable.

Ranking values describe observed movement, not proven causality.

### Full event analysis

The full event page deliberately mixes several component families because they have different responsibilities:

- editorial-priority metric;
- event-centered TTWO chart;
- market metric cards;
- TTWO × QQQ benchmark;
- context card;
- source;
- market interpretation;
- facts;
- non-causality disclaimer.

These surfaces do not need to be visually identical.

### Controls

Controls support default, hover, active, focus-visible and disabled states.

Shared heights include approximately:

- Compact: `30px`
- Default: `36px`

Important mobile controls should preserve suitable touch targets, typically around `44px` where implemented.

Focus-visible treatment is mandatory and uses the branded focus-ring system.

### Responsive behavior

Mobile adaptations must preserve functionality rather than amputate analytical features.

Chart, events, ranking and full-event information remain available on smaller screens.

Existing component-specific breakpoints are deliberate implementation evidence and must not be removed solely to simplify the stylesheet.

## Do's and Don'ts

### Do

- Preserve the GTA VI / Vice City identity.
- Preserve Art Deco typography.
- Use pink, purple and cyan deliberately.
- Preserve semantic event-category colors.
- Preserve distinct Day and Night treatments.
- Keep the hero theme-responsive: approved daylight imagery in Day and approved night imagery in Night.
- Preserve the original loading splash.
- Preserve chart ↔ event synchronization.
- Preserve event chronology.
- Preserve collapsed and expanded ranking behavior.
- Preserve event category icons.
- Prefer typography, spacing and dividers before creating another nested surface.
- Use gradients when they carry brand, category or state meaning.
- Keep controls compact but readable.
- Maintain visible keyboard focus.
- Maintain sufficient text contrast.
- Respect `prefers-reduced-motion`.
- Validate meaningful visual changes in Day, Night, desktop and mobile.
- Treat performance as part of visual quality.
- Treat external design-tool findings as hypotheses requiring project-context review.

### Don't

- Do not normalize VI Impact into a generic SaaS dashboard.
- Do not remove pink, purple, cyan or gradients merely because an AI-slop heuristic flags them.
- Do not add gratuitous glassmorphism; Liquid Glass is reserved for primary/secondary material hierarchy where the atmospheric background can meaningfully show through.
- Do not add excessive glow.
- Do not add decorative gradients without purpose.
- Do not create unnecessary nested cards.
- Do not force every component to use identical radius or elevation.
- Do not add large decorative shadows without compositional benefit.
- Do not replace the project typography with generic UI fonts.
- Do not hide important chart, event or ranking information to simplify mobile layouts.
- Do not add motion without interaction or state value.
- Do not weaken contrast for visual subtlety.
- Do not shrink important functional text merely to maintain density.
- Do not consolidate responsive breakpoints as unrelated cleanup.
- Do not redesign approved surfaces as a side effect of an audit.
- Do not treat automated detector output as authority over the implemented product.

External audit workflow:

**finding → inspect project context → accept / reject / adapt → approve → implement → validate**
