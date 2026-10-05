# SPECWISE V2 — INFORMATION ARCHITECTURE (Phase 1)

> No implementation. Route map is intent; existing route shapes in
> `SPECWISE-V2-ARCHITECTURE-MAP.md` are preserved unless noted.

## Classification

- **Primary (recommendation loop):** HOME, RECOMMEND, RESULTS, COMPARE, LAPTOP DETAIL.
- **Secondary (browse/SEO):** LAPTOP CATALOG (`/laptops`), CATEGORY/USE-CASE (`/category/[useCase]`).
- **Supporting:** ABOUT, ADMIN.

## Route / relationship map

```
HOME
├── RECOMMEND (creates CanonicalProfile)
│   └── RESULTS (profile-bound, top-12 + explanations)
│       ├── COMPARE (subset 2–3 of RESULTS, inherits scores/explanations)
│       └── DETAIL /laptops/[id] (+profile-context banner when referred)
├── CATALOG /laptops (stateless browse → DETAIL; CTA → RECOMMEND)
├── CATEGORY /category/[useCase] (preset profile → prefilled RECOMMEND → RESULTS)
├── DETAIL /laptops/[id] (stateless base; enhanced when profile present)
├── ABOUT (trust/methodology)
└── ADMIN (isolated ops)
```

Judgment on the brief's example structure: broadly correct, with three corrections —
(1) RESULTS and COMPARE are state-dependent views of one recommendation, not independent
pages; (2) CATEGORY is a pre-filled RECOMMEND entry (preset CanonicalProfile), not a parallel
ranking silo; (3) CATALOG is downstream/secondary infrastructure, not a peer of RECOMMEND.

## Entry / exit rules

- HOME → RECOMMEND (primary), → CATALOG / CATEGORY (secondary), → ABOUT (trust).
- RECOMMEND → RESULTS only on valid CanonicalProfile; invalid/empty → repair, never empty results.
- RESULTS → COMPARE (shortlist handoff, scores preserved), → DETAIL, → RECOMMEND-edit (refine).
- COMPARE requires ≥2 IDs + profile context; cold entry → start/recover prompt, not empty snapshot.
- DETAIL, CATALOG, CATEGORY accept stateless/direct entry (SEO safe); DETAIL shows "why for you"
  layer when profile context is present.
- ABOUT/ADMIN never depend on recommendation state; ADMIN isolated, non-indexed.
- Rule: any page showing W/C/V scores, K-tiers, or relaxation language MUST have a bound
  CanonicalProfile. Without profile: specs + prices only.

## Page roles

### HOME
- PURPOSE: Convert skepticism to start. QUESTION: "Can I trust this to pick for my work?"
- PRIMARY ACTION: Start recommendation. SECONDARY: Browse catalog / pick use-case.
- MOST IMPORTANT: Promise + how-it-works (profile→rank→explain) + workload coverage + determinism.
- LESS IMPORTANT: 3D showpiece, catalog stats. ENTRY: direct, search. EXIT: RECOMMEND, CATEGORY, CATALOG.

### RECOMMEND (Quiz)
- PURPOSE: Build valid CanonicalProfile. QUESTION: "What do you need to know about me?"
- PRIMARY ACTION: Complete + submit. SECONDARY: Skip Advanced, edit prior answers.
- MOST IMPORTANT: 4 Quick steps + conditional Advanced fidelity; hard/target distinction hidden in plain choices.
- LESS IMPORTANT: Marketing copy. ENTRY: HOME, CATEGORY-prefill, RESULTS-refine, DETAIL-CTA. EXIT: RESULTS.

