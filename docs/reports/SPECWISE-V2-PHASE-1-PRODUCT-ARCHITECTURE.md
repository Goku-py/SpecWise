# SPECWISE V2 — PHASE 1 PRODUCT & UX ARCHITECTURE (Master)

> Phase 1 is PRODUCT AND UX ARCHITECTURE. No implementation, no source changes, no schema,
> engine, or questionnaire modifications were made. Phase 0 reports
> (`SPECWISE-V2-PHASE-0-AUDIT.md` + 6 satellites) are the source of truth for what exists.
> Satellites for this phase: `SPECWISE-V2-USER-JOURNEY.md`,
> `SPECWISE-V2-INFORMATION-ARCHITECTURE.md`, `SPECWISE-V2-RESULTS-ARCHITECTURE.md`,
> `SPECWISE-V2-DESIGN-DIRECTION.md`, `SPECWISE-V2-PHASE-ROADMAP.md`.

## 1. Executive product direction

SpecWise V2 is a laptop decision engine presented as a simple, intelligent buying conversation:
"Tell SpecWise how you actually use a laptop. SpecWise figures out what hardware fits you."
Profile-first, filter-second; every ranked position reproducible from CanonicalProfile, every pick
carrying its compromises in the open. Technical depth stays available but never required.

## 2. Product problem

Laptop buying is workload-mismatched: catalogs force users to translate "I do AI/ML + dev in India
under ₹1.2L" into cores, VRAM, nits, Wh — then rank by popularity/price/sponsor with opaque ordering.
SpecWise solves translation + trust: plain-language input, deterministic workload-matched ranking,
evidence for every pick.

## 3. Target user

1. **Workload buyer** (e.g. CS student / junior dev): knows use-case + budget, not specs. Wants 3 defensible options, not 50 filters.
2. **Constraint buyer** (e.g. freelance video/photo): hard constraints (OS, refurb, ports, battery). Wants to know what must be sacrificed and why.

## 4. Core product promise

"Tell us what you do and what you can spend; get 12 workload-matched laptops ranked
deterministically, with proof for every pick." Main action: complete profile → inspect explained
ranking → compare 2–3 finalists → open detail → decide. Differentiator vs catalog: profile-first
ranking where every position is reproducible and every compromise disclosed. Feeling: a knowledgeable
friend ("these 3 fit you, here's what each gives up, here's what I bent to show you this one") — not a shelf.

## 5. Product principles

User language first · technical complexity behind the interface · recommendations must be explainable ·
trade-offs always visible · never fabricate intelligence · progressive disclosure · every interaction has
a purpose · recommendation and comparison stay connected · engine semantics inviolable · depth available, never forced.

## 6. Existing-state implications from Phase 0

- v3.1 engine (0.65W+0.20C+0.15V; value 0.55/0.20/0.25; 9 dims; ordered ≤3 relaxation with os/refurb/budget-min never; deterministic sort; diversity 2; missing-lane; slice 12) is the trust asset — preserve exactly.
- Explanation payload (strengths/compromises/missedPreferred/whyAbove/K-tiers/ledger/contradictions, no LLM) is the differentiator — V2 surfaces it, never regenerates it.
- Results cul-de-sac, dual-compare split, silent bounce, 4→5 progress shift, noisy prefer→hard chips, invisible weight-cap, region-losing reset are the confirmed defects V2 retires.
- Single Unsplash-only image (none on v3 results) and procedural-only 3D bound what honesty allows.
- Prod DB is EMPTY while `/about` claims 56 laptops; robots sitemap points at localhost — P0 data-honesty items outside phase order.

## 7. V2 user journey

LANDING → START RECOMMENDATION → UNDERSTAND USER → BUILD USER PROFILE → ANALYZE REQUIREMENTS →
RANK LAPTOPS → EXPLAIN RECOMMENDATIONS → COMPARE → INSPECT DETAILS → MAKE DECISION.
Full stage table (GOAL / USER NEED / SYSTEM RESPONSIBILITY / OUTPUT) in `SPECWISE-V2-USER-JOURNEY.md`.
New stage vs today: ANALYZE REQUIREMENTS (visible interpretation + relaxation boundary pre-rank) and
MAKE DECISION (shareable/outbound exit replacing the cul-de-sac).

