# SPECWISE V2 — Phase 6C Traceability

Requirement → implementation → test → visual proof. Date: 2026-10-05. No commit, no push.

## 1. Visual direction reset ("SpecWise evolved")

| Requirement | Implementation | Test | Visual proof |
|---|---|---|---|
| Hero is strongest part (eyebrow, H1, explanation, primary CTA, Browse secondary, reassurance, visual anchor) | `landing/hero.tsx`: pill badge + unchanged copy/CTAs + restored `HeroLaptopWrapper` 3D | `heroCatalogNote` unit tests (live count vs syncing) | `desktop-dark.png`, `desktop-light.png` (hero viewed) |
| Restore/adapt 3D via lazy infra only | Reused `hero-laptop-wrapper` + `hero-scene-bundle` untouched (dynamic ssr:false, IO gating, DPR clamp, reduced-motion, poster + error boundary); 1-line theme-aware grid (`--hero-grid`) | — (infra pre-tested) | 3D laptop renders in dark + light + mobile shots |
| Proof feels like a real Results artifact | `sample-proof.tsx`: artifact card (header strip + DEMO badge, ring, reasons, bars) | Existing `homepage.phase6.test.ts` fixture locks (92/Closest-match/3 bars) | `full-light.png`, `full-dark.png` proof section |
| How-it-works = connected flow | `how-it-works.tsx`: continuous rail + accent nodes; `#methodology` kept | — (copy unchanged) | full-page shots §3 |
| Workloads = scannable six, real prefill URLs | `workload-entries.tsx`: 2→3-col tile grid; `buildWorkloadPrefillPath` untouched | Existing prefill round-trip tests (6/6) | full-page shots §4 |
| Trust = evidence-feel; honestLimitsCopy zero-state | `trust.tsx`: evidence card + tag chips + live-count line; copy fn untouched | Existing `honestLimitsCopy` tests (0 → growing; 42 → live) | full-page shots §5 |
| CTA = narrative close | `final-cta.tsx`: quiet rounded panel, same copy/CTAs | — | full-page shots §6 |
| A/B/C/D/E + 26 sections | `SPECWISE-V2-PHASE-6C-VISUAL-DIRECTION.md` (§1–§26) | — | this file |

## 2. Theme system (Light/Dark/System)

| Requirement | Implementation | Test | Visual proof |
|---|---|---|---|
| Light/Dark/System; System follows OS; explicit persists | `theme/theme.ts` (parse/resolve/attribute, plain `specwise-theme` key; System = absent) + `theme-provider.tsx` (useSyncExternalStore, OS listener, DOM-only sync effect) | `theme.phase6c.test.ts`: parse ×6, resolve ×3, attribute ×1, script ×1 | Playwright logs: `system-os-light → data-theme=light`, `system-os-dark → data-theme=null`; live-browser click tests |
| Explicit Light/Dark overrides System | `resolveEffectiveTheme` priority; `setChoice` writes + notifies | unit (explicit beats OS signal both ways) | `full-light: stored=light`, `full-dark: stored=dark` |
| No wrong-theme flash; sane default/no-JS posture | `NO_FLASH_SCRIPT` (single source of truth in `theme.ts`) as first `<body>` child in `layout.tsx`; default = dark | script-content test (key, matchMedia, data-theme, no imports, guarded) | attribute present in pre-paint HTML (curl payload shows script first) |
| Intentional Light tokens (not inversion) | `globals.css` `:root[data-theme="light"]`: warm paper `#FAF7F1`, `#FFFDF8` cards, warm borders, ink `#1B1D24`, deepened accent `#D94800`, re-tuned status colors, soft elevations, `color-scheme` | — | `desktop-light.png`, `full-light.png`, `mobile-light.png`, `page-*-light.png` (all viewed) |
| Dark stays sophisticated/calm, orange kept | Dark tokens byte-identical (only added `--hero-grid` + header comment) | — | `desktop-dark.png`, `full-dark.png` |
| Compact a11y Appearance control; mobile in menu; never dominates | `appearance-switcher.tsx` (radiogroup, `aria-checked`, focus ring, `size-7` pill); wired in `header-client.tsx` desktop + mobile row | — | header switcher visible in all desktop shots; live click verified |
| Pages stay server (no client-side conversion for theming) | Only `ThemeProvider` + switcher + existing 3D wrapper are client; all pages server | `tsc` + build pass; no `use client` added to any page | — |
| Quiz/results//laptops/about/nav/footer in both themes | Zero per-component edits (all token-driven); verified by render | — | quiz/laptops/results/about Light shots viewed; dark homepage + shared chrome prove dark path |

