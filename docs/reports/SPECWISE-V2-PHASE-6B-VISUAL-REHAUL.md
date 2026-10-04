# SPECWISE V2 — PHASE 6B HOMEPAGE VISUAL REHAUL (as implemented)

> Status: IMPLEMENTED. Homepage surface only (`src/components/landing/*` — six
> section files rewritten). Engine, questionnaire, results, compare, detail, image
> pipeline, 3D infrastructure, shared `ui/*` primitives untouched. No commit
> (team-lead handles git).
> Companion: `SPECWISE-V2-PHASE-6B-VISUAL-TRACEABILITY.md`.

## 1. Before-state

Phase 6 changed homepage IA/copy (6 sections, honesty rules, prefill entries) but the
page still read as V1: centered hero (headline block + 3D laptop canvas beside it),
`Section`-shell headings repeated per section, and three card grids (proof card,
3-step cards, 6 workload cards, 3 trust cards) with identical rounded-card rhythm.
Copy was right; composition was template.

## 2. V1 / Phase-6 visual problems

1. Centered, symmetric hero with the 3D `HeroLaptopWrapper` as the visual — heavy
   client JS, and a "product render" read instead of an advisor read.
2. `SampleProof`, `HowItWorks`, `WorkloadEntries`, `Trust` all used the same
   centered-heading + uniform-card-grid pattern — four sections, one composition.
3. `FScoreMeter` (animated client component with count-up hook) shipped JS for a
   static demo number.
4. Homepage carried the 3D hero bundle (`ssr:false`, IO-gated, but still client JS
   on the landing surface).

## 3. New direction

Assured / Forensic / Warm / Restrained. Technical buying advisor, not SaaS template:
editorial splits (verdict left, evidence right), numbered ledgers, horizontal evidence
bands, dividers doing the layout work. Advisor voice in large Sans; evidence voice in
small mono. No new fonts, no new tokens, no new dependencies, no decorative animation.

## 4. Hero

Editorial 7/5 split (`hero.tsx`). LEFT: eyebrow, existing H1 copy kept verbatim,
supporting lede, primary [Find My Laptop] + Browse-laptops text link, mono microline
(all copy/links/routes unchanged). RIGHT: new lightweight server-rendered
"decision evidence" panel — `DECISION EVIDENCE` header + `ILLUSTRATIVE · DEMO VALUES`
badge, three workload→hardware translation rows, 92 / Closest-match score row with a
static bar, and a caption stating it is an example, not a recommendation and not live
data. The 3D `HeroLaptopWrapper` is removed from the homepage tree (files untouched on
disk). Zero client JS in hero.

## 5. Section composition

Each section owns a distinct composition; no repeated centered-heading pattern:

- Proof: 5/7 split — large verdict statement left, result artifact with accent rail right.
- Method: 4/8 split — sticky-style statement column + sequential rows with connective rail.
- Workloads: full-width numbered ledger with column rules (index / name / explanation+cues / action).
- Trust: 4/8 split — verdict column + evidential rows with mono metadata tags.
- Final CTA: 8/4 split — narrative statement left, actions right-aligned.
- All sections separated by `border-b` dividers; rhythm `py-16 lg:py-28` (CTA `py-20 lg:py-32`).

## 6. Typography

Large editorial display (Sans, bold, tight tracking, `text-3xl→4xl` / CTA to `lg:text-5xl`)
for key statements; normal Sans for explanations; JetBrains Mono ONLY for
eyebrows, badges, scores, metadata, hardware cues, microlines. Existing `.eyebrow`,
`.lede`, `.hero-h1` utilities reused. No new fonts.

## 7. Card / container discipline

Cards survive only as evidence containers: the hero evidence panel and the proof
artifact (with accent rail). Method steps, workload entries, and trust rows are
divider-separated rows, not boxes. No uniform card arrays anywhere on the page.

## 8. Workload entries

Six numbered ledger rows (`01–06`), each with strong Sans name, concise blurb
(`WORKLOAD_PREFILL_META`, unchanged), mono hardware-cue line (new generic
`WORKLOAD_CUES` map — category language only, no models/counts), and `Start match →`
link with the EXACT `buildWorkloadPrefillPath(workloadId, region, currency)` href as
Phase 6. No fake preview, no "Preview here" revival. Links keep `aria-label` +
visible focus rings.

## 9. Trust