### RESULTS
- PURPOSE: Justify ranking, enable shortlist. QUESTION: "Which should I pick and what am I giving up?"
- PRIMARY ACTION: Shortlist 2–3 → Compare. SECONDARY: Open detail, refine profile, share.
- MOST IMPORTANT: Ranked 12 with strengths / compromises / missedPreferred / whyAbove / K-tier / ledger.
- LESS IMPORTANT: Full spec tables (detail's job). ENTRY: RECOMMEND or valid shared profile link only. EXIT: COMPARE, DETAIL, RECOMMEND-edit.

### LAPTOP CATALOG
- PURPOSE: Stateless exploration + SEO. QUESTION: "What do you have?"
- PRIMARY ACTION: Filter/browse → open detail. SECONDARY: "Not sure? Get matched" → RECOMMEND.
- MOST IMPORTANT: Honest inventory state (empty-state honesty while DB is 0/small), search/filter.
- LESS IMPORTANT: Scores (no profile = no scores, ever). ENTRY: HOME, search, nav. EXIT: DETAIL, RECOMMEND.

### LAPTOP DETAIL
- PURPOSE: Single-candidate truth, recommendation-aware. QUESTION: "Is THIS one right, and where do I buy it?"
- PRIMARY ACTION: Check region price + outbound; rivals/compare navigation.
- SECONDARY: Start/apply profile ("see why for you").
- MOST IMPORTANT: My-match strip (when referred), verdict-for-you, price+purchase early, workload specs, full specs collapsed, rivals.
- LESS IMPORTANT: Personalized scores when no profile present. ENTRY: CATALOG, CATEGORY, RESULTS, COMPARE, SEO. EXIT: COMPARE, RESULTS (if profile), outbound retailer.

### COMPARE (canonical `/compare/[slugs]`)
- PURPOSE: Finalist adjudication. QUESTION: "Between these, which trade-off do I take?"
- PRIMARY ACTION: Differentiate 2–3 and pick. SECONDARY: Swap candidates, open details.
- MOST IMPORTANT: Scores + explanations carried forward; prices; differ-rows-first specs.
- LESS IMPORTANT: Full spec dump. ENTRY: RESULTS shortlist; direct link with IDs+profile. EXIT: DETAIL, RESULTS.

### CATEGORY / USE-CASE
- PURPOSE: Low-friction SEO doorway for workload intent. QUESTION: "Best for gaming / dev / AI-ML?"
- PRIMARY ACTION: View preset ranking → personalize. SECONDARY: Open detail.
- MOST IMPORTANT: Preset-to-profile transparency ("assumes X budget/region — adjust") + one-click personalize.
- LESS IMPORTANT: Independent editorial ranking (must not compete with personalized trust).
- ENTRY: Search, HOME. EXIT: RECOMMEND-prefilled, DETAIL.

### ABOUT
- PURPOSE: Methodology trust + honesty. QUESTION: "How do you rank? Why trust you?"
- PRIMARY ACTION: Read → start. MOST IMPORTANT: Weight disclosure (0.65/0.20/0.15), relaxation rules, K-tiers, data freshness; MUST fix stale "56 laptops" claim. LESS IMPORTANT: Team/vision prose.
- ENTRY: HOME footer, RESULTS ("how ranking works"). EXIT: RECOMMEND.

### ADMIN
- PURPOSE: Ops (catalog/pricing/data health). QUESTION (operator): "Is data healthy?"
- PRIMARY ACTION: Manage machines/prices. MOST IMPORTANT: Empty-DB visibility, stale-claim guard. ENTRY: direct/auth only.

## Catalog vs recommendation relationship

RECOMMENDATION is primary and the only defensible differentiator (profile→rank→explain).
CATALOG is secondary infrastructure (inventory truth + SEO + detail hosting).
Personalized mode (default push): HOME hero → RECOMMEND; CATEGORY → prefilled RECOMMEND;
DETAIL/CATALOG carry persistent "Get matched" CTA. Browse mode (supported, not promoted):
CATALOG/CATEGORY/DETAIL fully usable without profile, never showing scores.
One-way enrichment: catalog/detail link INTO recommend; results/compare link OUT TO detail.
CATEGORY is a saved CanonicalProfile preset funneling to RECOMMEND/RESULTS — never a third ranking brain.
Accepted trade-off: catalog SEO traffic converts lower, but keeps inventory honest while DB is empty/small.