## 8. Information architecture

Primary: HOME, RECOMMEND, RESULTS, COMPARE, LAPTOP DETAIL. Secondary: CATALOG, CATEGORY/USE-CASE.
Supporting: ABOUT, ADMIN. CATEGORY is a preset-profile funnel, not a parallel ranker; CATALOG is
downstream infrastructure, not a peer. Rule: scores/K-tiers/relaxation language only with a bound
CanonicalProfile — without profile, specs + prices only.

## 9. Route relationships

```
HOME ├── RECOMMEND → RESULTS → COMPARE (subset, inherits scores) / DETAIL (+profile banner)
     ├── CATALOG → DETAIL (+RECOMMEND CTA) ├── CATEGORY → prefilled RECOMMEND → RESULTS
     ├── DETAIL (stateless base) ├── ABOUT └── ADMIN (isolated)
```
Entry/exit rules + cold-entry guards (explained empty states, never silent bounce) in
`SPECWISE-V2-INFORMATION-ARCHITECTURE.md`.

## 10. Homepage architecture

Six sections, no feature dump: Hero (promise + single CTA + browse on-ramp + output promise) →
Proof strip (ONE real sample output, replaces illustrative CatalogProof) → How it works (3 concrete
steps with input costs) → Understands (6 workload prefill links; "Preview here" glow removed) →
Trust (3 bullets: W/C/V, confidence tiers, contradiction detection) → Final CTA (dual: match + browse).

## 11. Recommendation journey architecture

Frozen "Step N of 4" Quick flow; conditionals (GPU/weight) appear with reason lines; inline budget
validation; sticky region; post-Quick interstitial gate to optional Advanced branch (separate mode, no
step numbers); staged honest loading; explained empty states for cold entry. Interleaving, dynamic
counts, and mega-forms rejected (see §26).

## 12. Questionnaire role

ESSENTIAL: workload (+gaming subtype, dev-intensity), budget (region + Min/Max), priorities (max 2,
skippable), RAM/storage/OS must-haves (light). ASK-ONLY-WHEN-RELEVANT: deal-breakers (refurb/upgrade),
weight-cap (repair: also via travel workload, not carry-only), GPU (keep gpuRelevant gating), apps/games
detail (gaming/dev only). OPTIONAL/Advanced: battery/size/refresh targets, cpu-hard, vram-flip, ports.
INFERRED: compromises (never ask sacrifices — engine derives lowest-2). HIDDEN: abstract perf sliders,
hard/target semantics (plain tri-state: No preference / Prefer / Must-have). Region ESSENTIAL-but-sticky.
No new categories without a consuming engine field. Exact wording is Phase 2.

## 13. Results architecture

Order: best-match hero (verdict + donut + W/C/V + badge + price + modest image) → why-this-one
(strengths-first) → trade-offs (compromises + "wanted X, has Y") → why-above-next (vs #2, won+lost) →
More options #2–#12 → collapsible confidence/ledger/contradictions → what-if actions (re-run, compare,
detail, share-stretch). Interactive re-rank OUT for Phase 1 (no endpoint verified). Full field mapping
in `SPECWISE-V2-RESULTS-ARCHITECTURE.md`.

## 14. Explainability architecture

Closed field vocabulary: WHY THIS ONE (`overall`/W/C/V/`strengths`) · TRADE-OFFS (`compromises`/
`missedPreferred`/`contradictions`, always shown) · WHY ABOVE NEXT (`whyAbove` deltas >0.02 + gap;
never outside won list). Evidence strings verbatim. Forbidden: market-best claims, longevity/title
predictions, zero-compromise claims.

## 15. Comparison architecture

