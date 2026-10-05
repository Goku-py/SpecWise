# SPECWISE V2 — PHASE 7 DETAIL + COMPARE (as implemented)

> Status: IMPLEMENTED. Baseline: `4ffb119`. No engine, quiz, homepage, Phase 8–10 changes.
> Companion: `SPECWISE-V2-PHASE-7-TRACEABILITY.md`. Pre-work audit: `SPECWISE-V2-PHASE-7-AUDIT.md`.

## 1. Final architecture (one compare system, two entry shapes)

```
/compare?ids=a,b[,c]          → server-resolves each id via getLaptopById (cap 3)
                                 ├─ 0 ids      → honest empty state (quiz/browse CTAs, NO localStorage read)
                                 ├─ 1 id       → single column + add-a-rival suggestions
                                 └─ 2–3 ids    → shared table + personalization island
/compare/<a>-vs-<b>           → server catalog pair, exact-2, canonical 308 (metadata + body)
/laptops/[id]                  → hero decision hierarchy + DetailMatchStrip + Compare button
/results                       → 'Compare top two' (buildResultsCompareContext(dto,2), ≥2 items only)
```

URL is the single source of selection truth (`compare-select.ts`: parse/add/remove/replace/href).
The legacy localStorage snapshot-join is INTENTIONALLY RETIRED (commented): nothing writes
`specwise-results`, so joining against it could only ever render empty. `/compare` no longer reads it.

## 2. Detail page (final hierarchy)

Breadcrumb → H1 brand+model(+variant) + OS/Popular badges → price line (region min–max) →
actions row (Buy + **Compare** → `compareHref([laptop.id])`) → key-evidence grid →
`DetailMatchStrip` (bound + item match only) → image → explorer → full spec sections (collapsed rhythm
unchanged) → pricing table → rivals + compare links. Untouched: slug-then-id resolution, dual 308s,
JSON-LD, force-dynamic, static params, retailer href resolution.

## 3. Compare pages (final)

Shared modules: `compare-rows.ts` (13 rows OS→Security, identical-rows collapse), `compare-table.tsx`
(desktop sticky-col table + Arrow-key scroll region + `sm:` stacked cards + remove links + rival
suggestions). `/compare`: server `?ids=` resolution (misses skipped + "Not listed" honesty, cap 3),
region via existing cookie helper, personalization island. `[slugs]`: same modules + canonical 308 +
kept JSON-LD/GEO/metadata/detail links; reviewScore stars removed (ratings language forbidden);
rows consolidated 19→13.

## 4. Personalization rules (final)

`ComparePersonalization` (client island, `useSyncExternalStore` idiom): stored overall + W/C/V bars +
top-2 strengths shown ONLY when binding `bound` (fingerprint match); `stale` → existing `StaleNotice`;
`unbound` → null (specs + prices only). `DetailMatchStrip`: bound + laptopId match → overall + top-2
strengths + back-to-results; else null. NO scores are computed anywhere — display of stored values only.

## 5. Entry/exit map (final)

Results 'Compare top two' → `/compare?ids=` (scored, bound). Detail Compare button → `/compare?ids=`
(unscored unless bound personalization matches). Detail rivals → `/compare/[slugs]` (SEO pair).
Single-id compare → rival suggestions → add. Every compare view → detail links + back-to-results
(when bound) + quiz/browse exits. No dead ends; no silent bounces.

## 6–8. Exact copy / states / responsive-a11y
See traceability doc. Empty/missing/404 states honest in both themes (screenshot-verified Light+Dark
desktop, Light mobile). Tables keep labeled scroll regions; `[slugs]` gains the Arrow-key handler the
legacy table had. One H1 per view; focus-visible inherited; reduced-motion untouched (no new animation).

## 9. Validation behavior
`parseCompareIds`: trims, drops empties, de-dupes, caps 3 (excess ignored + UI note). Unknown ids →
"Not listed" (never 404 the page). `[slugs]`: unresolvable side → `notFound()`; non-canonical order →
308. Detail unknown → redirect-trail → `notFound()` (unchanged).

## 10. Region behavior (final)
`/compare` + `[slugs]`: server cookie region for prices/JSON-LD (consistent). Detail: unchanged hybrid
(all-regions payload + client filter). Legacy "region-agnostic snapshot" mode is gone with the retired join.

## 11. Scoring languages (resolved)
Legacy `matchScore%` survives ONLY inside the dead `results-grid.tsx` (unmounted, untouched). All live
surfaces speak v3 `overall` + W/C/V or show no scores. No conversion invented between the two.

## 12. Test scenarios
New: `compare-select` (parse/cap/dedupe/href/remove/replace) + `personalization-mapping`
(selectPersonalization bound/stale/unbound, W/C/V passthrough, strengths cap). Rewritten e2e
`results-compare.spec.ts` (stale "Your Matches" heading fixed; `?ids=` suite matches new truth).
Full suite: 10 files, 101 passed / 9 skipped. No test renders real-data detail/[slugs] (DB unreachable).

## 13. Unsupported / cannot-represent
Live canonical-308 redirect unverified (needs 2 resolvable slugs; DB ECONNREFUSED) — code-complete,
build-verified. Real-data hero/populated table/bound personalization screenshots unverified for the same
reason. laptopId→slug mapping for prettier `/compare` URLs: not built (DTO has no slugs; id-fallback
resolution is the verified mechanism).

## 14. Known limitations
DB unreachable in this environment (remote Neon ECONNREFUSED) — same environmental block as Phase 6C/6D.
`[slugs]` stars removed; rows 19→13 (shared set). Single-id rival heuristic duplicated ~15 lines with
comment (non-importable server heuristic, not abstraction-worthy).

## 15. Files changed
Modified: `src/app/compare/page.tsx`, `src/app/compare/[slugs]/page.tsx`,
`src/app/laptops/[id]/page.tsx`, `src/components/results/ResultsActions.tsx`,
`tests/e2e/results-compare.spec.ts`. Created: `src/lib/compare-select.ts`,
`src/components/compare/{compare-rows.ts,compare-table.tsx,compare-personalization.tsx,
detail-match-strip.tsx}`, tests for both, 3 docs (audit + these two). Zero diff in
engine/api/store/storage/binding/results-presentation/quiz/prisma/homepage.