Evidential rows: statement (`Zero affiliate bias` / `Explained ranking` /
`Honest limits`) + supporting evidence + mono metadata tag (`firewall` / `evidence` /
`live counts`), separated by dividers. Zero-bias firewall copy, explained-ranking copy,
verbatim live counts + `honestLimitsCopy` zero-state branch all preserved.

## 10. Responsive (360 → desktop)

Desktop compositions are asymmetric grids (`lg:grid-cols-12`); at mobile they collapse
to single-column reading order with hierarchy intact (statement → evidence → action),
never into awkward stacked cards — there are no cards to stack. Decoration is
structural (rails, dividers, numerals), so nothing needs dropping on mobile.
Verified in screenshots at 1440×900 and 390×844 (see §13).

## 11. Accessibility

One H1 (hero). Every section is a semantic `<section>` with `aria-labelledby` wired to
its heading. Keyboard nav unchanged (native links/buttons, visible focus rings on all
custom links). Contrast uses existing token pairs. Demo bars `aria-hidden` with
`sr-only` honest text; static score rings use `role="img"` + `aria-label`; decorative
marks `aria-hidden`. `prefers-reduced-motion` global guard untouched; no animation
added — page is complete with animation off. No scroll-triggered motion, parallax, or
counters.

## 12. Performance

No new dependencies. Removed from homepage tree: 3D `HeroLaptopWrapper` (client) and
animated client `FScoreMeter` (replaced by static server SVG ring). All six sections
are server components — homepage now ships no client JS of its own. `getCatalogStats`
(3 lightweight counts) retained; no catalog DB query reintroduced.

## 13. Browser verification (screenshot paths)

Dev server on `:3200` (stale lock note respected). Screenshots by Playwright 1.62.1:

- `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-6b\homepage-desktop.png` (1440×900 full-page)
- `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-6b\homepage-mobile.png` (390×844 full-page)
- `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-6b\hero-fold.png` (1440×900 above-fold)
- `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-6b\workloads-fold.png` (#workloads anchor)

Route statuses: `/` 200, `/quiz` 200, `/laptops` 200, `/about` 200, one live
`/quiz?s=…` prefill (extracted from rendered WorkloadEntries HTML, 307 chars) 200.
Visible differences vs V1 confirmed in own screenshots: left-aligned 7/5 hero with
evidence panel instead of centered hero + 3D canvas; proof as split verdict/artifact
with accent rail; method as numbered rail rows; workloads as 6 ledger rows with
mono cues; trust as tagged evidence rows; CTA as left-aligned narrative split.

## 14. Deployment-state note

All V2 work is uncommitted on `main`; Vercel serves the old HEAD. This phase is
uncommitted by design — do NOT commit (team-lead handles git).

## 15. Files changed

- `src/components/landing/hero.tsx` (rewrite: editorial split + server evidence panel; dropped `HeroLaptopWrapper`)
- `src/components/landing/sample-proof.tsx` (rewrite: split verdict/artifact; static SVG ring; fixture exports unchanged)
- `src/components/landing/how-it-works.tsx` (rewrite: sequential rail rows; `#methodology` kept)
- `src/components/landing/workload-entries.tsx` (rewrite: numbered ledger + `WORKLOAD_CUES`; prefill hrefs exact)
- `src/components/landing/trust.tsx` (rewrite: evidential rows; `honestLimitsCopy` unchanged)
- `src/components/landing/final-cta.tsx` (rewrite: narrative split; labels/microline/CTA hierarchy kept)
- `docs/reports/SPECWISE-V2-PHASE-6B-VISUAL-REHAUL.md` (this file)
- `docs/reports/SPECWISE-V2-PHASE-6B-VISUAL-TRACEABILITY.md` (companion)

Untouched: `landing-page.tsx` (order/providers), `page.tsx` (counts query),
`lib/prefill.ts`, `header`/nav, `ui/*`, everything outside homepage.

## 16. Phase-7-not-touched confirmation

Phase 7 (results/detail/compare flow) not touched: `git diff --stat` scope is homepage
landing files + the two 6B docs only. No changes to `src/lib/recommend/**`,
`src/app/api/**`, quiz files, store, `results/**`, compare, `laptops/**`, category,
`prisma/**`, `scripts/**`, image pipeline, `three/**`, shared `ui/*`, eslint/config/CI.
