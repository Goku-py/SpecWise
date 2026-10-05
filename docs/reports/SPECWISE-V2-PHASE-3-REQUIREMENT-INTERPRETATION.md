# SPECWISE V2 — PHASE 3 REQUIREMENT INTERPRETATION (as implemented)

> Status: IMPLEMENTED. New: `src/lib/recommend/v3/interpret.ts` (`interpretProfile`,
> `RequirementInterpretation`), `src/components/quiz/ReviewSummary.tsx` (presentational review),
> `src/lib/recommend/v3/__tests__/interpret.phase3.test.ts` (18 tests). Changed: `src/components/quiz/V3Quiz.tsx`
> (local `reviewing` mode only). Engine, store, schema, POST contract: untouched (verified §16).
> Companion matrix: `SPECWISE-V2-PHASE-3-INTERPRETATION-MATRIX.md`.

## 1. Purpose
After Quick + optional Advanced, show "Here's what we understood" BEFORE ranking: what matters, what was
inferred, what is hard, what is preference, workload signals, conflicts, never-relaxable vs relaxable
constraints. User chooses [Show my matches] (existing POST verbatim) or [Go back and refine] (answers intact).

## 2. Input profile
The live Zustand `CanonicalProfile` (schemaVersion v3; region/currency; workloads[]; budget{min,max,noMax};
priorities[]; requirements[]). No transformation, no copy: `interpretProfile(profile)` is a pure,
deterministic function of it, called at review-open render time.

## 3. Interpretation model (four groups, natural labels — no Type-A/B, targetClass, IDs, CanonicalProfile, importance numbers)
- **Your workload** — selected workloads with Primary/Secondary/Occasional + gaming subtype / dev-intensity sublabels.
- **Must-haves** — profile hard requirements in plain words (filter semantics, "Only matching laptops are shown").
- **Preferences** — profile target requirements with honest notes (os-prefer genuinely ranks higher; the six
  missedPreferred-covered Prefers "flag" only; inert gpu/displaySize targets dropped silently with cited comment).
- **Constraints that will never be relaxed** ("We won't loosen") — hard os / hard refurb / hard budget-with-numeric-min
  (exact `intentHardBlocks` mirror, engine.ts:367-378).

## 4. Workload display
Labels mirror quiz cards (Coding & software / Gaming / AI & machine learning / Video & photo editing /
3D & design work / Study, work & everyday use) + importance + subprofile lines (gaming subtype, dev
Standard vs VMs/containers/builds). All-Occasional profiles carry the plain note "All workloads marked
Occasional — treated as Secondary." (mirrors requirements.ts:85-87). No invented workload claims; workload
weight influence described only as "your workload sets the balance" (Preferences fallback line).

## 5. Must-have display
Every profile hard requirement rendered (os name, "16 GB RAM or more", "1 TB storage or more",
"Dedicated graphics", "No heavier than X kg", "X or more CPU cores", "X GB or more graphics memory",
"X Hz or faster display", "X hours or more battery", "Ports: …", "RAM upgradable / Storage expandable",
"New laptops only", budget range). Workload-provenance hards demoted to Preferences per requirements.ts:108.

## 6. Preference display
User-authored targets only (workload proposals never shown — internal mechanics). Honest notes per §3.
Empty state: "No extra preferences — your workload sets the balance." (truthful: weights always apply).

## 7. Non-relaxable constraints
"We won't loosen" lists ONLY hard os / hard refurb / hard budget-with-numeric-min present in the profile.
Informational only; relaxation behavior unchanged. Section hidden when empty.

## 8. Relaxable constraints
"May be adjusted if needed" lists the user's remaining hards in exact RELAX_OPS order with verified copy:
budget "widened in steps if needed (first +10%, then up to +25% total)"; storage/ram "lowered one step";
gpu "treated as a preference"; vram/refresh/displaySize/weight/battery/cores "dropped if needed"; ports
"loosened one port at a time"; upgrade "treated as a preference." Preceded by honest framing: "If nothing
matches exactly, SpecWise may adjust some constraints in a defined order." No ranking performed here; no
future-relaxation faked beyond verified ops. Section hidden when empty.

