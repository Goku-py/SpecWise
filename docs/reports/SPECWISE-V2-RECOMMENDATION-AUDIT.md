# SPECWISE V2 — RECOMMENDATION AUDIT (Phase 0 satellite)

> Read-only. Engine: `lib/recommend/v3/engine.ts` (`runV3`, `hardFailures`, `hardStateFrom`, `RELAX_OPS`,
> `intentHardBlocks`, `TIE_EPS`); scoring `lib/recommend/v3/scoring.ts` (`ALPHA/BETA/GAMMA`, `finalScore`,
> `workloadFit`, `targetFit`, `poolValue`, `confidenceFor`, `tierFor`, `numShortfall` dead);
> `lib/recommend/v3/workloads.ts` (`WORKLOAD_VECTORS_V31`, `INFLUENCE`, `PRIORITY_INCREMENT`, `applyPriorities`,
> `weightsForProfile`, `blendWorkloadWeights`); `lib/recommend/v3/requirements.ts` (`buildRequirements`,
> `workloadProposals`); `lib/recommend/v3/capabilities.ts` (`capabilitiesForV3`); `lib/recommend/v3/types.ts`
> (`SCORING_VERSION_V3="v3.1"`, `WEIGHTS_VERSION_V3="v3.1"`, `DIMS_V3`); `lib/catalog-cache.ts`
> (`getActiveCatalog`, `toScorable`, `pickBestOffer`); `app/api/quiz/route.ts` (`POST`).

## 1. Pipeline

```
V3Quiz.submit → POST /api/quiz {schemaVersion:v3,profile}
  → CanonicalProfileSchema → normalizeRegion(400) → getActiveCatalog(region) → toScorable
  → runV3(catalog,profile): active-filter → buildRequirements → weightsForProfile → capsContextFor
    → hardStateFrom → pool=filter(hardFailures==0) → relax loop ≤3 (budget1-gated budget2; one budget step max)
    → exhausted=pool==0; awaitingUser=exhausted&&intentHardBlocks
    → workPool=exhausted?12 fewest-failures:pool
    → per-laptop capabilitiesForV3 → W=workloadFit, C=targetFit, {K,completeness,factors}=confidenceFor
    → V=poolValue (missing→null) → final=finalScore → sort → diversity(2/brand+model) → missing-lane → slice 12
    → explanations → RecommendationDTO {scoringVersion,weightsVersion,region,currency,relaxed,exhausted,
       awaitingUser,relaxationLedger,items,contradictions,notes}
```

Both callers omit `fxToUSD` (identity). INFERENCE: V is single-currency (region pool) so min-max invariance holds;
cross-currency pools would break it — unreachable in production. Category pages reuse `runV3` with preset profile +
display-only mapping. Results view does no scoring.

## 2. Formulas (verbatim)

- Header contract: `Final = 0.65W + 0.20C + 0.15V (Best-value: 0.55/0.20/0.25). K never scales Final; ε=0.005 ranking only.`
- `finalScore`: `v = V ?? 0.5; bestValue ? .55W+.20C+.25v : .65W+.20C+.15v`.
- `workloadFit`: `Σ w·cap / Σ w` over `caps[d].value != null` only (`|| 1` guard).
- `targetFit`: Type-B only (`os-prefer,brand-prefer,upgrade-prefer,touch-prefer,resolution-prefer,color-prefer,
  oled-prefer`); none→1; `1 − Σ imp·short / Σ imp`; cases: os/brand equality, upgrade product rule, touch bool,
  resolution/color/oled always 0, `default: 0`. `numShortfall` exists, zero callers (dead).
- `poolValue`: `perfNorm=(W−min)/(max−min)` (equal→0.5); `priceScore=(maxL−ln price)/(maxL−minL)` (equal→0.5);
  `V=.5·perf+.5·price`. Guards: <4 items or <2 priced → all 0.5 neutral; missing/≤0 skipped then backfilled 0.5
  (caller overrides missing→null).
- `confidenceFor`: `completeness=avail/total` (weight-weighted); `freshness = missing?.3 : stale?.6 : 1`;
  `K=.6·completeness+.4·freshness`; factors per-null-dim + always "thermal data unavailable" + price flags; dead
  no-op line `if (cpu.confidence===0 && …) void 0`. `tierFor`: High≥.80/Med≥.55/limited.
- `overall=round(final·100)`; W/C/V `round3`; V null stays null.

## 3. Dimensions & weights

