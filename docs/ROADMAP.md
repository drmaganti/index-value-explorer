# Roadmap — Index Value Explorer

The roadmap is ordered around **security and reproducibility first, methodology validation second, feature expansion third**.

## Now — repository and engineering hygiene

### 1. Remove tracked environment configuration

- review the tracked `.env` without publishing its values;
- rotate any secret that may have been committed;
- stop tracking `.env`;
- add a sanitized `.env.example`;
- verify `.gitignore`;
- rewrite Git history if sensitive values were committed.

### 2. Establish repeatable tests and CI

- expose a `test` script in `package.json`;
- run deterministic unit tests on every PR/push;
- include build + lint + test gates;
- add fixtures for filters, scoring, missing data, and ranking.

### 3. Add methodology versioning

Every saved/reportable screen should retain enough metadata to reproduce it:

- methodology/config version;
- selected mode;
- screening timestamp;
- data freshness/provider metadata where available.

## Next — improve confidence in the screen

### Data coverage and freshness

- expose factor/data coverage in each result;
- distinguish missing metrics from provider failures;
- cache appropriate data with explicit freshness policies;
- surface stale/partial coverage to the user.

### Methodology evaluation

- freeze historical point-in-time fixtures;
- run score-decile outcome analysis;
- compare against relevant index benchmarks;
- evaluate by sector/regime;
- perform factor ablations;
- test sector-relative valuation against current absolute bounds.

### Factor improvements to evaluate

Candidates, not commitments:

- FCF yield instead of absolute FCF;
- sector-relative valuation;
- ROIC;
- multi-year growth/margin trends;
- interest coverage;
- share dilution;
- estimate revisions / earnings surprise signals.

Add only factors that improve explainability or measured performance.

## Product improvements

### Result explainability

- show factor contribution rather than only total score;
- make rejection reasons easy to inspect;
- show data coverage/confidence;
- distinguish “great company” from “attractive current setup.”

### Deep research handoff

After the shortlist is stable, support a deliberate handoff into deeper evidence-grounded company research rather than expanding the index screen into an all-purpose research product.

### Saved/reproducible screens

If user value warrants it:

- save screen configuration and methodology version;
- compare current versus prior runs;
- track when a company enters/exits the shortlist and why.

## Later — production hardening

- evaluate SLA/licensing-appropriate market/fundamental providers;
- rate limiting and provider fallback where justified;
- structured observability for provider/data-stage failures;
- cached index membership and fundamentals;
- authorization review for admin/private surfaces;
- deployment/runbook and rollback process.

## Explicitly deferred

- automated trading;
- personalized portfolio allocation;
- AI-generated source-of-truth financial data;
- global-market expansion before current U.S. index workflow is validated;
- dozens of new factors without evaluation;
- optimizing weights to make a hand-selected list rank higher.

## Release gates

### Credible research beta

- no sensitive `.env` material tracked;
- build/lint/tests run repeatably in CI;
- current methodology documented and versioned;
- missing-data behavior tested;
- data freshness visible enough to interpret results;
- no AI path can modify deterministic scores.

### Methodology candidate

- beta gates remain green;
- point-in-time historical evaluation completed;
- known survivorship/look-ahead risks addressed;
- factor ablations documented;
- confidence/data coverage added;
- major methodology assumptions disclosed in-product.
