# SPECWISE V2 — PHASE 6 HOMEPAGE (as implemented)

> Status: IMPLEMENTED. Homepage surface only. Engine, questionnaire, results, compare,
> detail, image pipeline, 3D infrastructure untouched (verified: `git diff --stat` empty on
> `src/lib/recommend src/app/api src/app/quiz src/app/compare src/app/laptops src/app/category prisma scripts`).
> Companion: `SPECWISE-V2-HOMEPAGE-TRACEABILITY.md`.

## 1. Homepage goals
First-time visitor understands in seconds: what SpecWise does (workload→matched laptops),
who it is for (people who know their work, not specs), why it differs (profile-first explained
ranking, never sold), how the process works (3 steps, ~2 min), why it is trusted (no sponsors,
shown trade-offs, honest limits), and what to do next (Find My Laptop primary; Browse secondary).

## 2. Final section order (exactly 6)
1. HERO (`hero.tsx` + retained `HeroLaptopWrapper`) — eyebrow SPECWISE, H1 "Stop shopping by
   specs. Start shopping by how you actually use your laptop.", lede (workload→requirements→
   ranked-with-reasons), PRIMARY [Find My Laptop] → `/quiz`, subordinate text-link
   "Browse laptops →" → `/laptops`, microline "Quick match · About 2 minutes · No account".
2. REAL-SAMPLE PROOF (`sample-proof.tsx`, NEW server component) — "Example output" eyebrow;
   static DEMO fixture (see §4); caption states shape-not-live.
3. HOW IT WORKS (`how-it-works.tsx`, NEW server component, keeps `id="methodology"` anchor) —
   01 "Tell us how you use your laptop." / 02 "SpecWise translates that into requirements and
   weighs what matters." / 03 "Get ranked laptops with reasons, trade-offs, and confidence."
   + "Quick match takes about 2 minutes. Fine-tuning is optional — skip anytime." No internals jargon.
4. WHAT SPECWISE UNDERSTANDS (`workload-entries.tsx`, NEW server component, `id="workloads"`) —
   6 cards from `WORKLOAD_PREFILL_META` + `WORKLOAD_IDS`, one "Start match →" prefill link each
   via `buildWorkloadPrefillPath` (same CanonicalProfile path as the quiz; no second engine).
5. TRUST (`trust.tsx`) — "Rankings are never sold" (zero-bias + firewall + one-line commission
   disclosure) / "Explained ranking" (strengths, compromises, conflicts shown) / "Honest limits"
   (verbatim live counts + `honestLimitsCopy` zero-state: "The catalog is growing — matching runs
   against whatever is live.").
6. FINAL CTA (`final-cta.tsx`) — primary [Find My Laptop] → `/quiz`; subordinate
   "Browse laptops →" → `/laptops`; microline kept.

## 3–8. Hero / proof / how-it-works / workload entries / trust / CTA
See §2 + traceability matrix. CTA hierarchy: recommendation CTA is the only Button-styled action
per viewport; browse is always a quiet text link — never "choose between two products."

## 9. Navigation
Global `NAV_ITEMS` → Recommend (`/quiz`) / Browse (`/laptops`) / About (`/about`) — all routes
verified to exist. No Admin exposure, no account/login links.

## 10. Visual design
Assured/Warm/Restrained: Sans headlines/body/CTAs; mono only eyebrows, DEMO badge, counts, microcopy.
No glassmorphism, no decorative gradients, no glow beyond existing tokens, no icon grids, no badge
walls, no fake dashboards. Verdict-first hierarchy; 3D retained only in hero (existing component,
existing "Illustrative, not a recommendation" captions).

## 11. Motion
No new animation; no `motion/react` on homepage; no scroll-reveal. Hero keeps its existing
reduced-motion-respecting cycle/poster behavior (3D infra untouched).

## 12. Responsive behavior
Server-rendered sections stack naturally (grid → single column); budget-style squeeze avoided (no
dense multi-col at 360px by construction); proof card + workload cards are single-column mobile.
Device-lab screenshot pass NOT executed (no browser harness wired in this environment — see §18).

## 13. Accessibility
Single H1 (hero). Sections via `Section` primitive (`aria-labelledby`). Workload entries are plain
links with meaningful names ("Start match →" + card label context). Demo bars `aria-hidden` with
`sr-only` honest text. Decorative SVG `aria-hidden`. No color-alone semantics (DEMO badge is text).
Keyboard/focus behavior unchanged (native links/buttons + existing focus rings).

## 14. Performance
Removed the homepage's `getActiveCatalog` + illustrative-machines resolution (one fewer DB read path,
no 18-slug resolution per render). `getCatalogStats` (3 lightweight counts) retained. New sections are
server components (zero client JS added). 3D stays `ssr:false` + IO-gated + poster fallback (untouched).
No new dependencies.

## 15. Live-data vs demo-data handling
RULE: live data = server-computed, rendered verbatim (Trust counts). Demo data = hardcoded fixture,
always badged "DEMONSTRATION — sample answers, not live data" with shape-not-live caption. No laptop
names, prices, retailer offers, reviews, or counts in the demo. No "56 laptops" or any inventory claim
anywhere.

## 16. Removed / retired homepage patterns
Equal-weight landing actions · quiz-only FinalCta (now dual, subordinated) · illustrative catalog proof
(`CatalogProof` + view removed from tree; files dormant on disk) · ephemeral "Preview here" glow +
`WorkloadProvider`-driven selection UI (`WorkloadExperience`, `HardwareStrip` removed from tree;
provider kept as harmless passthrough for hero visual) · methodology comparison-table/dashboard density
(`MatchingEngine` removed from tree) · Machines anchor (nav no longer references `#machines`).

## 17. Tests
`src/components/landing/__tests__/homepage.phase6.test.ts` — 9/9 pass (DOM-free): prefill path for all
6 workload ids decodes to a CanonicalProfile with that workload primary; fixture constants (92,
"Closest match", DEMO badge); `honestLimitsCopy` zero/non-zero branches.
`npm run test:unit`: 4 files, 45 passed + 3 skipped (pre-existing scope, unaffected).

## 18. Known limitations
- Device-lab visual pass (360/390/768/1024/1440) not executed — no browser harness available; hierarchy
  verified by construction only. Queued for Phase 10 QA.
- `next build` not run (needs seeded DB state; shared tree also holds other phases' uncommitted work —
  a build result would be unattributable). `tsc --noEmit` exit 0 covers the change surface.
- `WorkloadProvider` kept as passthrough (hero visual context); harmless, removable when hero is revisited.
- Dormant files (`workload-experience`, `hardware-strip`, `matching-engine`, `catalog-proof*`,
  illustrative data) left on disk for Phase 10 cleanup decision — not deleted in this phase.

## 19. Phase 7 handoff
Homepage enters: `/quiz` (primary + 6 prefill paths), `/laptops` (subordinate), `/about`,
`#methodology` + `#workloads` anchors. Homepage promises that Phase 7 must keep: results explain
themselves with trade-offs (built Phases 3–5), detail/compare reachable from results (Phase 7),
no second ranking path (prefill reuses the single quiz→engine path — verified by test).