Canonical compare validates, never discovers. Entry: Results "Compare top 3" (primary), detail rivals,
catalog multi-select (stretch). Content priority: scores → prices → differ-rows-first specs (~10,
identical collapsed). Mandatory results-context flow on `/compare/[slugs]`; scoreless mode carries an
honest banner. Legacy `?ids=` localStorage path retired. Sticky back-to-results. Full spec dump rejected.

## 16. Laptop detail architecture

Validation stop, recommendation-aware: header (H1 + price + image) → my-match strip (referred only) →
verdict-for-you (strengths/compromises/missedPreferred) → price+purchase early → workload-relevant specs →
collapsed full specs → 3 rivals + compare CTA → back-to-journey footer. Personalized → transactional →
exhaustive → lateral → return. Current order (specs-buried price, no 2/3/5) is the spec-dump failure.

## 17. Catalog / recommendation relationship

Recommendation primary; catalog secondary (inventory truth + SEO + detail hosting). Default push is
personalized (hero, category-prefill, persistent CTAs); browse fully usable without profile but scoreless.
One-way enrichment both directions; CATEGORY = saved preset, never third ranking brain. Honest-empty
catalog while DB is 0/small — never inflate.

## 18. Design direction

Personality: Assured · Forensic · Warm · Restrained. Sans advises, mono cites (eyebrow signature kept;
3 heading idioms → Verdict/Evidence). Two-tempo spacing (verdicts breathe, evidence compacts). Cards hold
evidence, never verdicts. Accent/glow/motion scarce (one decision mark per viewport). Viz grammar: donut
= sole verdict glyph; bars for W/C/V/K (radar retired); strengths as sentences + mono tags; dual-encoded
deltas; stepped human thresholds. Images confirm, scores rank; designed fallback frames. Density: quiz
sparsest → compare densest. Dark-only kept (dashboard feel fixed by voice/density, not theme).
Details in `SPECWISE-V2-DESIGN-DIRECTION.md`.

## 19. Motion principles

Stillness default; motion explains change only: journey progress (directional slide, standardized) ·
cause-effect (preference → resettle) · ranking moves (positional, object constancy) · reasoning reveal
(verdict → evidence cascade) · loading → verdict (single count-up). Forbidden: page transitions,
scroll-reveals on decision surfaces, ambient loops off-homepage, recomputation-implying re-animation,
parallax/springs/staggers. 0.22s/700ms are ceilings. Static-first render mandatory (fix SSR flash); every
suppressed animation leaves informational equivalent.

## 20. Responsive principles

Decision surfaces REFLOW (one mental model); marketing may TRANSFORM. Mobile: verdict-first stacking,
serialized/labeled-scroll evidence, single-column quiz at 360px, 3D poster-only. Tablet: same flow, more
air; compare stays tabular. Desktop: evidence beside verdict; full-width compare with sticky identity.
Large: constrain into whitespace, never sprawl.

## 21. Accessibility principles

Contrast as release gate (fix small-accent-mono + tiny-muted first) · always-visible honest focus
(menu pattern as model) · keyboard-alone quiz with announced state · universal scroll-region parity ·
never color-alone charts · canvas/3D aria-hidden with DOM equivalents · static-first motion · truthful
headings/landmarks through retype.

## 22. Preservation boundary

- MUST PRESERVE: CanonicalProfile · V3 hard/target-A/B split · workloads+subprofiles · weights
  (0.65/0.20/0.15, value 0.55/0.20/0.25) + 9 dims · filtering + ordered ≤3 relaxation (os/refurb/budget-min
  never) · tie-break (Final→K ε→price→weight→id) · diversity 2 · full explanation payload (no LLM) · region logic.
- SHOULD REWORK: catalog (honest-empty + handoffs; kill 56-claim) · pricing freshness/transparency ·
  compare (merge onto scored canonical) · detail (profile-context layer + handoffs) · image handling
  (best-match slot + fallback policy).
