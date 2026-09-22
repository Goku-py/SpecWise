# Phase 2 Performance Review (read-only, no code changed)

Environment: tsx in-repo, 56-row JSON fixture catalog, `useCase:'coding'`.
No dev server started. DB-query counts are by code inspection, not live traces.

## Measured latencies (100–1000 runs, tsx)

- `scoreLaptops` (56 in → 12 out): **0.567 ms avg** (100 runs).
- `scoreLaptops` single item: **0.015 ms avg** (1000 runs).
- `rescoreWithOverlay` on 12-item pool (slider re-rank): **0.0317 ms avg** (1000 runs).
- `computeRankedBreakdown` on 12 items: **0.0439 ms avg** (1000 runs).
- Verdict: scoring is ~3 orders of magnitude below API/DB latency; no optimization needed.

## DB queries per POST /api/quiz (inspection)

1. `checkRateLimit` — **1 blocking raw upsert** into `RateLimit` per request
   (`src/lib/rate-limit.ts`); +~2%-chance `DELETE` cleanup query on the same path.
2. `getActiveCatalog(region)` — **0 on cache hit** (`unstable_cache`, TTL 3600 s),
   1 `laptop.findMany + prices` include on miss (`src/lib/catalog-cache.ts`).
3. Lead upsert / results email — fire-and-forget (unawaited), **0 blocking**.
- Blocking total: **1 query (hit) / 2 queries (miss)**.
- Observation (correctness-adjacent): cache key `["active-laptops-catalog"]`
  does not include `region`, so the first region fetched wins the cache entry.

## Complexity per stage (`engine.ts`; n = catalog, p = pool, d = 9 dims const)

| Stage | Big-O | Note |
|---|---|---|
| Hard filter | O(n) | ~7 O(1) checks/item; ports check O(#ports) |
| Relaxation loop | O(n) | ≤3 iters × full filter, ledger-capped |
| `valueMap` | O(p log p + p·D) | sort + `distinct.indexOf` per item (D = distinct prices); a rank-Map would drop the p·D term — negligible at this n |
| Capabilities | O(p·d) = O(p) | band lookups O(1) each |
| Scoring (`scoreWithWeights`) | O(p·d log d) = O(p) | 3 small sorts over ≤9 dims per item |
| Tie-break sort | O(p log p) | |
| Diversity cap | O(p) | one Map pass |
| Price lane split/slice | O(p) | |
| `attachWhyAbove` | O(k·d log d), k ≤ 12 | adjacent-pair deltas, trivial |
| `toRecommended` map | O(k) | reasons/tradeoffs are bounded slices |
| Exhausted path | O(n) scoring | scores full `active` set, not pool |

## Repeated computation (flagged, all negligible at measured scale)

1. **Soft score computed twice per laptop** (`engine.ts:207` then `:251–252`):
   `softScore` builds the full weighted sum without `value`, then
   `scoreWithWeights` re-sums after value injection. Capability bands are
   computed once (reused via `base.caps`); only the weighted sum is doubled.
2. `generateMatchReasons` calls `baseWeights()` per item (`scoring.ts:32`) —
   constant table copy, could hoist.
3. `computeRankedBreakdown` calls `decomposeScores` **9N times**
   (`view-models.ts:44–51,62`): once per item plus 8 full passes via `meanDim`;
   pool means could reuse the already-decomposed `scored[]`.
4. `rescoreWithOverlay` uses `results.find` inside `.map` (`decomposition.ts:164`)
   — O(k²) = 144 ops at k=12; fine, `scoreById` Map already exists.

## Allocations per request (estimate, not profiled)

Per pool laptop: 1 CapabilitySet (9 cap objects), 2 weights copies
(spread in `softScore` + return), 1 RankedItem + explanation object with
`why/strengths/compromises/whyAbove` arrays, ~3 throwaway `contrib` arrays
from map + 2 spread-sorts. ≈ 20–25 small short-lived objects/item →
~1–2k objects for n=56, all minor-GC. No per-request Maps/Sets retained
except centimeter-scale `valueMap`/diversity `seen` (both dropped after).

## Serialization growth (measured)

12-item response: **19,659 B total (~1,638 B/item)**; stripping v2 fields →
8,922 B. **Added: 10,737 B (~895 B/item, +120%).**
Added fields per item: `priceMissing` (~20 B), `scoringVersion`/`weightsVersion`
(~40 B), `relaxed`/`exhausted` (~30 B), `relaxationLedger` (shared array,
~0 B/item when empty), `scoringMeta` (**~310 B**: 9 caps + 9 weights +
penalties/bonuses), `explanation` (**~403 B**: why[2] + strengths[3] w/
evidence strings + compromises + satisfied/missed/structuralNotes +
whyAbove{vsId, won≤2, lost≤2}).

## Client-side `results-view.tsx` useMemo deps

- `defaultWeights`: `[answers]` — stable until answers resolve; then one reset.
- `adjusted`: `[sliderWeights, defaultWeights]` — 8-dim shallow compare per render.
- `rescored`: `[results, sliderWeights, answers, adjusted]` — short-circuits to
  `results` identity when untouched/zero; else full overlay (~0.03 ms).
- `breakdowns`: `[rescored, answers]` (~0.04 ms); `radarDims`: `[topBreakdown]`.
- Each slider tick replaces `sliderWeights` → one rescore + one breakdown;
  combined <0.1 ms, no memoization gap. `breakdowns.find` per card is O(k²).

## Unavailable measurements (not fabricated)

Live p50/p95 request latency, DB time under load, and production catalog
(n) distributions — no server or prod DB was touched per instructions.
