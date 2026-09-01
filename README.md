# Index Value Explorer

Index Value Explorer is a deterministic stock-screening application for finding **large-cap value opportunities inside major U.S. indexes**. A user selects an index such as QQQ, SPY, or DIA; the application applies hard eligibility filters, scores the surviving companies across value/quality/growth/risk factors, and presents a ranked research shortlist.

> **Research tool only. Not financial advice.** The score is a transparent screening heuristic, not a validated prediction of future returns.

## Product idea

Many index investors know *which basket* they like but still struggle with a second question:

> Which companies inside this index deserve deeper research right now?

Index Value Explorer narrows a known index universe using a repeatable workflow:

1. choose an index;
2. apply hard filters for size, quality, leverage, growth, and pullback range;
3. calculate a deterministic 0–100 score for survivors;
4. rank the candidates;
5. optionally use AI to **explain the deterministic result**, never to invent the score or financial data.

See [`docs/PRODUCT.md`](./docs/PRODUCT.md) for the product definition and success measures.

## Current methodology

The current default filter configuration includes:

- minimum market cap: **$25B**;
- pullback band: **8%–35%** from the 52-week high;
- positive revenue growth required;
- debt/equity cap: **2.5**;
- positive FCF is currently *not* a hard requirement;
- price above the 200-day moving average is currently *not* a hard requirement.

Survivors are scored using weighted factors including:

- forward and trailing P/E;
- EV/EBITDA;
- price/book;
- pullback depth;
- revenue and earnings growth;
- operating and gross margin;
- return on equity;
- free cash flow;
- debt/equity;
- beta.

Missing factors are excluded and remaining weight is redistributed rather than silently replaced with invented values.

The methodology is centralized in `src/services/config.ts` and related scoring/filter services. See [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md).

## AI boundary

The deterministic engine is the source of truth.

AI, when enabled, is used only to narrate what the structured output already shows. It must not:

- fabricate financial values;
- change a deterministic score;
- recommend buy/sell/hold;
- invent catalysts or price targets.

This boundary keeps the screening result reproducible and makes the explanatory layer replaceable.

## Technology

- React 19
- TypeScript
- TanStack Start / TanStack Router
- Vite
- Supabase
- TanStack Query
- Tailwind CSS
- Radix/shadcn UI components
- Recharts
- Cloudflare Vite integration

The service layer includes index-universe, market/fundamental-data, price-history, filtering, scoring, reporting, explanation, and symbol-normalization modules.

## Run locally

Prerequisites: a current Node.js runtime and npm (or Bun if intentionally using the committed Bun tooling).

```bash
npm install
npm run dev
```

Quality commands currently available:

```bash
npm run build
npm run lint
npm run format
npm run preview
```

A test directory exists, but `package.json` does not currently expose a test script. Establishing a repeatable test/CI gate is part of the engineering roadmap.

## Environment configuration

The application expects Supabase configuration such as:

- `VITE_SUPABASE_URL` / `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` / `SUPABASE_PUBLISHABLE_KEY`

Copy `.env.example` to a local `.env` and fill values outside source control.

### Security status

A real `.env` was previously tracked in this public repository. The current-tree file has now been removed without inspecting or exposing its contents; environment files are ignored and a sanitized `.env.example` is committed.

Historical exposure is **not yet cleared**: any previously committed secret should be rotated and Git history reviewed/re-written if required. See [`SECURITY.md`](./SECURITY.md).

## Repository structure

```text
src/routes/                  pages and API routes
src/components/              UI and product surfaces
src/services/                index/data/filter/scoring/reporting domain services
src/integrations/supabase/   Supabase client and generated types
supabase/                    Supabase project/configuration assets
tests/                       automated-test area
```

## Documentation

- [`docs/PRODUCT.md`](./docs/PRODUCT.md) — users, jobs, value proposition, metrics, non-goals
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system boundaries and engineering quality bar
- [`docs/METHODOLOGY.md`](./docs/METHODOLOGY.md) — filtering/scoring model and limitations
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — prioritized product/engineering work
- [`SECURITY.md`](./SECURITY.md) — environment, data-access, and public-repo safeguards
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — change and review standards

## Current status

**Functional research application / pre-production methodology.** The product has a clear deterministic screening workflow, but the score weights/bounds should be calibrated against point-in-time historical data before being described as predictive. Historical environment-file exposure, repeatable tests/CI, and data-provider production assumptions should also be resolved before broader production use.