- CAN REDESIGN: cache internals (determinism held) · 3D weight/role (fenced atmosphere; never decision-grade).
- DEFER: accounts/social/chatbots/wishlists/reviews/price-alerts/checkout/apps/i18n/AR/editorial-CMS/admin-analytics.

## 23. Future-phase dependencies

1 Product/UX arch → 2 Questionnaire → 3 Mapping visibility → 4 Results → 5 Re-rank (scoped or deferred) →
6 Homepage → 7 Detail+Compare → 8 Images → 9 3D → 10 QA/a11y/perf. Questionnaire+mapping precede results;
results precede re-rank and homepage proof; detail/compare consume stabilized results context; images/3D
are surface upgrades; QA closes. P0 data-honesty items (56-claim, seed ownership, robots sitemap) run
outside phase order. Full map in `SPECWISE-V2-PHASE-ROADMAP.md`.

## 24. Success criteria

Quick profile without spec knowledge · requirement interpretation visible pre-rank · strengths +
compromises + K-tier per item without opening detail · relaxed results carry ledger entries ·
unbroken RESULTS→COMPARE→DETAIL with surviving context · determinism across sessions/links ·
no scoreless-profile scores anywhere · honest empty/missing states (missing cap 3) · category preset
transparency + one-click personalize · methodology matching shipped engine · design still recognizably SpecWise.

## 25. Wireframes

Structural text/ASCII for Homepage, Recommendation start, Questionnaire shell, Analysis/loading, Results,
Detail, Compare — in `SPECWISE-V2-RESULTS-ARCHITECTURE.md` §8 (via UX partition) and summarized per-template
density in `SPECWISE-V2-DESIGN-DIRECTION.md` §10. (Consolidated note: wireframes live with the UX researcher
output inside the results-architecture satellite §8a–§8g.)

## 26. Major design decisions and alternatives

- D1 Results single-hero vs top-3 podium → single hero (engine emits one winner + pairwise deltas).
- D2 Compare entry single "Compare top 3" vs checkboxes → single button (guaranteed scored context; custom sets deferred).
- D3 Quiz frozen-4 + Advanced branch vs dynamic count vs mega-form → frozen + branch (progress trust over precision).
- D4 Homepage real-sample proof vs illustrative → real sample (illustrative proof teaches distrust).
- D5 Dark-only vs light mode → dark-only (voice/density reform fixes dashboard feel; theme split doubles risk work).
- D6 Terminal-mono vs humanist retype → Sans-advises/mono-cites (mono-everywhere is the dashboard driver; identity survives in eyebrow/badge/tabular texture).
- D7 Best-match text-only vs verdict + modest image → verdict + modest image (imagery confirms, scores rank).

## 27. Deferred ideas

Accounts/auth/wishlists · social/reviews/forums · chatbot/LLM explanations · price tracking/alerts ·
retailer checkout · native/PWA · beyond-6-region i18n · physical 3D/AR · editorial CMS · admin
analytics/A-B infra. Rationales in satellite IA/product-strategy §8 outputs (summarized): each conflicts
with deterministic-evidence positioning, needs absent infrastructure, or starves the core loop.

## 28. Open questions / unresolved decisions

1. Prod inventory truth: launch seeded catalog or recommendation-beta? Seed/freshness owner + SLA?
2. Shareable state shape: full-profile URLs vs ID-reference? Link lifetime?
3. Profile persistence: localStorage vs URL vs server? Refine/edit flow from results?
4. Legacy compare retirement: confirm killing `/compare?ids=`; indexed-URL migration?
5. Category preset authorship: who defines budget/region defaults; user-editable pre-rank?
6. Price-missing UX: is max-3-unpriced-last a visible rule? Unpriced labeling?
7. K-tier policy: demote, flag, or hide low-confidence? "Not enough evidence" threshold?
8. Image policy: multi-source, retailer hotlinks, or honest placeholders (given Unsplash-only)?
9. 3D budget: keep hero+explorer in V2 or cut to fund loop repair? Minimum brand bar?
10. About-honesty fix: who approves replacement methodology copy (pre-Phase-2)?
