# Phase 2 Implementation Record — Recommendation Engine + Questionnaire Foundation

Status: implementation complete, verified. `SCORING_VERSION = v2.phase2`, `WEIGHTS_VERSION = v1`.

## 1. Canonical questionnaire contract
`src/lib/recommendation/questionnaire.ts`. Q1 workload (6 options) → Q2 maxBudget → Q3 os (windows/macos/null) → Q4 carry → Q5 powerTrade → Q6 multitask (light/heavy/extreme) → Q7 storageNeed (docs/lots/media) → Q8 screen (≤2 of sharp/smooth/vivid/touch) → Q9 toughBuild, plus `dealMinRam16` toggle. Only workload/useCase is semantically required; skipped = null. `CanonicalAnswersSchema` validates the shape (numbers clamped finite 0..10M). Quick (Q1–Q5) and Advanced (+Q6–Q9) produce the identical shape (proven in `tests/v2/canonical.test.ts`).
Legacy-compat fields (`legacyCpuBrand/GpuDedicated/Ports/OsRaw/Gaming/UpgradeMust/MinRamExact/MinStorageExact`) carry old-caller inputs; new bank never emits them. Dead inputs (`displaySize/webcam/security/refurbished`) are dropped in `toCanonical` — no canonical field exists for them.

## 2. Canonical user profile
`src/lib/recommendation/profile.ts` → `buildProfile()`. Holds `hard` floors, PRIORITY-adjusted `weights` (renormalized to 1), `dealMinRam16`, `tradeOffs` (battery-for-power), `contradictions` (macOS + dedicated GPU surfaced as text). Exact legacy floors win over bands (`Math.max(band, exact)`), so bands never round a request down (minRam 36 stays 36). Deterministic, pure.

## 3. Capability model
`src/lib/recommendation/capabilities.ts`. Every capability = `{value 0..1 | null, confidence 0..1, source measured|claimed|inferred|missing}`. Null stays null — never coerced (sparse rows keep null cpu/battery/portability). Shared band functions (`cpuBand/gpuBand/ramBand/storageBand/batteryBand/portabilityBand/refresh/panel/brightness/gamut/buildBand`) are imported by both engine and `decomposition.ts`: one formula each. `displayCapability` averages available sub-scores (screen picks double-weight matching subs). `value` is pool-relative, injected by the engine (dense-ranked; ties share one value).

## 4. Authoritative scoring entrypoint
`scoreLaptops(laptops, answers)` in `src/lib/scoring.ts` — the ONE entrypoint (API route, category page, all tests). Pipeline: `toCanonical → buildProfile → runEngine → toRecommended`. Score = `Σ(weight × capability) − penalties + bonuses + met-bonus`, clamped 0..1, `matchScore = round(score×100)`.

## 5. Scoring version
`SCORING_VERSION = "v2.phase2"`, `WEIGHTS_VERSION = "v1"` (`weights.ts`), stamped on every `RecommendedLaptop`.

## 6. Weight matrix
`WEIGHTS_V1`: per-useCase weights over the 9 dims, each row sums to 1.0 (mapped from Phase-0 PRIORITIES: value=budget, build=build+upgradeability). PRIORITY multipliers: performance (cpu×1.4, gpu×1.3, battery×0.4), battery (battery×1.6, cpu/gpu×0.8), carry always (portability×1.5, battery×1.2) / desk (portability×0.5), screen picks (display ×1+0.25 each), toughBuild (build×1.5); renormalized after.

## 7. Penalties
Refurbished −0.05, price-unknown −0.15, any low-confidence scored dim −0.05 flat; capped −0.25 total.

## 8. Bonuses
RAM-upgradeable +0.03, storage-expandable +0.03 (cap +0.06); satisfied hard/need confirmation +0.02 each (cap +0.06, documents explicit-fit).

## 9. Hard constraints
Budget min+max (price-missing never passes), OS (case-insensitive; linux accepts linux|windows legacy-compat), minRam/minStorage floors, cpuBrand exact (legacy-compat), gpu dedicated (legacy-compat), ports (fails only if >1 missing, legacy-compat), deal-breaker minRam 16. All O(1) per item, deterministic.

## 10. Relaxation order
gpu → ports → storage (one band step) → ram (one band step) → budget (0.7×/1.3×) → cpuBrand → os. First non-empty pool wins.

