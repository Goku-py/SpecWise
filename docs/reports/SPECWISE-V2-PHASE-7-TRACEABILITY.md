# SPECWISE V2 — PHASE 7 TRACEABILITY

> Spec item → file:line → evidence. Baseline `4ffb119`. All paths under `src/`.

## A. Unification

| Spec | Implementation | Evidence |
|---|---|---|
| URL-as-state, cap 3 | `lib/compare-select.ts` | `parseCompareIds` (trim/dedupe/cap), `compareHref`, add/remove/replace |
| `/compare` server-resolves `?ids=` | `app/compare/page.tsx` | `getLaptopById` per id; misses skipped + "Not listed"; cap 3 |
| Legacy snapshot-join retired | `app/compare/page.tsx` | Retirement comment; no `readResultsSnapshot` import |
| Empty state, no localStorage | `app/compare/page.tsx` | Zero-ids branch → quiz/browse CTAs |
| Single-id rival suggestions | `app/compare/page.tsx` + `compare-table.tsx` | Same-gpu/size heuristic (commented duplicate); suggestion UI |
| `[slugs]` canonical 308 | `app/compare/[slugs]/page.tsx` | `permanentRedirect` in `generateMetadata` + body fallback |
| Shared rows (13, collapse) | `components/compare/compare-rows.ts` | 13 defs; identical-collapse helper |
| Shared table (a11y) | `components/compare/compare-table.tsx` | Sticky col, labeled region, Arrow keys, `sm:` cards |
| Exact-2 kept on `[slugs]` | `app/compare/[slugs]/page.tsx` | `resolvePair` distinct-pair logic preserved |

## B. Personalization (display-only, bound-gated)

| Spec | Implementation | Evidence |
|---|---|---|
| Bound → stored overall/WCV/strengths | `components/compare/compare-personalization.tsx` | `selectPersonalization` (pure) + island; `useSyncExternalStore` |
| Stale → StaleNotice | same | Reuses `ResultsStates` StaleNotice |
| Unbound → null | same | Specs + prices only |
| Detail strip bound+match only | `components/compare/detail-match-strip.tsx` | overall + top-2 strengths + back-to-results; else null |
| No score computation | all | Grep: no scoring imports in compare/detail additions |

## C. Entries

| Spec | Implementation | Evidence |
|---|---|---|
| Results 'Compare top two' | `components/results/ResultsActions.tsx` | `buildResultsCompareContext(dto,2)` → `compareHref`; ≥2 items only |
| Detail Compare button | `app/laptops/[id]/page.tsx` | `compareHref([laptop.id])` in actions row |
| Detail rivals → slugs | `app/laptops/[id]/page.tsx` | `canonicalComparisonPath` links preserved |

## D. Detail hierarchy

| Spec | Implementation | Evidence |
|---|---|---|
| Breadcrumb/H1/price/actions/evidence-strip/image | `app/laptops/[id]/page.tsx` | Hero block reorder; route/308/JSON-LD/rivals/pricing untouched |
| No spec-dump regression | same | Full sections retained below the decision block |

## E. Verification

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 (agent + team-lead) |
| New tests | 14/14 (compare-select + personalization-mapping) |
| Full suite | 10 files, 101 passed / 9 skipped |
| ESLint touched files | 0 errors, 0 warnings (LINT_EXIT 0); baseline 9E/7W untouched |
| `npm run build` | success |
| Routes | `/compare`, `?ids=` cap/missing, `/compare/a-vs-b`, `/laptops/unknown` → 200/404 as designed |
| Screenshots | 7 files viewed (empty Light+Dark desktop, mobile Light, missing Light+Dark, detail-404 Light) |

## F. Explicitly not done (Phase 7 scope fence)

Engine, quiz, homepage, image pipeline, full 3D, QA sweep — zero diffs. Real-data renders +
live 308 redirect unverified (Neon ECONNREFUSED; code-complete). No commit in this doc's scope
(commit recorded in Phase 7 final report).
