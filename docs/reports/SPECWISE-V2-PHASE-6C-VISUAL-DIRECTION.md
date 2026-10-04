# SPECWISE V2 — Phase 6C: Visual Direction Reset + Theme System

Status: implemented, verified (see §25). Date: 2026-10-05.
Direction: **"SpecWise evolved"** — V1 identity + V2 architecture + modernized UX + Light/Dark/System themes.
Branch: `main` @ `2f5535d` (homepage 6+6B commit). V1 baseline: `cfffc7a`.

---

## §1. Purpose

Reset the homepage visual language away from the 6B ledger-heavy editorial composition toward a premium
consumer-product feel, while adding an intentionally-designed Light/Dark/System theme system — without
touching quiz semantics, scoring, results binding, catalog data, or any Phase 2–5 uncommitted work.

## §2. Non-goals (explicitly out of scope)

Recommendation engine, quiz semantics/scoring, results ranking/binding, Compare/Detail implementation,
image pipeline, full 3D expansion, backend/security changes, database redesign/migration/seed, pushing/deploying.

## §3. Safety record

- `git status` taken first: 4 modified files (results-view-v3.tsx, V3Quiz.tsx, storage.ts,
  useV3QuizStore.ts) + untracked results/components, lib, store tests, report docs — **none touched**.
- No destructive git commands used (no reset/checkout/restore of unrelated files).
- All edits confined to: `src/components/landing/*`, `src/components/theme/*` (new),
  `src/components/hero/hero-laptop-wrapper.tsx` (1 style line), `src/components/layout/header-client.tsx`,
  `src/app/layout.tsx`, `src/app/globals.css`, `src/components/landing/lib/*`, theme/homepage tests, docs.

## §4. V1 identity audit (baseline `cfffc7a`)

What made V1 recognizable:
1. Hero H1: "Match your workload to exact laptop hardware." + live-count badge
   ("Workload-matched laptops · Live catalog · N machines").
2. 3D laptop visual (R3F exploded laptop, grid backdrop, workload-highlight cycling, caption).
3. Section order: Hero → WorkloadExperience → HardwareStrip → MatchingEngine → CatalogProof
   (real machines) → Trust (3 cards) → FinalCta.
4. Dark + orange (`#FF5500`), mono flavor (eyebrows, badges, captions, metadata).
5. Cards: `rounded border border-border bg-card`, quiet elevations.

## §5. 6B critique (what was wrong)

The 6B composition (`2f5535d`) read ledger-heavy: hero decision-evidence panel duplicated the proof
fixture's 92 score, workloads/trust/how-it-works were all flat ledger rows separated by hairlines,
sections had no rhythmic variation (dashboard-dense without relief), and the page had no strong visual
anchor (no 3D, no artifact). Dark-only. Recognizable SpecWise bones, forgettable skin.

## §6. A/B/C/D/E classification register

- **A = V1 preserve (taken back verbatim):** 3D laptop hero visual + lazy infra (dynamic bundle,
  IO gating, DPR clamp, reduced-motion, poster fallback); mono eyebrow/badge/caption flavor;
  orange `#FF5500` dark accent; `#methodology` anchor; card border/background pattern.
- **B = V1 modernize (kept, improved):** live-catalog hero badge → pill badge with honest
  syncing state; trust 3-cards → evidence card with tag chips + live-count numeral line;
  workloads → six tiles with hierarchy (index, title, blurb, cue chip, CTA).