## 11. Relaxation ledger
Every step appends `{requirement, from, to, reason}`; exposed as `relaxationLedger` on each result; corresponding `missed[]` entries carry `relaxed: true`.

## 12. Protected constraints
Budget and OS relax automatically (no opt-in channel exists in the v1 API) but are ledgered + flagged, never silent. Documented deviation pending the Phase-1 UI decision (OPEN-QUESTIONS).

## 13. Price-unknown behavior
`isPriceMissing = priceMissing ?? price <= 0`. Missing-price rows fail budget hards, score −0.15, get null value cap, and are appended after priced results (max 3). Invariant (tested): unknown-price never ranks top-3 above a priced passer. `toScorable` sets the flag instead of silently passing price 0 (fixes the Phase-0 price=0 distortion).

## 14. Tie-breaking
score desc → price asc (missing last) → weight asc (null last) → id asc. Byte-identical across runs and input orders (tested, incl. shuffled input). Uses id, not createdAt (ScorableLaptop carries no timestamp).

## 15. Explanation schema
Per result: `why` (top-2 weighted dims), `strengths` (top-3 caps + raw-spec evidence), `compromises` (bottom-2), `satisfied[]`, `missed[]` (required/actual/relaxed), `structuralNotes`, `whyAbove` (vsId + won/lost deltas, chained). Legacy `matchReasons`/`tradeoffs` copy preserved unchanged. All dims ⊆ DIMS_9; no invented characteristics.

## 16. Slider overlay
`rescoreWithOverlay` (`decomposition.ts`) reconstructs RankedItems from stored `scoringMeta` and calls the engine's `rescoreWithOverlay` — the same scorer, caller-supplied weights. Results labeled `adjustedView: true`; UI shows "Adjusted view — not saved". No independent formula remains (old weighted-mean code deleted).

## 17. Compatibility adapters
`toCanonical` (legacy answers → canonical, incl. workload/useCase mapping, display-quality → screen picks, portability/battery plain-language mapping); `buildProfile(c, legacyBudgetMin)`; `toRecommended` (engine items → legacy `RecommendedLaptop` shape + additive v2 fields); `toScorable` priceMissing flag; validation `budgetMin ≤ budgetMax` refine; localStorage keys and `?ids=` compare flow untouched.

## 18. Tests
- `tests/v2/canonical.test.ts` (22): contract, adapter, schema boundaries, profile kinds, bands.
- `tests/v2/engine.test.ts` (27): price matrix, hards, relaxation, scoring, tie-break, slider, edges, explanations.
- Updated: `use-cases.test.ts` goldens (re-captured), `filters.test.ts` (2 order + 1 relaxation-contract update).
- Totals: unit/scoring 100/100, API 26/26, E2E 17/17 (after clean-server triage; earlier 11-failure run classified as infrastructure — corrupted `.next` + racing dev servers + Turbopack "Next.js package not found" panic).

## 19. Intentional behavioral changes
- v2 goldens: gaming laptops no longer top student/office/travel (IdeaPad Slim 5 / Swift Go / Book4 Pro do); gamer/creator tops unchanged in kind.
- Relaxation is ledgered/capped (was silent/unbounded); exhaustion returns flagged closest-misses.
- minRam/minStorage order flips on tiny fixtures (value+battery weight now beats raw specs for the general profile).
- Budget band 0.7/1.3 preserved (ledgered) instead of the Phase-1 "+15%" example — compat deviation, documented here.
- Dense-ranking value fix: equal prices share one value cap (fixes input-order dependence found by new tests).
- Dead inputs removed from scoring path (ports/cpuBrand kept as legacy-compat HARD only).

## 20. Known limitations
- `CanonicalAnswersSchema.useCase` is a loose string (legacy boundary enforces the enum); unbounded legacy strings accepted (see SECURITY §1).
- Double weighted-sum per laptop + 9N decompose calls in breakdowns (negligible: full score 0.567 ms / 56 items).
- v2 payload +~895 B/item (+120%; 19.7 KB per 12 results) — accepted for transparency.
- Pre-existing, untouched: region-agnostic catalog cache key (SECURITY §5), spoofable rate-limit IP, localStorage without schema validation.
