---
paths:
  - "**/*.cs"
  - "**/*.csproj"
  - "**/*.sln"
---

# Backend rules

Follow the established .NET architecture and existing patterns.

Prefer:

- focused application services;
- clear domain/data boundaries;
- async I/O;
- cancellation propagation where established;
- typed configuration;
- efficient EF queries;
- structured logging without secrets;
- consistent ProblemDetails/error handling where established.

Avoid:

- business logic in controllers;
- N+1;
- swallowing provider failures;
- representing partial data as complete;
- mixing UTC, local dates, and market-session dates implicitly.

Inspect current code before changing background-worker, cache, quote-collection, or startup behavior.