## 9. Contradictions
Only the two engine-verified cases, via direct `buildRequirements` call (client-safe: requirements.ts →
types + pure workloads; regions.ts import-free — verified): macOS-hard + gpu-hard → engine string verbatim
(already plain: "macOS laptops in this catalog use integrated graphics — … OS kept, GPU treated as
preferred."); workload-hard demotion → "X from your workload is treated as a preference, not a strict
filter." Helpful, never alarming; never "impossible". Proposal-override notes skipped (internal).

## 10. Budget/region
Region label from REGIONS + exact budget rendering via Intl keyed by currency (₹1,20,000-style grouping
for INR): min–max range / "From X" / "Up to X" / "No maximum" variants. Matches the exact profile sent to
the engine — currency, min, max, noMax never altered. Mono reserved for region + budget values only.

## 11. Derived workload interpretation
Deliberately minimal: workloads + importance + subprofiles + occasional note. No per-component claims
("CPU matters more") — weights are real but per-dimension assertions would overclaim the blend. Proposals
(Type-A seeds) never surfaced.

## 12. Review flow
Both submit buttons (Quick step-3, Advanced) validate (existing guards) → enter local `reviewing` mode
(NOT a step; progress frozen; step content unmounted) → ReviewSummary renders fresh interpretation →
[Show my matches] runs existing `submit` POST verbatim → [Go back and refine] exits mode, step + answers
intact, focus restored to submit button. Invalid (workloads empty) → review cannot open, route step 0.

## 13. Refine behavior
Single source of truth preserved: interpretation re-derives every render from the store profile. Edits
(deselect workload/priority incl. Phase 2 pruning, OS/budget changes) update the next review
automatically. Tested via snapshot pairs (stale entries disappear). Nothing to invalidate, no second state.

## 14. Invalid states
No valid workloads → no review (step 0). Budget error → blocked pre-review (existing inline error).
Review performs no ranking; catalog-empty produces nothing (results-phase concern, out of scope). No fake
intelligence at any point.

## 15. Accessibility
Focus to review heading on open (`tabIndex=-1`), restored on close; semantic sections with aria-labels;
Sans explanation voice; inline errors keep `role="alert"`; conditional render (no aria-hidden complexity);
no color-alone semantics; reduced-motion plumbing untouched (no new animation).

## 16. Engine-preservation proof
`git status/diff`: no changes to `src/lib/recommend/v3/{engine,scoring,requirements,workloads,capabilities,
types,validate,quiz}.ts`, schema, or API routes. `useV3QuizStore.ts` diff is Phase 2's only
(budgetRangeError/prune/sticky-reset — zero review refs). POST body/scoring/validation identical.
`interpret.ts` only READS via `buildRequirements` + `REGIONS`; never-relax/RELAX-order/inert rules are
comment-cited mirrors, covered by 18 tests asserting parity with engine behavior.

## 17. Test cases (18, all passing)
Study/office · gaming · development · AI/ML · mixed gaming+dev · hard OS · budget min/max · no-maximum ·
new-only refurb · weight constraint · macOS+gpu conflict · honest-note assertions · workload-hard demotion ·
2 stale-removal snapshot pairs · 2 inert-drop (gpu-target, displaySize-target) tests.

## 18. Unsupported items
- displaySize-Prefer / gpu-Prefer display: CANNOT REPRESENT (verified triple-inert) — dropped, commented.
- Interactive re-rank/what-if: no endpoint — out of scope (Phase 5).
- Per-dimension workload-influence claims: blend is real but unquotable per-dim — generic wording only.
- Weight control for non-carry/non-study users: no UI control exists (dead `weight` key) — documented Phase 2 gap, unchanged.
- Share-link-only hard refresh/battery: tolerated as hard filters (engine consumes them) — honest boundary.
- `submitted` flag: no engine reader — untouched.

## 19. Known limitations
- `formatBudgetRange` locale keyed by currency (identical output for all six pairs; no per-region plumbing).
- `upgrade-prefer` shares upgrade text (no UI path; share-link defensive).
- Demoted workload gpu/displaySize hards dropped as inert rather than shown.
- Device-lab responsive pass + build/e2e not run (same standing limitations as Phase 2; queued Phase 10).
