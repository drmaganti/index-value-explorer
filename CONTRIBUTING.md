# Contributing

## Local development

```bash
npm install
npm run dev
```

Before merging a meaningful change, run the available quality checks:

```bash
npm run build
npm run lint
```

A repeatable `test` script/CI gate is a current roadmap item. Methodology changes should not rely on manual UI review alone.

## Engineering rules

- Keep filtering/scoring logic in the domain/service layer, not page components.
- Keep methodology constants centralized.
- Treat missing values explicitly; do not silently substitute zero or invented data.
- Keep provider-specific normalization separate from scoring.
- AI explanation must not alter deterministic values or ranking.
- Do not expose privileged credentials to browser code.

## Methodology changes

Any change to thresholds, weights, bounds, factors, or missing-data behavior should include:

1. rationale;
2. exact methodology/configuration change;
3. deterministic tests;
4. documentation update;
5. evaluation/backtest evidence where the change is claimed to improve ranking quality;
6. methodology-version change once versioning is implemented.

Do not tune the system solely to improve rankings for a hand-picked set of stocks.

## Data-provider changes

Document:

- units and normalization;
- freshness/timestamps;
- missing/error behavior;
- rate limits;
- licensing/commercial constraints where relevant;
- fallback behavior.

## Pull-request checklist

- [ ] Scope is focused and understandable.
- [ ] Build passes.
- [ ] Lint status is known.
- [ ] Deterministic methodology changes are tested.
- [ ] Missing/error states remain explicit.
- [ ] No secrets or real `.env` values are committed.
- [ ] AI does not become the source of truth for structured values.
- [ ] Relevant product/methodology/architecture docs are updated.
- [ ] User-facing methodology language remains consistent with the code.

## Review priority

1. credential/data-access risk;
2. financial-data correctness and methodology reproducibility;
3. provider reliability;
4. product clarity/explainability;
5. maintainability;
6. visual polish.
