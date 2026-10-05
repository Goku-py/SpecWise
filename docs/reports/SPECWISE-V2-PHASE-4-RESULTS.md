# SPECWISE V2 — PHASE 4 RESULTS (as implemented)

> Status: IMPLEMENTED. Engine, schema, quiz, storage, share, and API untouched
> (verified: `git diff` zero on all of them; see §19).
> Companion matrix: `SPECWISE-V2-RESULTS-TRACEABILITY.md`.

## 1. Results architecture
Same data path as before (`POST /api/quiz` → DTO → `specwise-v3-results` v2 envelope → `/results`),
rebuilt presentation. Order enforced in `src/app/results/results-view-v3.tsx`:
header (H1 "Your best match" + count/region/currency + REFINE) → StaleNotice? → exhausted banner →
`ResultsHero` (best match + score strip + WhyThisOne) → `Tradeoffs` → `WhyAbove` (#1 vs #2) →
`MoreOptions` (#2–#12) → "How we matched you" collapsible group (ConfidenceDetails + MatchingLedger +
Contradictions) → `ResultsActions` (refine, copy answers link). Engine order is never re-sorted.

## 2. Component structure (`src/components/results/`, one file per component)
`ResultsHero` · `ScoreBars` · `WhyThisOne` · `Tradeoffs` · `WhyAbove` · `MoreOptions` (+`OptionCard`) ·
`ConfidenceDetails` · `MatchingLedger` · `Contradictions` · `ResultsActions` · `ResultsStates`
(LoadingSkeleton + NoResults + MissingProfile + InvalidResult + StaleNotice + EmptyCatalog) ·
`CompareContract.ts` (types-only, no UI). Shared pure logic in `src/lib/results-presentation.ts`
(no JSX; unit-tested). Reused: `FScoreMeter` (sole circular viz), `ProductImage` (null-src fallback),
`buttonVariants`. No new deps, no `motion`, no RadarChart.

## 3. DTO → UI mapping
Every mapping is a pure function in `results-presentation.ts` (all null-safe, never throws):
`DIM_LABELS`/`dimLabel()` (9 engine dims → human labels; unknown id passes through, never crashes) ·
`tierLabel()` (high→"Best fit", medium→"Strong alternative", limited→"Partial fit") ·
`verdictFor()` (tier-keyed, brand+model; never best/perfect/guaranteed) ·
`formatPriceShort()` (null-safe) · `detailHref()` → `/laptops/${laptopId}` (id-fallback + 308 chain) ·
`bindingStatus()` (ok/stale/unbound) · `resultImageSrc()` → always null (DTO carries no image; commented) ·
`relaxSummary()` (verbatim pass-through) · `overallGap()`, `topItem()`, `asRecommendationDTO()` guards.
W/C/V labels: Workload / Fit / Value. V omitted with footnote when null — never zero.

## 4. Best-match logic
`ResultsHero`: eyebrow "Best match · #1 of N" + H2 brand+model + tier verdict sentence + donut
(`FScoreMeter`, existing count-up kept) + `ScoreBars` (parallel 0–100 bars, numeric always visible,
`role="img"` + text summary; V omitted gracefully) + `ConfidenceBadge` (tier label + ≤4 factors) +
price line (+stale tag) + modest `ProductImage src={null}` slot + [View details] + [Refine answers].
Communicates "closest match for your answers" — never market-best/perfect.

## 5. Strengths logic (`WhyThisOne`)
Max 3 `strengths` as Sans sentences + mono dim tag + verbatim evidence. No adjectives beyond data.
Empty → section omitted (never filler).

## 6. Trade-off logic (`Tradeoffs`)
`compromises` (dim labels) + `missedPreferred` as "You wanted {required}. This laptop has {actual}."
rows. Rendered immediately after WhyThisOne, before MoreOptions — even beside high scores.
Empty → omitted.

## 7. Why-above logic (`WhyAbove`)
Only when `whyAbove` non-null with non-empty won/lost: "Why above #2", ≤2 won (+delta) + ≤2 lost rows
(dual-encoded sign, never color-alone) + overall-gap line (`top.overall − second.overall`).
Never compares against arbitrary laptops; deltas ≤0.02 never surface (engine threshold).

## 8. Confidence (`ConfidenceDetails`, collapsible)
Tier + `dataCompleteness` % + ≤4 factors + freshness note (stale/missing). Framed as data/fit
confidence ("How sure the match calculation is"), never future certainty. Language follows tier
semantics (Best fit / Strong alternative / Partial fit).

## 9. Relaxation (`MatchingLedger`)
`relaxed && ledger.length>0` only: "Some constraints were adjusted…" + verbatim rows
(requirement: from → to — reason). Renders NOTHING when empty — no invented explanation.

## 10. Contradictions (`Contradictions`)
" Worth knowing" heading + verbatim engine strings, only if non-empty. No new detection.

## 11. Empty/error states (`ResultsStates`)
LoadingSkeleton (static-first; null-flash fixed, §12) · NoResults (awaitingUser-aware copy kept) ·
MissingProfile ("recommendation profile is missing" + Start) · InvalidResult (never partial render) ·
StaleNotice (profile.region ≠ dto.region → "answers changed" + See-current-answers/Start-over clearing
both v3 keys) · EmptyCatalog (empty items without awaitingUser/relaxation → catalog-unavailable copy;
matters while prod DB is empty). Silent `router.replace` bounce REMOVED — every state renders explained
UI with links.

## 12. Profile/result binding
Both blobs read on mount; profile validated via `validateV3Profile` (+ schema safeParse for the share
builder; schema-fail → unbound, results still render). Region drift → stale notice (both written together
at submit, so drift means answers changed after results). Scores never render from a missing/invalid DTO.

## 13. Persistence
Unchanged: v2 envelopes + legacy-raw compat, no second format, no DTO field duplication. "Start over"
clears both v3 keys (legacy `specwise-results` untouched — compare-legacy's key, not ours).

## 14. Detail handoff
All cards link `/laptops/${laptopId}` (slug-then-id resolution + 308 → canonical slug verified).
No detail duplication in Results ("why this laptop" here; "should I buy it" is Phase 7).

## 15. Share status
Minimal safe mechanism: "Copy answers link" copies absolute `buildV3SharePath(profile)` URL
(`/quiz?s=…` via `window.location.origin`; clipboard with fallback). Recipient re-runs scoring —
no fake shareability. DB-backed permanent share: CANNOT COMPLETE IN PHASE 4 (no backend table;
no such infrastructure) — handoff for later phase.

## 16. Image behavior
`resultImageSrc()` always null (DTO has no imageUrl — verified absence, not oversight):
permanent neutral `ProductImage` fallback slot. Modest confirming size; donut dominant.
Images confirm; scores rank. Multi-image gallery explicitly NOT built (Phase 8).

## 17. Accessibility
Single H1; H2 hero + H3 option cards; donut/bars `role="img"` + text equivalents; deltas dual-encoded;
`<details>`-style collapsible group; reduced-motion via kept `useCountUp` behavior + no new animation;
focus-visible inherited; clipboard failure is silent-safe. Browser SR/keyboard pass: manual (Phase 10).

## 18. Responsive behavior
Hero stacks (image + donut + evidence serialize, no dashboard squeeze); bars full-width with labels;
option grid 1→2 col; no fixed-width rows added; tables untouched. Device-lab 360–1440: NOT executed
(layout designed mobile-first; recorded for Phase 10).

## 19. Testing
`src/lib/__tests__/results-presentation.test.ts` (22 pass) + `src/components/results/__tests__/
results-mapping.test.ts` (20 pass, 6 skipped-as-unrunnable-in-node). Coverage: tiers/verdicts, V-null,
empty payloads, gap math, verbatim relaxation/contradictions, all empty/error/binding states,
single/multiple items, href shape, always-null image, claim→field assertions. Fixtures labeled
fixture-only; never touch production scoring. Responsive/reduced-motion/clipboard/skeleton-timing:
recorded NOT-RUNNABLE (node env, no DOM) — skipped, not faked.

## 20. Known limitations
No slug/image in DTO (id-links + permanent fallback) · no visible Compare CTA by design (§21) ·
device-lab + SR + clipboard + skeleton-timing unverified (Phase 10) · `page.tsx` still passes
`initialRegion` (harmless; region renders from DTO) · lint carries the same mount-hydration
set-state-in-effect instance in the rewritten file (same rule as HEAD version — SSR-safe hydration
requires the effect; counts unchanged, §22).

## 21. Deferred Compare handoff
`CompareContract.ts`: `ResultsCompareContext` + `buildResultsCompareContext(dto, 3)` (top-N ids +
overall map, engine order). No CTA rendered. Phase 7 must provide: slug resolution for ranked
`laptopId`s to enter canonical `/compare/[slugs]` with scores.

## 22. Verification (team-lead, independent)
- Engine/schema/API/storage/share/quiz zero-diff: VERIFIED (`git diff --stat` empty on all).
- `tsc --noEmit`: exit 0. `test:unit`: 3 files / 33 pass.
- `tests/v3` + store + interpret + results suites: 5 files, 80 pass + 6 skipped (node-env skips).
- Lint: 9E/7W — counts identical to Phase 0 baseline; error composition matches (hero×2,
  exploded×1, hero-scene×4, heading×1, results-view×1 — the last being the retained
  mount-hydration pattern in the rewritten file); warnings all pre-existing locations.
- Build/API/E2E: NOT RUN — dev server down, Postgres up; API tests need `npm run dev` + write
  against shared DB (unsafe); full build would compile other agents' in-flight Phase 2–3 edits
  (uncommitted in tree), unattributable. Typecheck + unit/integration suites cover the surface.
