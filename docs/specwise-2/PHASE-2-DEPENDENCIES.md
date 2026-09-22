# Phase 2A — Dependency Map (pre-implementation)

Read-only trace. No code deleted.

## Consumers of `scoreLaptops` (authoritative after Phase 2, sole entrypoint)
| Consumer | File | Role after Phase 2 |
|---|---|---|
| quiz API | `src/app/api/quiz/route.ts:4,44` | authoritative caller (unchanged import) |
| category page | `src/app/category/[useCase]/page.tsx:9,38` | authoritative caller (unchanged import) |
| scoring tests | `tests/scoring/*.test.ts` | regression gate (golden updated, see IMPLEMENTATION.md) |

## Duplicate rankers (demoted, not authoritative)
| Implementation | File | Phase 2 fate |
|---|---|---|
| `decomposeScores` + `WEIGHTS_8` mirror | `src/lib/decomposition.ts` | rewritten as derived projection (imports shared band fns + v1 weights); display-only |
| slider weighted-mean re-rank (overwrites `matchScore`) | `src/app/results/results-view.tsx:106-119` | replaced by `rescoreWithOverlay` → same engine; labeled "Adjusted view — not saved" |
| `computeRankedBreakdown` sort-by-local-total | `src/lib/view-models.ts:53-69` | kept for delta panels only; no longer a ranker (sorts the already-ranked input for display deltas) |

## Questionnaire state
- `src/components/quiz/quiz-flow.tsx` (presets, `specwise-quiz-answers/step/mode` keys) + `gate-step.tsx` → UI untouched in Phase 2; new canonical adapter reads legacy `QuizAnswers`.
- `src/lib/validation.ts` (`QuizAnswersSchema`) → kept (compat, accepts dead fields); adds min≤max refinement. New canonical Zod schema lives in `recommendation/questionnaire.ts`.
- `src/lib/questions.ts` → untouched (category page needs `USE_CASE_LABELS`); dead bank documented, not deleted (has a live consumer for labels).
- `src/lib/types.ts` (`QuizAnswers`, `ScorableLaptop`, `RecommendedLaptop`) → additive-only edits (`priceMissing?`, v2 explanation fields).

## Persistence / compare
- `specwise-results/answers` (results-view), `?ids=` + pool lookup (compare-content), `fetchRecommendations` (`lib/api.ts`), `toScorable` (`lib/catalog-cache.ts:107`) → all preserved; `toScorable` gains `priceMissing` flag (bug fix: was `price=0`).

## Dead inputs (no scorer consumer after Phase 2)
`displaySize`, `webcam`, `security`, `gaming` (scoring; kept as reason-only triggers), `upgradeability` (scoring; kept as reason/bonus triggers), `ports` + `cpuBrand` (kept as legacy-compat HARD with fallback-skip + ledger, since old callers/tests emit them; new Q-bank never produces them).

## Test dependencies
`tests/scoring/fixtures/{tiny,catalog}.ts` (unchanged) · `use-cases.test.ts` golden (recomputed — intentional) · `filters.test.ts` relaxation-pass test (rewritten to ledgered contract) · `answers/f-score/reasons.test.ts` (preserved — reason triggers + caps + monotonicity kept).
