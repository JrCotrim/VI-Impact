# VI Impact Design System

## 1. Purpose

This document describes the visual system already implemented in VI Impact.

It is a preservation and decision-making reference. It must not be used as justification to redesign the product, normalize it into a generic dashboard, or replace deliberate GTA VI / Vice City-inspired decisions with generic UI trends.

When an external audit tool reports a design issue, treat the finding as a hypothesis:

finding → inspect context → accept / reject / adapt → implement only after approval.

---

## 2. Visual Identity

VI Impact combines financial-data clarity with a visual language inspired by GTA VI and Vice City.

The interface should feel:

- deliberate rather than template-driven;
- editorial rather than generic SaaS;
- energetic without becoming visually noisy;
- data-focused without losing the GTA VI identity;
- compact but readable;
- consistent across day and night themes.

Pink, purple, cyan and related gradients are intentional parts of the identity when they support branding, event classification or hierarchy.

Their presence alone is not evidence of AI-generated design or a reason to remove them.

Avoid adding visual effects solely because they are fashionable.

---

## 3. Typography

### Families

Body:

`ArtDecoMedium`, with `Trebuchet MS`, `Segoe UI` and sans-serif fallbacks.

Display:

`ArtDecoCondensedBold`, with condensed system fallbacks.

The Art Deco typography is part of the product identity and should not be replaced with generic UI fonts without explicit approval.

### Current type scale

- Micro: `0.7rem`
- Caption: `0.72rem`
- Readable caption: `0.75rem`
- Label: `0.78rem`
- Small body: `0.78rem`
- Body: `0.82rem`
- Small data: `0.92rem`
- Section title: `1.08rem`

### Typography principles

Use the defined scale before introducing ad-hoc sizes.

Functional information such as:

- controls;
- financial values;
- event dates;
- categories;
- reaction labels;
- ranking labels;
- navigation actions;

must remain legible and should not become smaller merely to preserve density.

Very small text is acceptable only when genuinely secondary or decorative and when it does not carry important interaction or financial meaning.

Uppercase, condensed typography and letter spacing may be used deliberately for labels, dates and editorial hierarchy.

---

## 4. Color

### Brand colors

Day:

- Pink: `#e6007a`
- Purple: `#9d4edd`
- Cyan: `#00b4d8`
- Navy: `#0b132b`

Night:

- Pink: `#ff2a85`
- Purple: `#9d4edd`
- Cyan: `#00f2fe`
- Navy: `#0a0915`

### Semantic colors

Positive, negative, pending and muted states use dedicated semantic colors and must remain visually distinguishable from brand accents.

Financial movement colors communicate data and should not be repurposed decoratively when doing so could confuse meaning.

### Gradients

Gradients are allowed when they are intentional.

They currently serve purposes such as:

- GTA VI / Vice City atmosphere;
- hero and loading presentation;
- semantic event-category identification;
- selected or highlighted states.

Do not remove pink, purple or cyan gradients solely because generic design heuristics associate them with AI-generated interfaces.

Do not add gratuitous gradients where flat hierarchy, borders or spacing already communicate the structure.

---

## 5. Themes

VI Impact supports Day and Night themes.

The themes are not independent visual identities. They are two expressions of the same design system.

### Day

Uses light editorial surfaces, dark navy text and controlled branded accents.

### Night

Uses deep navy/purple surfaces, light typography and more luminous brand accents.

### Hero

The hero intentionally remains visually dark in both themes.

Hero controls use a dedicated token family and should not automatically inherit ordinary light-theme control styling.

Theme changes must preserve:

- hierarchy;
- contrast;
- event semantics;
- chart readability;
- control states;
- focus visibility.

---

## 6. Spacing

The interface is intentionally compact.

Existing recurring spacing values should be reused before introducing new arbitrary values.

Compact spacing is appropriate inside tightly related groups such as:

- badges;
- metadata;
- segmented controls;
- ranking rows;
- event metadata;
- financial labels.

More generous separation should distinguish major sections and unrelated information.

Repeated small spacing inside a single component is not automatically a design problem.

