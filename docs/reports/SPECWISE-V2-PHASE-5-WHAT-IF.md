# SPECWISE V2 — PHASE 5 WHAT-IF (as implemented)

> Status: IMPLEMENTED as refine-and-rerun (Outcome B). No new scoring endpoint, no client
> re-scoring, no interactive controls. Engine untouched (verified: `git diff --stat` on
> `src/lib/recommend prisma src/app/api/quiz` is empty).
> Companion: `SPECWISE-V2-WHAT-IF-TRACEABILITY.md`.

## 1. Direct re-score audit

Question: does a verified `USER PRIORITY CHANGE → SERVER RE-SCORE → NEW RecommendationDTO` path exist?
Answer: NO.
- `POST /api/quiz` accepts only a full CanonicalProfile and runs the full pipeline; no partial
  re-score function, server action, or weight-tweak endpoint exists in `src` (grep for
  rescore/rerank/what-if returns only "no re-ranking" comments).
- The only real path is full-profile POST. Building interactive controls on top would require a new
  endpoint (forbidden) or client fake-scoring (forbidden). Hence OUTCOME B.

## 2. Chosen UX model: REFINE-AND-RERUN

Results → [Change my priorities] → questionnaire with all answers restored (existing refine
hydration, verified by reading, not rebuilt) → edit → existing review step → existing POST →
binding + blobs replaced → `/results`. The user feels "I changed something and SpecWise
recalculated" — literally true: every ranking change comes from the V3.1 engine.

## 3. Why this model

Prefer-OPTION-B rule from the phase brief applies directly: no verified server re-score path makes
Option A (interactive controls) incorrect regardless of visual appeal; Option C (dedicated page)
adds architecture for zero engine support. Refine-and-rerun reuses three already-verified mechanisms
(hydration restore, review, POST) plus one small addition (binding).

## 4. Profile state behavior

- Single profile object in store; quiz restores last-submitted profile when no share payload.
- Submit writes results + profile + NEW binding `{ fingerprint }` for the exact POSTed profile.
- Re-submit overwrites all three atomically-in-practice: old results can never present as new.
- Start over clears all three v3 keys and routes to `/quiz`.

## 5. Before/after behavior

Not implemented as a ranking UI (requires direct re-ranking, Outcome A). The "after" IS the new
results page; the "before" is replaced, never shown side-by-side (no history DB per Part 12; true
side-by-side remains Phase 7). Change summary = the new results' own ledger/contradictions blocks.

## 6. Supported controls

Only engine-supported fields, all inside the existing questionnaire: 6 priorities (max 2),
RAM/storage/OS/GPU/weight must-haves + prefers, full Advanced matrix, budget, region. No CPU/GPU/RAM
weight sliders or artificial weighting (Part 9 respected).

## 7. Unsupported controls

Interactive priority drag-to-rerank, what-if sliders, before/after deltas ("X caused +N points"),
permanent what-if share links (sharing stays answers-only via existing `?s=`). None exposed.

## 8. Results replacement behavior

New DTO overwrites `specwise-v3-results`; new profile overwrites `specwise-v3-profile`; new
fingerprint overwrites `specwise-v3-binding`. Readers always see a consistent triple.

## 9. Stale-result handling

`bindingStateFor(storedProfile, binding)`: bound (fingerprints match) → normal render; stale
(binding exists, profile missing/mismatched) → existing StaleNotice UI (no new banner style);
unbound (pre-Phase-5 stored results, no binding) → legacy region-drift behavior. Never a dead end.

## 10. Accessibility

No new controls beyond two buttons reusing `buttonVariants` (keyboard-native, visible focus).
Stale states reuse existing role/announcement patterns. Ordering comprehensible without animation
or color (no animation added at all).

## 11. Responsive behavior

Zero layout added (two buttons in existing flex-wrap row). 360–1440 trivially sound; no slider
dashboard exists to break. Device-lab pass queued for Phase 10 QA (same as prior phases).

## 12. Testing

New `src/lib/__tests__/result-binding.test.ts`: 12 pass / 3 skipped (browser-only cases via repo
`describe.skip` NOT-RUNNABLE convention). Covers fingerprint stability, key-order invariance,
priority/workload/budget sensitivity, all three binding states, validator rejects, round-trips,
B-after-A replacement. Engine suites before/after: 51 → 51 (no output change with unchanged
profiles — Part 20 guard satisfied). `test:unit`: 4 files, 45 pass / 3 skipped (delta exactly +12).
Phase-3/4 + engine + store suites: 5 files, 80 pass / 6 skipped, no regressions.

## 13. Known limitations

- FNV-1a fingerprint is tamper-evident for binding only, not security.
- Binding shares localStorage durability (server revalidates on submit regardless).
- DOM/clipboard/submit-path wiring covered by skipped-with-reason tests only (needs browser/E2E harness).
- Orphaned binding after `ResultsStates` Start-over is harmless (next submit overwrites; absent results never stale-gate).

## 14. Deferred interactive ranking

Interactive what-if remains deferred until a real server re-score path exists. No endpoint was
created for it; no client approximation exists to remove later. Phase 7 owns compare; shared-profile
and history features stay deferred per Phase 1.

## 15. Phase 6 handoff

Homepage (next per roadmap) can promise "change priorities → recalculated matches" truthfully; proof
bands must use real output shapes. Nothing in Phase 5 constrains homepage templates. Binding key
`specwise-v3-binding` is a documented persistence contract addition (see traceability doc).