`DIMS_V3=[cpu,gpu,vram,ram,storage,display,battery,portability,build]` (9; "thermals is a modifier, value lives in V"
— INFERENCE: no thermal term found in V; `thermalsModifier` always `{adjust:0,unknown:true}`).
Base vectors v3.1 (rows sum 1.0): dev-standard (.2247/.0562/.0225/.2472/.1348/.0674/.1124/.0899/.0449);
dev-heavy (.2526/.0526/.0211/.2947/.1474/.0526/.0737/.0632/.0421); gaming-esports
(.2063/.268/.0825/.1443/.0825/.1237/.0309/.0309/.0309); gaming-aaa (.15/.3/.14/.14/.1/.1/.03/.02/.02);
gaming-both (.1718/.2929/.1212/.1414/.0909/.1111/.0303/.0202/.0202); ai-ml
(.1783/.2772/.2178/.1584/.0792/.0198/.0198/.0198/.0297); + video-photo/cad-3d/study-office rows (see engine source).
Blend: `w=Σ inf·w(i)/Σ inf`, dedupe keep-max-inf, renormalize; all-occasional→secondary.
`PRIORITY_INCREMENT`: speed +.025cpu/gpu; battery +.05; carry +.05 portability; screen +.05 display; build +.05;
then renormalize. Caps: absolute anchors + `interpAnchors` piecewise-linear (caps file); W weighted mean; V
pool-local; C importance-weighted; K completeness+freshness.

## 4. Filtering / sorting / lanes

`hardFailures`: budgetMin/Max (`missing||out` — missing fails BOTH); os ci-eq; minRam/minStorage; gpuDedicated;
minVRAM (`??−1`, unlisted fails); maxWeight (null fails); minRefresh/minSize/minBattery (`batteryLife==null` fails)/
minCores (null fails); ports subset ci; upgrade bools; refurb `newOnly&&isRefurbished`. Inactive pre-filtered.
Relax order locked budget→storage→RAM→GPU→VRAM/refresh/size→ports→weight/battery→cores→upgrade; os/refurb/budget-min
NEVER. Sort comparator verbatim: `|Δfinal|>TIE_EPS→final; else K; else price asc (missing=∞); else weight asc
(null=∞); else id lexicographic` — deterministic total order. Diversity max 2 per lowercase `brand model` (ledger
comment-only, no push — PARTIAL). Missing lane: priced first, missing appended max 3 ("never top-3 above priced").
Slice 12.

## 5. Missing/invalid/regional/budget/availability

- Null caps excluded both sides (never 0/0.5). Per-dim: cpu null; gpu null-type→null, dedicated-unlisted→0.7
  inferred, integrated→0.3; vram null+dedicated→0.7 (no double-hit); battery/weight/build null; display never null
  in practice (unreachable null branch — PARTIAL).
- Price missing (`priceMissing ?? price≤0`; no region rows): fails ALL budget hards, V=null, K .3, lane-demoted max 3.
  Stale (cheapest valid absent → cheapest stale + flag): K .6 + tag, still priced/budget-checked.
- Invalid profile → 400 + issues; invalid stored DTO/profile → null → empty quiz / bounce to /quiz.
- Budget vs region offer (`toScorable` cheapest-valid region offer); identity FX; `REGIONS[].fx`/`usdToLocal` unused
  in scoring. Availability: `isActive` pre-filter; stock via `pickBestOffer` (stale shown, never hidden). Region:
  `getActiveCatalog(region)`; DTO echoes region/currency; unsupported 400s.

## 6. Explanations

`evidenceFor` templates: cpu `"cores-core family"`; gpu `dedicated model vramGB`/integrated; vram/ram/storage/battery/
portability/display/build strings or "unlisted". `strengths` top-3 by raw cap (not weight×cap); `compromises`
lowest-2 weight×cap; `missedPreferred` battery/weight/refresh/vram/ram/storage gaps w/ wanted/has; `whyAbove` vs next
(Δ>0.02, won top-2/lost bottom-2); confidenceFactors/completeness/ledger/contradictions (macOS+GPU → OS kept;
Must-overrides-proposal; occasional-promotion). Rendered by `WhyBlock`/`ConfidenceBadge`; no LLM text.

## 7. No penalties/bonuses; no re-rank

No `penalties`/`bonuses` scalars in v3 (legacy type fields only). Analogues: hard elimination, `missedPreferred`
(explanation-only), missing-lane demotion, K nudge. **No live rescore/re-rank**: results display-only; legacy
`WeightSlider`/`ResultsGrid` dormant; priorities are quiz-time only.

## 8. Calibration UNKNOWN

No eval/threshold justification for K tiers, ε=0.005, Δ=0.02, lane cap 3, slice 12, V guards found in code.
