# Architecture — Index Value Explorer

## Overview

Index Value Explorer is a TypeScript web application that keeps screening logic in a service/domain layer rather than embedding investment logic directly in UI components.

```text
User
  ↓
TanStack Router / pages
  ↓
Screen configuration + result presentation
  ↓
Domain services
  ├── index universe
  ├── market/price data
  ├── fundamentals
  ├── hard filters
  ├── deterministic scoring
  ├── report building
  └── optional explanations
  ↓
External data / Supabase
```

## Technology

- React 19
- TypeScript
- TanStack Start / Router / Query
- Vite
- Supabase
- Tailwind CSS / Radix UI
- Recharts
- Cloudflare Vite integration

## Domain/service layer

`src/services/` contains the most important product logic. Observed modules include:

- `config.ts` — centralized thresholds, weights, and factor bounds;
- `filters.ts` — hard-screen behavior;
- `scoring.ts` / `scoringEngine.ts` — deterministic ranking;
- `fundamentalsProvider.ts` — fundamental data boundary;
- `finnhubCandles.ts` / `finnhubRateLimiter.ts` — price-history/provider handling;
- `yahooChart.ts` — alternate/supporting market-data source;
- `indexProvider.ts` / `liveIndexSources.ts` — index-universe data;
- `symbolNormalization.ts` — ticker normalization;
- `reportBuilder.ts` — result/report construction;
- `explanations.ts` — explanatory/narrative layer;
- `types.ts` — shared domain contracts.

This separation is a strength and should be preserved.

## Deterministic pipeline

```text
index constituents
      ↓
data acquisition / normalization
      ↓
hard filters
      ↓
reject with reasons OR continue
      ↓
factor normalization
      ↓
weighted score 0–100
      ↓
rank / top N
      ↓
optional narrative explanation
```

The narrative layer must not modify the deterministic ranking.

## Configuration ownership

Screening thresholds and scoring weights are centralized in `src/services/config.ts`. Avoid scattering product methodology constants across UI components or data-provider code.

Any material methodology change should:

1. update the configuration/domain logic;
2. update `docs/METHODOLOGY.md`;
3. add or update deterministic tests;
4. record a methodology/version identifier once versioning is implemented;
5. be evaluated against frozen point-in-time fixtures before being described as an improvement.

## Data-provider boundaries

Provider-specific behavior should remain behind service interfaces/functions so sources can be replaced as availability, licensing, rate limits, or quality changes.

Engineering expectations:

- preserve source timestamps/freshness where possible;
- distinguish missing data from zero;
- normalize units before scoring;
- isolate one-ticker/provider failures where a batch can continue safely;
- avoid silent fallback that materially changes methodology.

## Supabase boundary

The generated Supabase client reads browser/SSR configuration and persists browser auth sessions when running client-side.

Security rule: publishable browser keys are not authorization. Database policies must protect private/admin data. Never use privileged service-role credentials in the browser.

## API/routes

The repository contains page routes plus API route structure. API handlers should call domain services rather than duplicate screening/scoring rules.

If public APIs are expanded, add:

- input schemas;
- rate limiting where relevant;
- versioned response semantics for methodology-sensitive outputs;
- structured provider/error behavior;
- authentication for non-public/admin capabilities.

## Testing strategy

Highest-value tests:

1. hard-filter boundary cases;
2. score normalization/bounds;
3. missing-factor weight redistribution;
4. mode-specific weight behavior;
5. ranking determinism;
6. provider normalization and failure behavior;
7. report/result schema;
8. AI explanation cannot alter underlying score/data.

The repository has a `tests/` directory but currently lacks an exposed `test` package script. Add a repeatable CI test command before treating the engineering quality gate as complete.

## Observability

Production/research use should make it possible to answer:

- when was the underlying data last refreshed?
- which provider failed or returned incomplete coverage?
- how many constituents were rejected and for which reasons?
- what methodology/configuration produced a saved result?
- how long did each data/filter/score stage take?

Do not log provider secrets or unnecessary user data.

## Performance

Index screening is naturally batch-oriented. Prefer:

- caching slowly changing fundamentals/index membership;
- bounded concurrency;
- rate-limit-aware provider access;
- separating data refresh from repeated UI calculations where possible;
- cheap deterministic filtering before expensive enrichment.

## Failure modes

- stale index membership;
- partial market/fundamental data presented without warning;
- unit mismatches between providers;
- scoring changes without versioning;
- public client credentials confused with privileged credentials;
- explanation text overstating what deterministic evidence supports;
- provider throttling causing inconsistent coverage.

## Architecture decision rule

Keep screening logic deterministic, provider-independent, and separately testable from UI and narrative explanation. Add complexity only when it improves data quality, reliability, explainability, or measured product value.