---

## 7. Borders, Radius and Elevation

Current shared geometry includes:

- Control radius: `9px`
- Small control radius: `7px`
- Chip radius: `7px`
- Pill radius: `999px`

Different component families are not required to use identical geometry.

For example:

- summary cards;
- event cards;
- market cards;
- editorial context cards;
- ranking controls;
- chart surfaces;

have different structural responsibilities.

Do not force all components into one generic card treatment.

Editorial hierarchy should prefer:

1. spacing;
2. typography;
3. dividers;
4. restrained surface changes;

before adding another nested card.

Shadows should communicate separation or depth. Avoid large decorative shadows without functional or compositional benefit.

---

## 8. Hero

The hero establishes the GTA VI / Vice City identity before the financial dashboard.

It combines:

- VI Impact branding;
- GTA VI × market positioning;
- day/night imagery;
- financial context;
- theme controls.

The hero is an approved visual element.

Do not flatten it into a generic dashboard header.

Do not remove its branded color language solely to satisfy generic UI heuristics.

Text contrast over imagery must still remain accessible.

---

## 9. Loading Splash

The existing VI Impact loading splash is an approved product element and must be preserved unless a task explicitly requests its redesign.

It includes:

- VI Impact logo;
- framed composition;
- dark Vice City-inspired background;
- pink, purple and cyan light treatment;
- progress indicator;
- subtle entry and breathing motion.

The splash is not a generic loading placeholder.

Performance improvements must not replace it with a generic spinner or plain loading message without explicit approval.

Its motion must respect `prefers-reduced-motion`.

---

## 10. Dashboard Structure

The main dashboard is composed of distinct layers:

1. Hero
2. Market summary
3. Main chart
4. GTA VI event timeline
5. Impact ranking

The relationship between the chart and events is central to the product.

Changes to layout must preserve:

- event ↔ chart synchronization;
- marker visibility;
- TTWO information;
- QQQ benchmark context;
- event chronology;
- ranking access.

Do not simplify the mobile layout by removing critical analytical information.

---

## 11. Chart

The chart is the primary financial visualization.

It must prioritize:

- TTWO price readability;
- QQQ comparison;
- event markers;
- tooltip clarity;
- period controls;
- interaction with the event timeline.

Decorative chart effects must never compromise data interpretation.

Focus states and keyboard accessibility must remain available.

Performance is part of the chart design requirement.

---

## 12. Events

Events are editorial and analytical objects, not generic content cards.

Each event may communicate:

- date;
- category;
- official / non-official nature;
- title;
- summary;
- impact status;
- observed market reaction;
- source;
- detailed analysis.

### Category identity

Event categories use intentional color and gradient differentiation.

Examples include:

- Development
- Announcement
- Trailer
- Leak
- Delay
- Financial
- Distribution
- Release Window
- Pre-order
- Corporate
- Market Analysis
- Labor / Legal
- Pricing
- Launch

These colors are semantic navigation aids.

Do not collapse all event categories into a single generic accent.

### Chronology

Date headings are part of the editorial hierarchy and should remain visually distinct from ordinary metadata.

Multiple independent events on the same date are supported.

---

## 13. Impact Ranking

The ranking is a secondary analytical tool.

It can be collapsed or expanded and intentionally behaves differently across wide and stacked layouts.

Its vertical launcher on wide screens is an approved interaction pattern.

Do not replace it merely because a generic heuristic considers side-accent or side-tab patterns undesirable.

Ranking values describe observed movement and must not imply unsupported causality.

---

## 14. Full Event Analysis

The full event view uses a denser editorial and analytical structure.

It includes:

- event identity;
- editorial priority;
- event-centered TTWO chart;
- market metrics;
- TTWO × QQQ benchmark;
- contextual description;
- source;
- market interpretation;
- event facts;
- non-causality disclaimer.

Different cards in this view have different responsibilities and do not need to be visually identical.

The visual hierarchy should help distinguish:

- facts;
- measured market data;
- editorial classification;
- explanatory interpretation.

---

