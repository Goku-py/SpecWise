# SPECWISE V2 — PHASE 6B VISUAL TRACEABILITY

> Each visual requirement → implementing file:line. Line numbers refer to the
> rewritten files as committed in this phase.

| # | Visual requirement | Implementation |
|---|---|---|
| 1 | Hero editorial split, existing H1 kept | `src/components/landing/hero.tsx:12-45` (7-col copy block; H1 `15-17`) |
| 1 | Hero primary CTA + Browse secondary + microline | `hero.tsx:27-42` (unchanged labels/routes/microline) |
| 1 | Hero decision-evidence visual, server SVG/CSS, labeled illustrative/demo | `hero.tsx:47-89` (`TRANSLATIONS` map `7-11`; badge `54-56`; caption `83-85`) |
| 1 | Evidence visual must not imply real recommendation | `hero.tsx:54-56, 83-85` (dual labeling: badge + caption) |
| 2 | No default card arrays; editorial rows/splits/bands/dividers | `hero.tsx`, `sample-proof.tsx`, `how-it-works.tsx`, `workload-entries.tsx`, `trust.tsx`, `final-cta.tsx` (all use `border-b` dividers + splits; no `grid … cards` arrays) |
| 2 | Cards = evidence containers only | `hero.tsx:49` (evidence panel), `sample-proof.tsx:73` (artifact w/ accent rail) |
| 3 | Proof: result-artifact foreshadowing Results page | `sample-proof.tsx:72-112` (badge → ring → strengths → trade-off → bars) |
| 3 | Proof: Demo badge, Closest match, score, 3 bars, strengths, trade-off | `sample-proof.tsx:7-9` (constants), `:76-78, :80-110` (render) |
| 3 | Proof distinct from V1 catalog-proof grid | `sample-proof.tsx:60-70` (5/7 verdict/artifact split + `border-l-2 border-accent` rail) |
| 4 | How-it-works sequential w/ connective structure | `how-it-works.tsx:33-59` (rail rows + `↓` connectors `:44-48`) |
| 4 | Keep `id="methodology"` anchor | `how-it-works.tsx:30` |
| 5 | Workload editorial section, name + explanation + cues + action | `workload-entries.tsx:50-92` (ledger rows; `WORKLOAD_CUES` `12-19`) |
| 5 | Exact prefill hrefs, no fake preview | `workload-entries.tsx:76` (`buildWorkloadPrefillPath(workloadId, region, currency)`) |
| 6 | Trust evidential: statements + evidence + mono metadata + dividers | `trust.tsx:54-89` (three rows; tags `firewall`/`evidence`/`live counts`) |
| 6 | Trust keeps zero-bias / explained-ranking / honest-limits (+zero-state) | `trust.tsx:17-25` (`honestLimitsCopy` unchanged), `:54-89` (copy preserved) |
| 7 | Final CTA narrative culmination, exact labels + microline | `final-cta.tsx:12-37` (`Find My Laptop`, `Browse laptops →`, `Quick match · No account`) |
| 8 | Display Sans statements / Sans body / mono metadata-only | All six files: `text-3xl/4xl/5xl font-bold` statements; `.eyebrow`/mono for metadata; no new fonts |
| 9 | Differentiated whitespace per section | `py-16 lg:py-28` (`how-it-works.tsx:31`, `sample-proof.tsx:59`, `workload-entries.tsx:51`, `trust.tsx:52`); CTA `py-20 lg:py-32` (`final-cta.tsx:8`) |
| 10 | Responsive 360→desktop, no awkward stacked cards | `lg:grid-cols-12` splits → single column (`hero.tsx:14`, `sample-proof.tsx:61`, `how-it-works.tsx:32`, `final-cta.tsx:9`); workload/trust rows `sm:grid-cols-12` |
| 11 | A11y: one H1, labelled sections, focus, reduced-motion | H1 only `hero.tsx:15`; `aria-labelledby` on all six sections; focus rings `workload-entries.tsx:80`; zero animation added |
| 12 | Perf: no new deps/client components; no catalog DB query | No `"use client"` in touched files; `FScoreMeter`/`HeroLaptopWrapper` imports removed; `page.tsx` untouched |
| — | Honesty: no fake counts/prices/names/regions; demo labeled; "Closest match" never "best" | Fixture constants unchanged (`sample-proof.tsx:5-23`); `Closest match` kept verbatim; cues are category language (`workload-entries.tsx:12-19`) |
| — | Nav routes kept (Recommend/Browse/About) | Untouched `src/components/layout/header-client.tsx`; homepage links to `/quiz`, `/laptops` only |
