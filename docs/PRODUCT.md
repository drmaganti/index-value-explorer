# Product Definition — Index Value Explorer

## Product statement

Index Value Explorer helps long-horizon investors move from a familiar index to a smaller, explainable set of companies that may deserve deeper research because they combine scale, business quality, valuation, and a meaningful price pullback.

It is a **research prioritization tool**, not a portfolio allocator or recommendation engine.

## Primary user

An individual investor or researcher who:

- prefers established large-cap companies;
- starts from known index universes rather than the entire market;
- wants to look for pullback/value situations;
- wants transparent factor logic instead of a black-box AI ranking;
- wants AI explanation only after the deterministic facts are computed.

## Jobs to be done

1. **Choose my hunting ground.** Start from an index I already understand, such as QQQ, SPY, or DIA.
2. **Remove obvious non-fits.** Apply hard filters before spending attention on scoring or narrative.
3. **Prioritize research.** Rank the remaining companies consistently across multiple dimensions.
4. **Understand the score.** See which factors helped or hurt rather than receive an unexplained rank.
5. **Go deeper elsewhere.** Use the shortlist as the beginning of investment research, not the end.

## Value proposition

The product sits between an index list and full company research:

```text
major index
   ↓
transparent hard filters
   ↓
quality/value/growth/risk scoring
   ↓
ranked shortlist
   ↓
optional explanation
   ↓
deeper research
```

This reduces research breadth without pretending that a heuristic screen can replace a full investment thesis.

## Product principles

### Deterministic facts first

Eligibility and scores should be reproducible from the same input data/configuration.

### Explain rejection as well as selection

A company that fails the hard screen should have a machine-readable reason. Silent disappearance makes the product harder to trust.

### Separate quality from price opportunity

A deep pullback alone is not sufficient. The system intentionally blends valuation, business quality, growth, financial health, and risk.

### AI narrates; it does not decide

AI may summarize themes or explain the existing output, but it must not replace the source-of-truth data and score calculation.

### Methodology is versioned thinking, not truth

Weights and thresholds are hypotheses. They should change through evidence and evaluation, not intuition alone.

## Current scope

- QQQ/SPY/DIA-oriented index selection;
- large-cap eligibility filters;
- configurable pullback range;
- fixed-factor deterministic scoring;
- conservative/balanced/opportunistic weighting modes;
- ranked results;
- methodology explanation;
- optional AI narrative layer;
- Supabase-backed application capabilities.

## Success measures

These are measurement targets/categories, not claims about current performance:

### Product usefulness

- % of completed screens that lead to opening/reviewing at least one result;
- repeat screening usage;
- time from index selection to useful shortlist;
- user-rated clarity of why a company ranked where it did;
- % of users who inspect methodology/evidence rather than relying only on the score.

### Methodology quality

- score stability for unchanged point-in-time data;
- missing-data coverage by factor/index;
- forward benchmark-relative outcome by score decile;
- factor contribution/ablation results;
- false confidence rate when data coverage is sparse.

### Engineering quality

- successful screen completion rate;
- provider/API failure rate;
- p95 latency for supported index runs;
- test/CI pass rate;
- stale-data incidence.

## Non-goals

- personalized financial advice;
- automated trading or order execution;
- individualized portfolio allocation;
- guaranteeing that a low-multiple stock is undervalued;
- using an LLM as the source of market/fundamental facts;
- expanding to every global security before the current methodology is validated.

## Product risks

- **Value-trap risk:** cheap/pulled-back stocks may be deteriorating for structural reasons.
- **Methodology risk:** fixed bounds/weights may overfit intuition and behave differently by sector.
- **Data risk:** stale, missing, or inconsistent provider data can create misleading rankings.
- **False precision:** a 0–100 score can look more authoritative than the validation supports.
- **AI halo:** narrative fluency can make a heuristic result feel more certain than it is.
- **Security risk:** public-repo configuration mistakes can expose credentials.

## Relationship to other stock projects

This application is an index-focused user experience and screening strategy. Shared/general stock intelligence should remain separable from the UI so future products can reuse common analysis capabilities without copying this product's specific filters or index assumptions.

## Decision rule

When choosing between a more sophisticated score and a more understandable/validated score, prefer the one that can be explained and tested.
