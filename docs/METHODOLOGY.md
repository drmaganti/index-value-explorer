# Methodology — Index Value Explorer

## Status

The current screening model is an **explainable heuristic**, not a validated alpha model. It is suitable for prioritizing research candidates, but its thresholds, factor bounds, and weights should be evaluated on point-in-time historical data before any predictive claim is made.

## Stage 1 — hard filters

The default configuration currently applies:

| Rule | Default |
|---|---:|
| Minimum market cap | $25B |
| Minimum pullback | 8% |
| Maximum pullback | 35% |
| Minimum operating margin | > 0% |
| Positive revenue growth | required |
| Positive free cash flow | not required |
| Maximum debt/equity | 2.5 |
| Above 200-day moving average | not required |

A stock that fails a hard filter is rejected rather than receiving a low score. Rejections should preserve a reason that can be shown or audited.

## Stage 2 — deterministic scoring

Survivors are normalized factor-by-factor to a 0–1 goodness score and combined using configurable weights. The output is rescaled to 0–100.

Current default weights:

| Factor | Weight | Direction |
|---|---:|---|
| Forward P/E | 1.2 | lower is better |
| Trailing P/E | 0.6 | lower is better |
| EV/EBITDA | 1.0 | lower is better |
| Price/book | 0.5 | lower is better |
| Pullback depth | 1.4 | deeper within allowed band scores higher |
| Revenue growth | 0.9 | higher is better |
| Earnings growth | 0.8 | higher is better |
| Operating margin | 1.2 | higher is better |
| Gross margin | 0.7 | higher is better |
| Return on equity | 1.0 | higher is better |
| Free cash flow | 1.0 | higher is better |
| Debt/equity | 0.6 | lower is better |
| Beta | 0.4 | lower is better |

Default top-N output is 10.

## Factor bounds

Each factor uses fixed lower/upper bounds defined in `src/services/config.ts`. Values outside the range are clamped before scoring.

Fixed bounds make the model simple and explainable but introduce known limitations:

- sector economics differ materially;
- absolute valuation bands can penalize structurally higher-multiple industries;
- FCF in absolute dollars is affected by company size;
- ROE can be distorted by leverage or negative equity;
- beta is an incomplete measure of investment risk;
- a deeper pullback can reflect a genuine deterioration rather than opportunity.

The current values should therefore be treated as design hypotheses.

## Missing data

A missing factor is not replaced with zero or an invented value. Its weight is redistributed proportionally over available factors.

This avoids automatically punishing incomplete records, but it creates a second-order risk: two stocks can receive similar total scores based on different evidence coverage.

Recommended improvement: return an explicit **data coverage/confidence indicator** with every score.

## Modes

Conservative, Balanced, and Opportunistic modes use the same general factor vocabulary but change weighting emphasis.

The product should always make clear that:

- modes are preference tilts, not separate validated strategies;
- changing a mode changes ranking assumptions;
- results should include the selected mode/configuration for reproducibility.

## AI explanation

AI is downstream of the deterministic calculation.

Allowed:

- summarize common strengths/weaknesses in returned results;
- explain which supplied factors drove ranking;
- identify missing data already present in the result;
- translate the deterministic methodology into plain English.

Not allowed:

- alter a score;
- add unsupported financial values;
- fabricate company news or catalysts;
- make personalized recommendations;
- create price targets;
- present model memory as current market evidence.

## Evaluation plan

### Deterministic correctness

Unit tests should prove:

- filter boundaries behave as documented;
- normalization stays within 0–1;
- final scores stay within 0–100;
- missing-factor redistribution is mathematically correct;
- identical inputs/config produce identical rankings;
- more debt does not improve the debt factor;
- more expensive multiples do not improve valuation factors within comparable conditions.

### Data quality

Track:

- missingness by factor/index/provider;
- provider disagreements/normalization issues;
- data age at screen time;
- rejected tickers due to provider failures versus investment filters.

### Historical calibration

Use point-in-time data only. Avoid survivorship and look-ahead bias.

Recommended study:

1. freeze a methodology version;
2. reconstruct historical index membership and available metrics at each date;
3. generate scores without future information;
4. measure 1m/3m/6m/12m benchmark-relative outcomes;
5. compare score deciles, not only top picks;
6. segment by sector and market regime;
7. run factor/weight ablations;
8. validate changes out of sample.

Useful questions:

- Does a higher total score improve forward outcomes?
- Is pullback depth additive after quality and valuation?
- Which factors add no useful signal?
- Do sector-relative valuation metrics outperform fixed bounds?
- Does a data-coverage penalty improve reliability?

## Planned methodology improvements

Prioritize evidence-backed improvements over more factors:

- sector-relative valuation;
- FCF yield rather than absolute FCF as a scoring factor;
- multi-year growth/margin trends;
- ROIC / capital-efficiency measures;
- interest coverage and balance-sheet resilience;
- estimate revisions/earnings surprises if data quality supports them;
- methodology version on every result;
- data coverage/confidence score;
- connection to a deeper evidence-grounded analysis capability after shortlist selection.

## Change control

A methodology change should include:

- rationale;
- exact configuration diff;
- regression-test updates;
- historical/evaluation result where feasible;
- version identifier;
- documentation update.

Do not tune weights after seeing a small number of desired stocks and call the change an improvement.
