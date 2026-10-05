# SPECWISE V2 — USER JOURNEY (Phase 1)

> Conceptual flow. No implementation. Engine references are to verified v3.1 behavior
> (see `SPECWISE-V2-RECOMMENDATION-AUDIT.md`). Statuses UNKNOWN/PARTIAL from Phase 0 are preserved.

## Stage map

```
LANDING → START RECOMMENDATION → UNDERSTAND USER → BUILD USER PROFILE
  → ANALYZE REQUIREMENTS → RANK LAPTOPS → EXPLAIN RECOMMENDATIONS
  → COMPARE → INSPECT DETAILS → MAKE DECISION
```

## 1. LANDING

- GOAL: Establish trust + orient within seconds.
- USER NEED: "Is this for me? How does it work? Can I trust it?"
- SYSTEM RESPONSIBILITY: State promise, workload coverage, determinism, evidence model. Offer dual on-ramp (match vs browse).
- OUTPUT: Informed intent to start recommendation or browse.

## 2. START RECOMMENDATION

- GOAL: Commit to personalized path with minimal friction.
- USER NEED: "How long? What do you need from me?"
- SYSTEM RESPONSIBILITY: Set expectation (Quick ~2 min, Advanced optional, step count frozen and declared up front). Offer resume/browse escape.
- OUTPUT: Started CanonicalProfile draft.

## 3. UNDERSTAND USER (Quick quiz)

- GOAL: Capture workload / budget / priorities / must-haves in plain language, no spec jargon.
- USER NEED: Short questions that feel relevant; skippable where unsure; inline validation (min>max blocked client-side); region sticky across reset/revisit.
- SYSTEM RESPONSIBILITY: Map answers to `workloads[]`, region, budget, priorities (max 2), `requirements[]` hard/target split. Conditional questions (GPU if gpuRelevant, weight if carry/travel) appear with a one-line reason.
- OUTPUT: Valid Quick profile.

## 4. BUILD USER PROFILE (conditional Advanced)

- GOAL: Add precision only where it changes ranking.
- USER NEED: "Only ask if it matters." Explicit optional gate, skippable anytime, Quick answers preserved.
- SYSTEM RESPONSIBILITY: Workload-gated Advanced fields (cpu-hard, vram, size/refresh/battery targets, ports, upgrade, refurb). Never interleaved into Quick; separate mode, no step numbers (fixes 4→5 progress-shift defect).
- OUTPUT: Complete CanonicalProfile.

## 5. ANALYZE REQUIREMENTS

- GOAL: Make system interpretation visible before ranking.
- USER NEED: "What did you think I meant?"
- SYSTEM RESPONSIBILITY: Summarize inferred hards, targets, contradictions (e.g. macOS+dGPU), and what will never be relaxed (os/refurb/budget-min). User reviews, then ranking runs.
- OUTPUT: Reviewable requirement summary + relaxation boundary.

## 6. RANK LAPTOPS

- GOAL: Produce deterministic, diverse, explainable set. No user action; system must show work is real (staged checklist, never fake percentages).
- USER NEED: Confidence that scoring happened.
- SYSTEM RESPONSIBILITY: Execute v3.1 pipeline — hard-filter → ordered relaxation ≤3 with ledger → W/C/V scoring → deterministic sort → diversity cap 2/brand+model → price-missing lane → top-12 slice.
- OUTPUT: Ranked 12 with full explanation payloads.

## 7. EXPLAIN RECOMMENDATIONS (Results)

- GOAL: User can defend top-3 choice to self or others.
- USER NEED: "Why this over that? What am I giving up? What if my priorities change?"
- SYSTEM RESPONSIBILITY: Present best-match hero (verdict + donut + W/C/V + image + price), strengths-first WhyBlock, trade-offs (`compromises` + `missedPreferred`), why-above-next (deltas >0.02 vs #2), collapsible confidence/ledger/contradictions, and onward actions (compare top 3, detail, fine-tune/re-run, share-stretch). No LLM prose; evidence strings verbatim.
- OUTPUT: Comprehension + shortlist intent.

## 8. COMPARE

- GOAL: Side-by-side finalist adjudication (validation, not discovery).
- USER NEED: "Between these 2–3, which trade-off do I accept?"
- SYSTEM RESPONSIBILITY: Single canonical compare on `/compare/[slugs]` carrying scores + explanations forward when entered from results; specs+prices-only mode with banner otherwise. Scores first, prices second, differ-rows-first specs third (~10 rows, identical collapsed). Sticky "Back to my results".
- OUTPUT: 2–3 finalists differentiated.

## 9. INSPECT DETAILS

- GOAL: Verify single candidate deeply.
- USER NEED: "Should I actually buy THIS one — given MY answers? Where do I buy it?"
- SYSTEM RESPONSIBILITY: Recommendation-aware detail: my-match strip (when referred), verdict-for-you (strengths/compromises), early price+purchase, workload-relevant specs, collapsed full specs, 3 rivals + compare CTA, back-to-journey footer.
- OUTPUT: Purchase-ready confidence or return to compare/results.

## 10. MAKE DECISION

- GOAL: Exit to purchase or save/share state. Must stop being a cul-de-sac.
- USER NEED: "Where to buy? Can I send this to a friend / revisit?"
- SYSTEM RESPONSIBILITY: Region-aware outbound pricing links, shareable profile+results state, return path. Direct visits without state get explained empty states, never silent bounces.
- OUTPUT: Decision handoff (outbound) or persisted share link.

## State-transition summary

| Transition | Mechanism (V2 intent) |
|---|---|
| Landing → quiz | Direct CTA or workload prefill `?s=` (keep; kill ephemeral glow) |
| Quiz in-progress | Profile draft (region sticky; step count frozen) |
| Quiz → results | POST → ranked DTO; requirement summary shown pre-rank |
| Results → compare | Shortlist handoff with scores/explanations preserved |
| Results/compare → detail | Profile context carried; my-match strip |
| Any stateful page direct-visited | Explained empty state + CTA, never silent bounce/blank flash |
| Decision | Outbound retailer link or shareable profile/results link |

## Defects this journey retires (from Phase 0)

Results cul-de-sac · dual-compare discontinuity · silent results bounce · blank-flash ·
4→5 progress shift · noisy prefer→hard chips · invisible weight-cap · `reset()` region loss ·
quiz-only landing CTA · ephemeral "Preview here" · compare-A always-empty for v3.
