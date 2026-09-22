# SpecWise 2.0 — Questionnaire & Preference Model

Single question bank replaces `quiz-flow.tsx` + dead `questions.ts`. Only `useCase` required (Zod contract preserved).

## Questions (9 total; Quick Q1–Q5 ~60s; Advanced +Q6–Q9 ~2min)
| ID | Wording | Type / options | Meaning → dims | Kind | Cond | Info |
|---|---|---|---|---|---|---|
| Q1 | What will you mainly use it for? | single-card: Study/Office/Code/Gaming/Creative/Travel | workload prior → cpu,gpu,ram,display,battery,portability | profile | always, start | HIGH |
| Q2 | What's your max budget? | slider 200–5000 USD → localized + No-limit | price≤budget → value | HARD | always | HIGH |
| Q3 | Windows or Mac? (or no preference) | Windows/Mac/No-pref | os fit | HARD-if-set | always | HIGH |
| Q4 | How will you carry it? | Mostly-desk / Sometimes / Always-in-bag | weight bands → portability | SOFT+PRIORITY | always | MED-HIGH |
| Q5 | Battery or power — which wins? | Battery / Balanced / Performance | battery gates (8h/10h) + cpu shift | SOFT+PRIORITY+TRADEOFF | always (Quick ends) | HIGH |
| Q6 | How many apps/tabs open at once? | Light(<10) / Heavy(VM/code) / Extreme → 8/16/32GB | ram floor → ram | HARD-floor (downgradable) | Advanced; skip if Study/Office+Battery | HIGH |
| Q7 | How much do you store on-device? | Few-docs 256 / Lots 512 / Games+video 1TB+ | storage floor → storage | HARD-floor | Advanced; skip if cloud-only | MED-HIGH |
| Q8 | What matters on screen? (≤2) | Sharp-text / Smooth-motion / Vivid-color / Touch | resolution / ≥120Hz / P3 / touch → display | SOFT | Advanced; expand if Gaming/Creative | MED |
| Q9 | Tough build worth extra? | Yes / Don't-care | Al/Mg/Carbon + reviewScore → build | SOFT, never HARD | Advanced-last, skippable | LOW-MED |

**Killed:** displaySize-inches, webcam, security-features, gaming-value, upgradeability-value, cpuBrand (exact-match + Qualcomm-unmatchable), raw GB/nits/P3/TGP jargon — merged into Q1–Q8 or dropped (zero scoring use).

## Adaptive rules
Start Q1 (NEXT disabled until answered). Presets pre-fill Q4/Q6/Q7 (editable). Q8 expands iff Gaming/Creative or "screen matters"; Q6-detail iff Code/Creative/Gaming or Performance-wins; touchscreen hidden iff Mac. Q4 defaults if desk+Performance; Q9 skipped if low-tier budget; Q7 skipped if cloud-only. Every Q skippable except Q1. Back preserves (same `specwise-*` keys); Review = editable chips; completion = Q1+Q2 → "See 12 matches". Progress = answered/visible.

## HARD vs SOFT vs PRIORITY vs DEAL-BREAKER vs TRADE-OFF
- **HARD** filters (budget, os, ram/storage floors). Fail = excluded; relaxed weakest-first with ledger flag.
- **SOFT** scores 0–1, never eliminates (portability, display, battery-fit, build).
- **PRIORITY** multiplies SOFT weights (Battery-wins → battery×2, cpu×0.7).
- **DEAL-BREAKER** user-promoted SOFT→HARD ("no 8GB" pins ram≥16; never relaxed silently).
- **TRADE-OFF** declared sacrifice shown as note ("traded ~4h battery for ~40% cpu").

## Preference vector (0–1, catalog-supported only)
`v_cpu` (Q1,Q5,Q6; HIGH; trades vs battery/portability) · `v_gpu` (Q1,Q5; HIGH iff Gaming/Creative) · `v_ram` (Q6; HIGH; floor=map) · `v_storage` (Q7; MED) · `v_battery` (Q5; HIGH; Performance caps weight 0.3×) · `v_portability` (Q4; MED; SOFT-only) · `v_display` (Q8; MED-LOW; null→pool-mean) · `v_build` (Q9; LOW; material+reviewScore) · `v_value` (Q2 spread; HIGH; price-unknown scores 0 + labeled, never 1).
Excluded (no catalog support): keyboard/feel, speakers, thermals/TGP, measured-nits, serviceability, webcam-quality, ports-adequacy.
