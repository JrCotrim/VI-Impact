---
paths:
  - "**/*.cs"
  - "**/*stock*"
  - "**/*quote*"
  - "**/*market*"
  - "**/*return*"
---

# Market/data methodology

VI Impact shows association and observed returns; it does not infer causality from timing alone.

- Use cautious, descriptive language.
- Define the measurement window.
- Use the same window for TTWO and QQQ comparison.
- Distinguish calendar date from trading date.
- Handle weekends and market holidays.
- Preserve explicit timezone semantics.
- Consider whether an event happened before, during, or after the market session.
- Never accidentally use future quote data.
- Do not silently change existing methodology.

For market collection/provider code:

- preserve readiness/health semantics;
- avoid duplicate collection;
- preserve idempotency where applicable;
- handle provider rate limits/failures explicitly;
- never fabricate or silently substitute missing data;
- keep required production configuration fail-clear/fail-fast according to current architecture.

Twelve Data has historically been a critical external dependency; verify the current implementation/config before assuming details.
