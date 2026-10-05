# SPECWISE V2 — PHASE ROADMAP (Phase 1)

> Dependency-ordered build sequence for Phase 2+. No implementation in this phase.

## Sequence

```
PHASE 1  Product & UX Architecture (this phase — blueprint)
   ↓
PHASE 2  Questionnaire V2 (Quick + Advanced UX on frozen CanonicalProfile contract)
   ↓
PHASE 3  Answer → Requirement Mapping (surface requirement summary + relaxation boundary;
         engine untouched, interpretation made visible)
   ↓
PHASE 4  Results V2 (best-match hero, WhyBlock order, trade-offs, why-above, ledger, onward actions)
   ↓
PHASE 5  Re-ranking / what-if (ONLY if Phase 4 exposes a scored re-run path; else refine loop.
         No interactive weight-drag unless an endpoint exists)
   ↓
PHASE 6  Homepage (promise, real-sample proof, 3-step how-it-works, workload prefills, trust, dual CTA)
   ↓
PHASE 7  Detail + Compare unification (my-match strip, verdict hierarchy, canonical scored compare,
         legacy /compare?ids= retirement path)
   ↓
PHASE 8  Images / Gallery (honest multi-image or designed fallback policy; best-match image slot)
   ↓
PHASE 9  3D (homepage atmosphere + explorer honesty fix; fenced off decision surfaces)
   ↓
PHASE 10 QA / Performance / Accessibility (contrast gates, focus parity, scroll-region parity,
         static-first motion, prod-data honesty, e2e on prod build)
```

## Why this order

- Questionnaire (2) and mapping visibility (3) precede Results (4): results can only explain what the quiz captured honestly.
- Results (4) precedes re-rank (5): what-if is meaningless before the base explanation order is proven.
- Homepage (6) follows the loop it promises: proof bands must show real output shapes from Phase 4.
- Detail+Compare (7) follow results: both consume results context (scores/explanations) that only Phase 4 stabilizes.
- Images (8) and 3D (9) are surface upgrades on stabilized templates — never load-bearing for decisions.
- QA (10) closes with prod-data honesty (empty-DB + stale-claim fixes are P0 regardless of phase order — see note).

## Out-of-order P0 (do not wait for phase sequence)

- Correct or remove stale "56 laptops" claim (live contradiction with empty prod DB).
- Decide seed/freshness ownership for prod catalog.
- Fix `robots.txt` localhost sitemap (needs prod `NEXT_PUBLIC_APP_URL`).

## Dependencies per phase

| Phase | Depends on | Produces for next |
|---|---|---|
| 2 Questionnaire | Phase 1 categories + CanonicalProfile contract (frozen) | Valid profiles with sticky region, inline validation, frozen steps |
| 3 Mapping | Phase 2 profiles | Visible requirement summary + relaxation boundary pre-rank |
| 4 Results | Phase 3 interpretation + engine payload (unchanged) | Explained ranking + shortlist handoff |
| 5 Re-rank | Phase 4 onward actions | Either scoped re-run loop or deferred interactive weights |
| 6 Homepage | Phase 4 output shapes (real proof) | Dual on-ramp converting both intents |
| 7 Detail+Compare | Phase 4 context contract | Unified scored compare; recommendation-aware detail |
| 8 Images | Phase 4/7 image slots | Honest imagery policy |
| 9 3D | Phase 6/7 templates | Fenced atmosphere + honest explorer copy |
| 10 QA | All above | Release gates (contrast, focus, motion, e2e-prod, data honesty) |

## What each phase must NOT do

- None may change v3.1 scoring/ranking/explanation semantics (MUST PRESERVE boundary).
- None may add accounts, social, chatbots, wishlists, reviews, price alerts, checkout (deferred list).
- No phase ships with fabricated intelligence (copy, viz, 3D, or imagery implying unheld knowledge).