- **C = remove:** hero decision-evidence panel (duplicated proof's 92); ↓-arrow step connectors;
  rigid ledger rows everywhere; dark-only assumption; poster-sparse oversized whitespace.
- **D = V2/6B preserve (kept as-is):** 6-section order (Hero, proof, how-it-works 01-02-03, 6 workloads,
  trust, dual CTA); all copy/H1/lede/CTAs; `buildWorkloadPrefillPath` prefill URLs; `honestLimitsCopy`
  zero-state; demo fixture (92/Closest-match/2 strengths/1 trade-off/3 bars, DEMO-labeled, no
  names/prices/regions); copy honesty rules; `SampleProof` fixture values (test-locked).
- **E = 6B discard (not carried forward):** ledger-everywhere composition; editorial asymmetry;
  border-l accent proof treatment; unconnected step list.

## §7. Rejected directions

Ledger-heavy composition, editorial asymmetry, sparse poster sections, dark-only, terminal/dashboard/
cyberpunk feel, neon/glow excess, generic SaaS gray light theme, heavy-shadow cards, pure-white-box overload.

## §8. Chosen direction: "SpecWise evolved"

V1 identity (3D hero, dark+orange, mono citations) + V2 architecture (6-section order, demo proof,
prefills, honest states) + modernized UX (artifact cards, tile grid, connected flow, dual themes).
Sans advises, mono cites; orange controlled; rhythm between dashboard-dense and poster-sparse.

## §9. Theme system: choices

Light / Dark / System. Default posture (no-JS, first paint, no stored choice): dark — the current
brand, always sane. System mode follows `prefers-color-scheme`. Explicit Light/Dark persists in
`localStorage` under plain key `specwise-theme` (System = key absent). Explicit choice overrides System.

## §10. Theme system: storage rationale

The v2 envelope in `src/lib/storage.ts` was READ and deliberately NOT reused: a 1-string UI preference
needs no versioning/migration machinery (`storage.ts` untouched per safety rules), and the theme module
stays dependency-free so the no-flash inline script can mirror its parse/resolve logic without imports.

## §11. Theme system: no-flash mechanism

Synchronous inline `<script>` (stringified from `NO_FLASH_SCRIPT` in `theme.ts`, single source of truth)
as the first child of `<body>`: reads storage → matchMedia → sets `document.documentElement.dataset.theme`
before first paint. Wrapped in try/catch; any failure keeps the dark default. No React involvement, no
hydration mismatch (React never renders `data-theme`).

## §12. Theme system: tokens

Dark = current tokens unchanged (sophisticated/calm, orange kept, no new glow). Light = intentionally
designed warm paper (`#FAF7F1` bg, `#FFFDF8` cards, warm borders `#E5DBC6/#C9BB9C`, ink `#1B1D24`,
secondary text `#596071`), accent deepened to `#D94800` for contrast on light, success/warning/error
re-tuned (`#0E9F5D/#96690A/#D92D20`), soft warm elevations. `color-scheme` set per theme for native controls.

## §13. Theme system: scoping decision

CSS-variable token swap + one tiny client `ThemeProvider` (choice state + OS listener). Pages stay
server components — no page was made client-side for theming. All UI components were already
token-driven (`bg-background`, `text-muted`, `border-border`, `bg-accent`…), so zero per-component edits.

## §14. Header appearance control

Compact segmented Light/System/Dark control (`radiogroup` semantics: arrow-key + screen-reader friendly,
`aria-checked`, visible focus ring), icon-sized (`size-7` buttons in a pill) so it never dominates.
Desktop: header utility cluster next to Region picker. Mobile: labeled "Appearance" row inside the menu.

## §15. Homepage §1 — Hero (strongest part)

Eyebrow pill badge (live count or honest "syncing"), H1 unchanged, explanation lede unchanged, primary
Find-My-Laptop CTA + Browse secondary unchanged, reassurance line unchanged, 3D visual anchor restored
(existing lazy infra only: `next/dynamic` ssr:false bundle, DPR/IO gating, reduced-motion respected,
desktop-first quality detection, poster + error-boundary fallbacks; zero new engine, zero Phase 9 work).

## §16. Homepage §2 — Proof (real Results artifact)

Same fixture values (test-locked), recomposed as an artifact card: header strip ("Sample result" +
DEMO badge), score ring + verdict, strengths/trade-off, 3 bars, honesty footer. Reads as a Results page
excerpt, not an editorial pull-quote.

## §17. Homepage §3 — How-it-works (connected flow)

Same 3 steps + `#methodology` anchor; flat rows replaced by one connected flow: continuous rail with
accent node per step. Sequential, scannable, no card repetition.

## §18. Homepage §4 — Workloads (scannable six)

Same 6 workloads, same prefill URLs, same blurbs; ledger rows replaced by a 2→3-col tile grid with
hierarchy (accent index, title, blurb, hardware-cue chip, "Start match →" action). No "Preview here" revival.

## §19. Homepage §5 — Trust (evidence, not legal)

Same 3 statements + live counts + `honestLimitsCopy`; recomposed as one evidence card with tag chips
(firewall/evidence/live-counts) and a mono live-count numeral line in the statement column. No new claims.

## §20. Homepage §6 — CTA (narrative close)

Same copy/CTAs; placed in a quiet rounded panel so the page ends with a destination, not a trailing section.

## §21. Copy honesty rules (unchanged, re-verified)

Demo fixture DEMO-labeled, no names/prices/regions anywhere on homepage; hero badge shows "syncing" when
the catalog is unreachable (never "0 machines" as a scare or fake count); trust counts are live
server-rendered; `honestLimitsCopy` zero-state kept.

## §22. Catalog diagnosis (/laptops "0 laptops / catalog yet")

Cause: **connection refused** — `DATABASE_URL` points at a remote Neon Postgres
(`*.aws.neon.tech`, ap-southeast-1); direct `prisma.laptop.count()` fails with `ECONNREFUSED` from this
environment. Not a filter bug (`status: "active"` is correct and consistent with scoring), not confirmed
empty DB (unreachable → unmeasurable). App degrades honestly: `getCatalogStats` catches → zeros;
`/laptops` empty state reports the empty catalog. Evidence: probe script output `LAPTOP_ERR_CODE=ECONNREFUSED`
(script removed after). No seed/migrate/write performed. When the DB is reachable, pages render live data
with zero code changes.

## §23. Results diagnosis (/results "catalog temporarily unavailable")

Same root cause as §22 (recommendation path needs the live catalog via `getActiveCatalog`). Chain
Quiz→API→Catalog→Recommendation→Results is code-complete and untouched; it resolves once connectivity does.

## §24. About diagnosis (blank screenshot)

`src/app/about/page.tsx` is fully static JSX (no data fetch, no client JS, no conditional render) — there
is no code path that renders blank. Verdict: screenshot-too-early (or boot-overlay timing), not a rendering
defect. Per phase rules: **no About change made**. (Noted aside: About hardcodes "56 laptops across
6 regions" — stale-copy risk for a later content pass, not this phase.)

## §25. Verification summary

- `npx tsc --noEmit`: exit 0, zero errors (final run post provider rewrite).
- Unit: new `theme.phase6c.test.ts` (13 tests) + existing `homepage.phase6.test.ts` (4 tests)
  — 17/17 pass. Full `src` suite: 9 files, 109 passed / 9 skipped. `src/lib` + `tests/scoring`:
  4 files, 45 passed / 3 skipped.
- `npm run build`: success (route table: 26 routes, all rendered).
- Dev-server curl: `/`, `/quiz`, `/laptops`, `/about` → 200; `/quiz?s=<real dev prefill>` → 200.
- Screenshots (real, every one viewed): desktop Light, desktop Dark, mobile Light, mobile Dark,
  full-page Light + Dark, quiz/laptops/results/about in Light — all in
  `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-6c\` (outside repo) + live-browser
  interaction evidence (switcher click → persist → reload).
- `npm run lint` (eslint): ZERO new errors in touched files. Baseline: 2 pre-existing
  `react-hooks/set-state-in-effect` errors in `hero-laptop-wrapper.tsx` (V1 code, lines 110/131 —
  diff proves only a 1-line style change there); 1 transient provider error introduced mid-phase
  was rewritten away (useSyncExternalStore pattern). Final: my files 0 errors.
- Acceptance (§39–40): recognizably SpecWise ✓, V1 evolution ✓, intentional Light AND Dark ✓,
  distinctive hero ✓, mobile works ✓, leads to quiz ✓.

## §26. Limitations & follow-ups (not this phase)

1. 3D laptop materials are dark-tuned; in Light theme the scene reads slightly darker than surroundings
   (grid backdrop is theme-aware via `--hero-grid`; model lighting untouched — new engine work is forbidden).
2. `meta theme-color` stays dark (`#090A0F`) — OS chrome doesn't adapt to Light choice (cosmetic).
3. About hardcoded "56 laptops / 6 regions" copy will drift from live counts (content pass).
4. Catalog/Results emptiness is environmental (DB unreachable from here), not code — re-verify with DB access.
5. No new e2e added; visual proof is via captured screenshots (outside repo) + unit tests.
