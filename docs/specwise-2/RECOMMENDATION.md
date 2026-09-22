# SpecWise 2.0 — Recommendation Engine

ONE authoritative ranker replaces server F-score + slider re-rank + breakdown sort. Deterministic, no LLM.

## Capability model (raw → 0–1 + confidence)
Every capability = `{value: 0–1 | null, confidence, source: measured|claimed|inferred|missing}`. Null never coerced to 0.3/0.5.
`C_cpu` (cores/benchmark/gen) · `C_gpu` (dedicated+VRAM≥8=1, integrated banded) · `C_ram` (8/16/32+ bands) · `C_storage` (256/512/1024+) · `C_battery` (claimed-hours bands; capacity tie-break) · `C_portability` (weight bands) · `C_display` (resolution/refresh≥120/gamut-P3/touch sub-average, stated sub-weights) · `C_build` (material + reviewScore) · `C_value` (pool-relative log perf/price per region).
Supported by existing `Laptop` fields. MISSING: TGP/sustained thermals, measured nits/coverage-numeric, keyboard/feel, mic/speaker, serviceability, availability timestamps, reviewCount/source, price-validity TTL, `LaptopPrice.inStock` (snapshot-only).

## Pipeline (contract per stage)
INTENT `{useCase, hard, soft-weights, region}` → REQUIREMENTS (validate; reject dead-field leakage) → HARD CONSTRAINTS (drop failures; price-unknown quarantined, never budget-passing) → CANDIDATES → RELAXATION (ordered, ledgered, consented — §below) → NORMALIZATION (capabilities above) → WEIGHTING (versioned per-useCase matrix, sums to 1; sliders = view overlay only) → SCORING `score = Σw·C − penalties + bonuses` → TRADE-OFF (`satisfied/missed/deltaVsBest` from same C-scores) → DIVERSITY (cap near-duplicate variants, ensure ≥1 value pick if pool allows) → EXPLANATION (schema below) → RESULTS (top 12 + ledger + confidence).

## Scoring rules
- Weights from pairwise AHP → grid-fit vs golden fixtures (`use-cases.test.ts` 56-row top-3 = v0 anchor); stored in `weights.vX.json`; change requires fixture-diff review. No inline α=0.5.
- Rubric bands versioned with rationale (e.g. ram 32=1.0/16=0.8/8=0.5/else 0.2); price pool-relative only.
- priceUnknown: excluded from budget-hard pass; lane max 3 labeled "price unavailable — verify"; invariant: never ranks #1–3 above priced passer (property test).
- `macos+dedicated-gpu` = hard-conflict prompt, never silent swap.
- Penalties/bonuses (closed, versioned): refurbished −0.05 (labeled), priceUnknown −0.15, low-confidence −0.05/dim; upgradeable/expandable +0.03 each (cap +0.06).
- Tie-break: `score desc, price asc, weight asc, createdAt asc, id asc` — byte-identical for `(snapshotId, intentHash, weightsVersion, rubricVersion)`. Single `scoreLaptops()` entrypoint; delete mirror + overwrite path.

## Relaxation (ordered, explicit)
Relax one at a time: 1) storage −256 → 2) RAM −8 → 3) budget +15% (opt-in only) → 4) cpuBrand→any → 5) os→any (consent only) → 6) soft floors ignored. Protected without consent: budget cap, os. Each step logged `{constraint, from, to, reason}` and shown ("We relaxed X because least important"). Max 3 steps; then `noResultCard {closestMisses[3 + failedConstraint], editQuiz/browseCatalog/notifyMe}`, HTTP 200 + `relaxationExhausted:true`.

## Explanation (derived, not marketing)
`why[≤2]` ← top-2 `w·C` ("Top {useCase} pick: {dim} {evidence} + …") · `strengths[3]` ← top C + raw spec · `compromises` ← bottom weighted dims · `satisfied: constraintId[]` · `missed: {id, required, actual, relaxed}[]` · `whyAboveAlternative {vsId, dimsWon/Lost[{dim, delta}], verdict}` (top-3 pairwise, on demand). Slider output labeled "Adjusted view — not saved", never persisted as matchScore.

## Result experience
Primary + 11 alternatives; meter 0–100 + bands; capability profile; what-if sliders (overlay); server compare/detail scores; save = localStorage compat + shareable `/r/[id]`; empty/low-confidence ("broad match" + 1–2 follow-ups; thin-pool → relaxed labels).

## Regression hooks
Golden top-3 gate (fail CI on unapproved change); 5-row edge fixtures; property tests (determinism, price-unknown invariant, relaxation ledger completeness, explanation traceability — every field → C/ledger/flag).