## 3. Diagnoses (evidence)

| Page | Symptom | Cause (evidence) | Action |
|---|---|---|---|
| `/laptops` | "0 laptops / catalog yet" | `ECONNREFUSED` — remote Neon DB unreachable from this env (probe `prisma.laptop.count()` → `LAPTOP_ERR_CODE=ECONNREFUSED`); `getCatalogStats` catch → zeros; honest empty state renders | None (read-only; no seed/migrate/write) |
| `/results` | "catalog temporarily unavailable" | Same root cause; Quiz→API→Catalog→Recommendation→Results chain code-complete, needs live catalog | None |
| `/about` | screenshot looked blank | Static JSX, no fetch/JS/conditional — no blank path exists; curl + Light screenshot show full content | None (rule: fix only genuine defect) |

## 4. Verification log

- `npx tsc --noEmit` → exit 0 (final; throwaway capture scripts `@ts-nocheck`ed, then deleted).
- `vitest run src/components/theme/... src/components/landing/...` → 2 files, 17/17 pass.
- `vitest run src` → 9 files, 109 passed / 9 skipped. (`src/lib/__tests__` + `tests/scoring` subset: 45/3.)
- `npm run build` → success (26 routes).
- curl (dev server): `/, /quiz, /laptops, /about, /quiz?s=<real dev prefill>` → all 200.
- Screenshots viewed (10 files, `…\Temp\opencode\specwise-6c\`): desktop-dark/light (hero), mobile-dark/light,
  full-dark/light, page-quiz/laptops/results/about-light. Iterated once (boot-overlay timing → skip flag + 5s wait).
- Live-browser interaction: Light click → `stored=light/attr=light/bg=#faf7f1`; reload → `light/light` (persist);
  Dark click → `stored=dark/attr=null/bg=#090a0f`.
- eslint on all touched files → 0 new errors (2 pre-existing in `hero-laptop-wrapper.tsx` baseline, proven by diff).
- Acceptance: recognizably SpecWise / V1 evolution / intentional Light+Dark / distinctive hero / mobile / quiz-led ✓.

## 5. Files changed (this phase only)

New: `components/theme/theme.ts`, `theme-provider.tsx`, `appearance-switcher.tsx`,
`components/theme/__tests__/theme.phase6c.test.ts`, `landing/lib/catalog-note.ts`,
`docs/reports/SPECWISE-V2-PHASE-6C-VISUAL-DIRECTION.md`, this file.
Modified: `app/layout.tsx`, `app/globals.css`, `landing/hero.tsx`, `landing/landing-page.tsx`,
`landing/sample-proof.tsx`, `landing/how-it-works.tsx`, `landing/workload-entries.tsx`,
`landing/trust.tsx`, `landing/final-cta.tsx`, `layout/header-client.tsx`,
`hero/hero-laptop-wrapper.tsx` (1 style line).
Untouched (Phase 2–5 + forbidden): `results-view-v3.tsx`, `V3Quiz.tsx`, `lib/storage.ts`,
`store/useV3QuizStore.ts`, all untracked results/lib/store/test files, `about/page.tsx`, catalog code, DB.

## 6. Pre-existing nits observed (not fixed — out of scope)

- `/laptops` breadcrumb renders "us Explore laptops available in United States" (lowercase code prefix reads as a typo).
- `/about` hardcodes "56 laptops across 6 regions" (drifts from live counts).
- `meta theme-color` stays `#090A0F` under Light choice (OS chrome mismatch, cosmetic).
- 3D laptop materials are dark-tuned; Light scene reads darker than surroundings (grid is theme-aware; relighting = new engine work, forbidden).