## 15. Controls and Interaction

Controls are neutral by default and branded when selected.

Shared control states include:

- default;
- hover;
- active;
- focus-visible;
- disabled.

Focus visibility is mandatory.

The global focus system uses a visible branded outline and must not be removed unless replaced by an equally clear alternative.

On mobile, important interactive controls should maintain appropriate touch targets.

---

## 16. Motion

Motion must be subtle, fast and functional.

Existing control motion is approximately:

- Fast: `170ms`
- Control: `150ms`

Motion may communicate:

- selection;
- feedback;
- loading;
- marker focus;
- state transition.

Avoid decorative animation without user benefit.

All motion must respect `prefers-reduced-motion`.

The project already disables or minimizes:

- transitions;
- animations;
- smooth scrolling;
- selected-marker animation;
- loading animation;

when reduced motion is requested.

Preserve this behavior.

---

## 17. Accessibility

Accessibility is part of the visual system, not a post-processing step.

Preserve:

- visible keyboard focus;
- semantic HTML where practical;
- accessible names;
- appropriate interactive roles;
- readable contrast;
- reduced-motion support;
- mobile touch targets;
- non-color-only status communication where needed.

Functional microtext should be reviewed carefully when it drops below the shared type scale.

Automated accessibility findings are evidence to investigate, not permission to redesign approved components.

---

## 18. Responsive Behavior

VI Impact has a deliberately adaptive layout rather than one uniform fluid composition.

Important responsive thresholds currently include approximately:

- Wide desktop: `1451px+`
- Desktop: `1181–1450px`
- Compact desktop / tablet: `901–1180px`
- Mobile: `700px and below`
- Small mobile: `430–460px and below`
- Very small mobile: `360px and below`

Additional component-specific thresholds exist at:

- `1280px`
- `1080px`
- `900px`
- `820px`
- `620px`
- `520px`

Some desktop layouts also account for viewport height around `780px`.

These breakpoints reflect accumulated component-specific behavior.

Do not consolidate, rename or remove them merely for aesthetic code cleanup. Any responsive refactor requires separate validation on real desktop and mobile layouts.

Mobile adaptation must preserve functionality rather than remove it.

---

## 19. Patterns to Preserve

Preserve unless a specific approved task says otherwise:

- GTA VI / Vice City visual identity;
- Art Deco typography;
- pink / purple / cyan brand language;
- semantic event-category colors;
- day and night themes;
- dark hero treatment;
- original VI Impact loading splash;
- chart ↔ event synchronization;
- collapsed and expanded ranking behavior;
- event category icons;
- editorial timeline;
- distinct financial and editorial hierarchy;
- accessible focus states;
- reduced-motion support;
- compact information density.

---

## 20. Anti-patterns

Avoid:

- generic SaaS dashboard styling;
- gratuitous glassmorphism;
- excessive glow;
- decorative gradients without purpose;
- excessive rounded containers;
- unnecessary nested cards;
- large decorative shadows;
- replacing project typography with generic UI fonts;
- hiding important information to simplify mobile layouts;
- adding animation without interaction benefit;
- reducing contrast for visual subtlety;
- functional text that becomes unreadably small;
- introducing visual trends solely because an external audit recommends them;
- treating AI-slop detectors as an authority over the existing identity;
- visual refactors unrelated to the current task.

---

## 21. External Audit Policy

Tools such as Impeccable are advisory.

Their findings follow this workflow:

**finding → inspect project context → accept / reject / adapt → approve → implement → validate**

A finding is not automatically a bug.

In particular, generic warnings involving:

- pink;
- purple;
- cyan;
- gradients;
- side accents;
- compact spacing;
- card geometry;

must be evaluated against this design system before any modification.

Accessibility, contrast, overflow and functional legibility findings should receive higher scrutiny because they can represent measurable usability defects.

Any accepted visual change must be validated in:

- Day theme;
- Night theme;
- desktop;
- mobile;
- keyboard navigation when relevant;
- reduced-motion mode when relevant.

Performance regressions are not acceptable as the cost of cosmetic refinement.
