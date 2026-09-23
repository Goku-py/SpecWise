# SpecWise — Full Project Audit Handoff

> Generated: 2026-09-23 | Scope: whole project | Sources: direct file reads + 6 specialist audits (product, UX, scoring, SEO/GEO, design, security/ops) | No code changed in this audit.

---

## 1. Project Overview

### 1.1 What SpecWise Is
- Workload-matched laptop recommender. Promise: `Match your workload to exact laptop hardware. Zero affiliate bias. Zero jargon.`
- Flow: Landing (`/`) with Three.js hero → Quiz (`/quiz`) → Ranked results (`/results` + catalog `/laptops`, detail `/laptops/[id]`, compare `/compare`, category `/category/[useCase]`).
- Core mechanism: F-score weighted ranking across 50+ hardware params. Server scorer + client decomposition mirror for radar + re-rank.

### 1.2 Tech Stack (verified `package.json` + `README.md`)
- Next.js 16.2.10 App Router, React 19.2.4, Tailwind CSS v4 (`@tailwindcss/postcss`), `clsx`+`tailwind-merge`.
- 3D: `three` 0.185 + `@react-three/fiber` 9 + `@react-three/drei` 10. Animation: `motion` 13. Icons: `lucide-react`.
- DB: PostgreSQL via `pg` + `@prisma/adapter-pg`, Prisma 7 (output `src/generated/prisma`).
- Validation: `zod` 4. State: `zustand` 5 (`useQuizStore.ts`). Email: `resend` 6.
- Lang: TypeScript 5 strict, Node >=20.9 (`.nvmrc`: 24). Tests: Vitest 4 + Playwright 1.62.

### 1.3 Architecture & Data Flow
```
Quiz (client, zustand) → POST /api/quiz → Zod validate → rate-limit (60/min/IP)
 → getActiveCatalog(region) [unstable_cache, TTL 3600s] → toScorable() → scoreLaptops()
 → top 12 → localStorage + optional Resend email + Lead upsert
Results (client) → decomposeScores() [mirror] → radar + delta → rescorePool() local re-rank
```
- Single source of truth: `src/lib/scoring.ts` → delegates to `src/lib/recommendation/{questionnaire,profile,engine,weights,capabilities}.ts`. UI must not import scorer directly.
- Client mirror: `src/lib/decomposition.ts` (pure, radar/re-rank parity header).
- Region: `middleware.ts` geo (`x-vercel-ip-country`/`cf-ipcountry` → `region` cookie 1yr) + `src/lib/regions.ts` + `region-store.ts`. 6 regions US/IN/GB/DE/CA/AU.

### 1.4 Entry Points & Routes
- `src/app/layout.tsx` (fonts Inter+JetBrains Mono, header/footer, boot sequence), `src/app/page.tsx`, `src/app/quiz/page.tsx` → `SpecQuiz.tsx` + `quiz-flow.tsx`, `src/app/results/page.tsx` → `results-view.tsx`.
- `src/middleware.ts`, `src/lib/prisma.ts`, `prisma/seed.ts`, `scripts/generate-laptops.ts`.
- Pages: `/`, `/quiz`, `/results`, `/laptops`, `/laptops/[id]` (slug/cuid, 308 via `SlugRedirect`), `/compare`, `/compare/[slugs]`, `/category/[useCase]`, `/admin`, `/admin/laptops/new`, `/admin/laptops/[id]/edit`, `/about`, `/privacy`, `/terms`, `sitemap.ts`, `robots.ts`, `manifest.ts`, `not-found.tsx`, `error.tsx`.
- APIs: `POST /api/quiz`, `GET /api/laptops` + `/search` + `PATCH /api/laptops/[id]`, `GET /api/health`, `POST /api/admin/{import,revalidate}`, `GET/POST /api/cron/update-prices` (`CRON_SECRET`, `vercel.json` `0 6 * * *`).

### 1.5 Key Directories
- `src/app/` routes+API. `src/components/{quiz,results,catalog,product,charts,three,hero,layout,boot,share,laptop,ui,recommendation}` ~30 comps.
- `src/lib/`: `scoring, decomposition, recommendation/, types (QuizAnswers, ScorableLaptop, RecommendedLaptop, CatalogLaptop), validation, catalog-cache, rate-limit (DB+memory), regions, affiliate, price-sync, email, share, storage, slug, admin-auth, cron-auth, logger, api, layer-specs, laptop-fields, questions, view-models`.
- `src/store/useQuizStore.ts` (v2 lightweight quiz), `src/hooks/{use-reduced-motion,use-count-up}`.
- `prisma/{schema.prisma,seed.ts,migrations/,scripts/backfill-spine.ts}`, `data/laptops.json`, `scripts/{generate-laptops,fetch-laptops,fetch-images}`, `public/`, `docs/{PRODUCTION-AUDIT,REDESIGN-ARCHITECTURE,specwise-2/,design-system/}`, `tests/{api,e2e,scoring,v2}`, `.headroom/`, `.opencode/`.

### 1.6 Runtime / Scripts / Env
- `dev/build/start/lint`, `test` (vitest), `test:unit` (`SKIP_API_WARMUP=1 src/lib/__tests__ tests/scoring`), `test:api` (`--no-file-parallelism`), `test:e2e` (playwright workers:1, reuses `:3000`), `prisma:generate/migrate`, `db:generate-laptops/seed/backfill-spine/fetch-images/setup`.
- `.env.example`: required `DATABASE_URL`; optional `ADMIN_API_KEY, RESEND_API_KEY, UNSPLASH_ACCESS_KEY, TECHSPECS_*, PRICESAPI_API_KEY, CRON_SECRET (required prod), PRICE_SYNC_BATCH/APPLY, POSTGRES_POOL_*, NEXT_PUBLIC_APP_URL, CATALOG_CACHE_TTL_SECONDS, SKIP_CACHE_REVALIDATE`.

---

## 2. Product Strategy Audit

### 2.1 Users & Jobs-To-Be-Done
- Home targets 5: Coding, Gaming, Creative, Student, Office → `/category/*`.
- Quiz presets: Esports, AAA-gaming, Video-editing, AI/ML, Everyday + legacy (SW-Dev & LLMs, 3D/CAD, Competitive Gaming, Portability).
- Constraints captured: budget, OS, RAM, storage, GPU, battery, display, portability/weight, gaming tier, upgradeability, build, ports, webcam, security, refurbished.
- JTBD: (1) avoid wrong laptop without becoming expert, (2) prove no paid placement, (3) trade budget/weight/battery/perf fast.
- Hypothesis: primary = student/first-time/switcher overwhelmed by listicles; secondary = dev/creator/gamer (TGP, P3/Delta-E, VRAM).

### 2.2 Positioning & Value Prop
- Sharp enemy (sponsored rankings) + verifiable mechanism (F-score + breakdown + live DB counts). Good.
- Gaps: trust asserted not evidenced (no sources/methodology/why-lost on home); tone split (mono `[ LIVE DATABASE ]` vs `zero jargon` for student/office).

### 2.3 Activation / Conversion / Retention
- Activation: Home dual-track `[START 60-SEC QUIZ]` / `[BROWSE RAW SPEC DATABASE]` + 5 cards. Good.
- Friction: `GateStep` Quick vs Advanced adds click before value.
- Conversion split: `QuizFlow` (server → `/results` + email) vs `SpecQuiz` (instant sample re-rank + Share/Export). Two competing paths.
- Retention: Share URL (`?workload=&budget=`), localStorage, optional email. No accounts, saved builds, price-drop loop.

### 2.4 Critical Gaps
- **Dual-quiz divergence (P0):** `/quiz` mounts `SpecQuiz` (workloadIntent, budgetMax, portability, refreshRateGoal, formFactor, upgradeability, `SAMPLE_SCOREABLE` client-only). `quiz-flow.tsx` + `questions.ts` (18 Qs) + server scoring orphaned. Different questions, scores, data (sample vs DB). Store budget USD-only bands (`under-700/700-1199/1200-1799/1800+`, slider `$500-$3000+`) breaks region-aware `usdToLocal` story.
- No zero-result recovery beyond widen budget; no side-by-side compare/shortlist/why-not explainer in quiz; no monetization (zero-affiliate removes revenue); category pages thin; `budget` Q has no options (relies on `BudgetFieldset`).

### 2.5 Success Metrics (proposed)
- Activation: CTA %, gate split, step drop-off. Match: `SEE MATCHES` CTR, zero-rate, re-rank/share rate. Trust: radar hover, methodology scroll, return rate. Conversion: email %, share-open→start %, 7-day return. Business: coverage, freshness, p95 latency.

### 2.6 Top Risks / Opportunities
- Risks: two truths one route; demo data as live (`SAMPLE_SCOREABLE` + `[LIVE DATABASE]` badge); USD-only in multi-region; no moat/revenue; jargon gap.
- Opportunities: unify to one progressive quiz; surface why-won/why-lost deltas; compare+shortlist+share loop; SEO category moat (`best for X under $Y in REGION`); trust ledger (sources, freshness, confidence flags).

---

## 3. UX / Journeys / IA / Questionnaire

### 3.1 Journeys & IA
- **J1 critical:** `SpecQuiz` scores sample inline, never writes `specwise-*` nor navigates to `/results`. `ResultsView` reads localStorage else `replace(/quiz)`. `/results` unreachable from new quiz. `SEE MATCHES` does `go(3)` with `STEPS.length===3` → empty step, just scrolls. Dead-end CTA.
- **J2:** Home promises 4 steps (Workload→Constraints→Spec Analysis→Ranked), quiz delivers 3 (Workload, Budget, Fit). Constraint mapping (weight, OS) missing in new quiz.
- **J3:** Nav `#methodology` (home-only), `#api` (nowhere) broken off-home. Fix to `/#methodology`, `/about`, add Quiz/Categories.
- **J4 taxonomy drift:** Home (5) ≠ `simpleQuestions.useCase` (10) ≠ `WORKLOADS` (6) ≠ `SpecQuiz` (5). Lossy maps (`ai-ml→code`, `video-editing→creative`).

### 3.2 Questionnaire Signal
- New-quiz inputs mostly dead: `refreshRateGoal` → only resolution; `portability` → only `always` matters (`desk`=`sometimes` identical); `formFactor`, `upgradeability≠must` no-ops.
- Silent overwrite: workload pick clobbers refresh/portability, no undo. Budget slider unset (`$3,000+`) indistinguishable from explicit max. Toggle-to-clear undiscoverable. Legacy bank: `displaySize/webcam/security` dropped in `toCanonical` (dead by design), `cpuBrand/ports/gaming` legacy-only — should not be asked if unscored.

### 3.3 Usability / Cognitive Load
- Positives: 3-step + live re-rank, plain cards, `fieldset/legend`, `aria-pressed`, budget anchors.
- Friction: Step0 Back = Start over + `reset()` no confirm; weights `0.00-1.00` jargon; `Adjusted view — not saved` unexplained; terminal caps mono 10-11px vs `Zero jargon`; hero `Zero affiliate bias` vs footer `We may earn commission` contradiction; `truncate` hides differentiators.

### 3.4 Accessibility (WCAG)
- Passes: dark tokens (`#090A0F/#F3F4F6`, muted 7:1), focus rings, mobile menu `inert`+Escape+restore, boot reduced-motion skip, `alt`.
- Issues: `Progress` no `progressbar` role; step change no focus move; live re-rank no `aria-live`; `motion.div x±24` bypasses `useReducedMotion`; `WeightSlider` invisible focus; drawer no trap/Escape/return-focus/scroll-lock; compare bar covers content, no `aria-live`; boot no visible Skip; `ResultsView null` loading (no skeleton/`aria-busy`); `ResultsView flex+aside w-1/4` never stacks on mobile.

### 3.5 Onboarding
- Boot ~1.3s session-once, zero task value. No time cue (`60-SEC` claim, no `3 steps · ~60s · no account`). No F-score explainer at need.

### 3.6 Quick Wins
- Fix `SEE MATCHES` (navigate to `/results` + persist OR scroll to `#top-matches` + focus). Add `progressbar` semantics, step `h2[tabindex=-1]` focus, gate motion behind hook, visible focus on sliders, `flex-col lg:flex-row` + `pb-24` + skeleton, drawer Escape+return-focus, budget unset vs max label, nav fixes, workload-default toast + dirty-flag, weights `%`/Low-Med-High, footer claim reconcile.

---

## 4. Recommendation Engine Audit

### 4.1 Architecture
- `engine.ts` authoritative, `scoring.ts` thin adapter, `decomposition.ts` display-only (with gaps). Deterministic, tie-break `score→price→weight→id`, order-invariance tested. Good.

### 4.2 Question → Decision Map
- `useCase` dominant (9-dim base weights). `budgetMax` HARD + value cap; `budgetMin` HARD via separate `legacyBudgetMin` (fragile asymmetry). `os` HARD; `portability`/`battery` multipliers; `minRam/minStorage` HARD exact-wins (good); `displayQuality` multiplier; `buildQuality` ×1.5 only; `dealMinRam16` HARD; `cpuBrand/gpu/ports` HARD; `gaming/upgradeability` copy-only; `displaySize/webcam/security/refurbished` zero-effect (refurbished = bug: engine penalizes −0.05 even if user wants refurbished). `basic→[]` no-op, `bright→sharp` wrong.

### 4.3 Scoring / Ranking
- `score = Σ(w·cap)/Σw_avail − penalties + bonuses + metBonus`, clamp [0,1] ×100.
- Renormalization sparse-safe. `value` pool-relative dense-rank correct. Penalties/bonuses heuristic round numbers; `MET_BONUS` double-counts HARD passes. Sparse row can outrank complete (0.05 flat too small). Filters: HARD budget/OS/RAM/storage/cpuBrand/gpu/ports; relax `gpu→ports→storage→ram→budget(0.7×/1.3×)→cpuBrand→os` cap 3 ledgered; exhausted-closest-12 fallback; diversity max-2/brand+model; top-12; price-missing quarantine (max 3 ghosts).
- Risks: budget `0.7/1.3` vs spec `+15%` deviation; ports `>1 miss` leniency undocumented; `linux→windows` hack; absurd inputs burn relax steps, misleading ledger.

### 4.4 Weights, Personalization, Confidence
- `WEIGHTS_V1` heuristic prior (no tuning log). Multipliers `1.4/1.3/0.4/1.6/0.8/1.5/1.2/0.5/1+0.25n` unjustified; no interactions; no NDCG/pairwise eval, only golden snapshot.
- Personalization weak: only base weights + 4 multipliers. No learning, no contradiction resolution (except macOS+GPU), fixed value weight.
- Confidence collected then discarded: caps `{value,confidence,source}` gated binary `<0.5→−0.05`, stripped in `scoringMeta`, flat regardless of count/weight, no interval/flag, decomposition fabricates `0.8/0.5`.

### 4.5 Parity Scoring vs Decomposition
- Display: pref-weighted vs flat mean (diverges on `screen[]`/gamut/touch). Portability: `carry` vs `null`. Battery: ignores powerTrade. Build: `buildMaterial` vs `reviewScore` (different source). Value: dropped, 8-dim renorm + `0.12` default ≠ `0.08-0.25`. Null: excluded vs `0.5` neutral (misreads as average). `rescoreWithOverlay` reuses engine (good); stale pre-v2 fallback fabricates caps from `general` (mislabeled risk).

### 4.6 Explainability & Edges
- Engine `why/strengths/compromises/whyAbove/satisfied/missed/structuralNotes` derived well. But legacy `matchReasons/tradeoffs` independent triggers → `student/office/travel/general` top-1 zero reasons (golden-locked). `compromises` = lowest weighted (not decision-relevant). `contradictions` never propagated to API. `structuralNotes` only 2 cases.
- Edges covered: empty/inactive, sparse nulls, zero-price quarantine, stale flag, absurd → relax/exhaust, determinism. Holes: `budgetMin>max` asymmetry, `qualcomm` artificial test, `screen` cap-2 silent drop, `basic` silent no-op.

---

## 5. SEO / GEO Audit

### 5.1 Technical / Indexability
- `layout.tsx`: `metadataBase`, title/desc, OG website, twitter large, theme `#090A0F`, Org+WebSite/SearchAction JSON-LD. Missing: `title.template`, `canonical`, OG images/url/locale, `robots`, icons.
- `BASE_URL = NEXT_PUBLIC_APP_URL ?? localhost` poisons canonicals/sitemap if env missing.
- `sitemap.ts`: static + categories (0.7) + slugs (0.6) + bounded pairs (0.8), `lastModified`, DB-fail fallback. Bad: indexes `/results` (personalized) + `/compare` shell, weekly everywhere, no images.
- `robots.ts`: `allow:/`, `disallow:/admin,/api`. Missing `/results`, `?q=`.
- `next.config.ts`: `poweredByHeader:false`, good headers+HSTS, no canonical redirects, no ISR, `images.remotePatterns: unsplash` only.
- `force-dynamic` on laptops/detail/category/compare → fresh prices but high TTFB + crawl cost. Slug 308 + `canonicalComparisonPath` solid.

### 5.2 Metadata / Structured Data
- Best: `compare/[slugs]` (canonical, OG article+images, 2× Product region-aware, `geoSummary` citable). Good: `laptops/[id]` (unique title/desc, region Product/Offer, correct omit if no rows). Weak: catalog generic, category dynamic but no OG/canonical/JSON-LD, `/` inherits root, quiz/results/compare/about static only.
- Compare `aggregateRating` without `ratingCount` → ineligible for stars. Zero `BreadcrumbList/ItemList/CollectionPage/FAQPage`. `manifest.ts` `#a16207/#fafaf9` mismatches dark `#090A0F`.

### 5.3 IA / Internal Linking / Content
- Header `Database, Compare, #methodology, #api` (dead/broken). Footer only 7 links. Detail → 3 `compare` via `pickRivals` (good, capped, no category/breadcrumb). Category: `h1+ResultsGrid` only, thin, no copy/FAQ/links, `Back home` only. 10 use-cases vs home 5 → orphans (`video-editing/travel/general/ai-ml/mixed`). Images `alt=brand+model`, `priority` first only, no `sizes`. GEO: compare `Quick comparison` citable pattern not replicated; no `llms.txt`, FAQ, speakable.

### 5.4 Actions
1. Canonicals everywhere + `title.template` + assert `NEXT_PUBLIC_APP_URL`. 2. `robots disallow /results`, `noindex` results/compare-shell/quiz-?, prune sitemap. 3. Add Breadcrumb+ItemList+FAQ, fix/drop `aggregateRating`. 4. `opengraph-image.tsx` + per-route OG/canonical, fix manifest. 5. Fix header/footer, 300-500w category editorial + links, detail breadcrumb+category. 6. `revalidate=3600` + static categories, ISR detail if freshness allows, expand image hosts. 7. Replicate `geoSummary` as Quick answer, `llms.txt`, speakable+FAQ.

---

## 6. Design System Audit

### 6.1 Tokens (`globals.css`)
- Dark-only single `:root` correct, Inter+Mono coherent, motion `fade/slide/scale/glow` + global reduced-motion kill + hooks, skeletons present. Good.
- Footguns: dual names legacy (`bg-card/text-muted/bg-secondary`) + new (`surface/text-secondary` where `text-secondary=#1A1D28` invisible — must use `text-text-secondary`); `--color-subtle: var(--border)` hack; dead `dark:` variant; no type/spacing/radius scale (ad-hoc `text-[9px]/rounded/p-4/border`); `text-white on bg-accent` in error/admin breaks token/contrast.

### 6.2 Typography / Components
- Mono-uppercase-label + semibold consistent; 9px radar/10px badges/footer `xs` small+low-contrast; no fluid/line-height tokens.
- `Button`: `buttonVariants` shared, focus ring, disabled. Issues: `md/lg` both `text-sm`, `secondary≈outline`, `danger text-background` ~2.8:1, no loading spinner.
- `Card/SpecCard`: `gap-px bg-border` trick good, `truncate` no `title`. `FScoreMeter` 80/60 vs `MatchBadge` 85/70 mismatch. `RangeSlider` validation+aria good but dual overlapping thumbs, no thumb focus. `WeightSlider opacity-0` zero focus indicator, `transition-all` no reduced-motion guard. `ProductImage` fallback no `role/img` label, `alt` lost. `TerminalBox` dots missing `aria-hidden`. Quiz options consistent but no `focus-visible`. `LaptopCard/ResultCard` dense, `truncate` clips.

### 6.3 Layout / Three.js / Charts / Contrast
- `HeaderClient` excellent (sticky compact, `aria-current`, underline, mobile `inert`+Escape+restore, `min-h-11`, safe-area). Hash links 404 off-home. Footer `center→left` flip odd, hardcoded `BUILD:2026.8.2`, generic `x.com`. No skip-link. `flex min-h-full + main flex-1` correct.
- Three: `dynamic(ssr:false)`+pulse, IO frameloop, DPR `[1,1.75]`, 200→80 particles, `aria-hidden`. Gaps: no WebGL-failure fallback (empty hero/`h-64`), no ErrorBoundary/poster, exploded click-only no keyboard/list, fixed `h-64`, hover raycast always on.
- Charts: `FScoreMeter role=img` good, inner text double-announce; `RadarChart` generic label, hover-only tooltip, vertices `r=12` not focusable, fixed `320` overflows 320px (`maxR+18` clip).
- Contrast: `#9CA3AF` 7:1 pass; `tertiary #6B7280` 3.9:1 fail small; `accent #FF5500` 3.4:1 fail small text (rank/badge/nav/radar); `warning #FFB800` borderline. Boot `role=status`+Escape good, `z-9999 pointer-events-none` 1.3s SR noise, no Skip.

---

## 7. Security / Ops / Engineering Audit

### 7.1 Auth
- `admin-auth/cron-auth` `timingSafeEqual` + fail-closed good. Cron prod without secret →403, dev open (documented). `vercel.json` cron has no `Authorization` — relies on Vercel auto `Bearer $CRON_SECRET`; verify dashboard else nightly 401/403 silent.
- `GET /api/laptops` admin-gated (good), `[id]/health/search` public (intended). `POST /api/admin/revalidate` auth but no rate-limit/logging (brute/cache-thrash). `GET [id]` no rate-limit (scrape). No CSRF (Bearer not cookies). Region cookie `httpOnly:false` intentional low-sensitivity ok.

### 7.2 Secrets / Config
- `.env` gitignored, example documents generation, no secrets in repo, CI dummy key. Good.
- `prisma.ts POOL_MAX 15` ≠ example `5` + `idle 120s` → serverless exhaustion. Align to 5, lower idle prod. `pool.on(error)` log-only, no alert.

### 7.3 Injection / Validation
- Strong: `POST quiz safeParse`, `admin/import` per-item + caps (200/50), `PATCH validateLaptopPatch` whitelist, `search` trigram `$queryRaw` + rate-limit `$1/$2` params (safe despite `Unsafe` name).
- Minor: `laptops?page=abc → NaN → skip:NaN 500` (need `isFinite` fallback). `search ?region=us` 400 if `isSupportedRegion` case-sensitive (normalize before check).

### 7.4 Rate-Limit
- DB fixed-window + memory fallback + 2% prune — solid, fixes bloat note.
- Weak: `getClientIP` trusts first `x-forwarded-for` (bypass via rotation; note Vercel `x-vercel-forwarded-for`). No `X-RateLimit-*` (only `Retry-After`). Memory sweep every 100th ok.
- Gaps: health, cron, `[id]` GET, revalidate zero limit. Health `SELECT 1` per hit = DoS amplifier.

### 7.5 CSP / Headers
- Good: `poweredByHeader:false`, `nosniff`, `DENY`+`frame-ancestors none`, Referrer/Permissions, HSTS 2yr preload prod.
- Weak: `script-src self unsafe-inline unsafe-eval` negates XSS (drop `unsafe-eval` if build passes). No `report-uri`, `connect-src self` blocks future analytics/Sentry, `img-src` omits future hosts.

### 7.6 Data-Model Migration Risk (P0)
- **Triple units — highest bug:** `LaptopPrice.price` major (1099=$1099), `PriceSnapshot.priceCents` + `ProductPrice.priceMinor` minor. Cron `*100` correct, comments warn, but `formatPrice` assumes major — spine `p.price` minor → 100× display ($109,900). Audit every spine consumer (`detail-pricing`, `ProductRecommendationCard`), add `formatMinorPrice` / unit-tagged `Money`.
- Spine additive + `legacyLaptopId @unique` safe. Risks: single-spec invariant only in write layer not DB CHECK → orphans; `Product.brandId` required + `Restrict` vs legacy `SetNull` → backfill fail; `DatasourceKind` enum vs legacy String; dual `SlugRedirect/SpineSlugRedirect` diverge.
- `RateLimit @@unique([key,window])` no TTL — prune opportunistic only; spike → bloat (index/cron). `Lead @@unique([email,region])` fire-and-forget ok logged.

### 7.7 Perf
- `unstable_cache(fetchActiveCatalog, [static-key])` region as arg (likely safe, fragile — add region to key). Quiz loads entire catalog per req (cached 3600s ok, cold slow, no projection). Search empty-`q` `take:undefined` unbounded (cap 50). Cron batch 5/day + `~1.1s sleep/country` → weeks at scale; `findMany fresh + notIn` breaks at 10k+ (use `none:{capturedAt gte}` subquery). Trigram needs `pg_trgm` GIN — missing → 500 every search (assert in health/migration).

### 7.8 CI/CD / Observability
- `ci.yml`: lint+typecheck+unit+API(seeded)+Playwright+build, fresh PG16 + `migrate deploy`. Good.
- Gaps: no secret-scan, no `npm audit`/Dependabot, no drift check, e2e `next dev` not `start`, `workers:1/retries:0` slow deliberate, build seeds DB for `generateStaticParams` (brittle → fallback rows).
- Observability: `withLogging` rid/latency/`x-request-id`/500 mask good. No APM/metrics/alerting; cron `console.error` only; health leaks `uptime`; no log sink.

---

## 8. Testing / QA Map

### 8.1 Coverage Present
- Unit: `src/lib/__tests__/{share,recommendation,compare-pairs}`, `tests/scoring/{f-score,filters,answers,reasons,use-cases}` + fixtures, `tests/v2/{engine,canonical,price,region,storage}`.
- API (needs DB): `tests/api/{quiz,search,region,rate-limit,admin-auth,import,patch,seed,slug-redirect,retention,health,jsonld}`.
- E2E: `tests/e2e/{quiz-flow,catalog,results-compare,region-currency}`.

### 8.2 Gaps
- No analytics/session data reviewed; no pairwise/NDCG eval for weights; e2e against dev not prod; no a11y automated check; no visual regression for Three/radar; no load test for quiz cold-start.

---

## 9. Priority Fixes (P0 → P2)

### 9.1 P0 — Decide / Fix Before Ship
- Unify quiz: kill or merge `SpecQuiz` vs `QuizFlow`; single store + server scoring + decomposition re-rank; fix `SEE MATCHES` empty step; persist to `/results`.
- Verify Vercel cron `Authorization: Bearer $CRON_SECRET` + alert on errors; else sync dead.
- Audit `formatPrice` spine call sites (major/minor 100×) + `formatMinorPrice`/unit type.
- Propagate `contradictions` to API output; honor/remove `refurbished` pref (currently penalize-regardless).

### 9.2 P1 — High Value, Low Risk
- Rate-limit `GET [id]`, `revalidate`, `health`, cron + `withLogging` on revalidate; fix `page NaN→500`; normalize region case; align `POOL_MAX 5`; cap empty-`q` 50; `RateLimit` index/cron; canonicals + `title.template` + assert `NEXT_PUBLIC_APP_URL`; `robots/noindex` results/compare-shell; Breadcrumb/ItemList/FAQ + fix `aggregateRating`; OG image + manifest dark; header/footer IA + 300-500w category copy; ISR `3600` categories; `geoSummary` Quick answer + `llms.txt`; unify reasons from engine; fix decomposition parity (carry/screen/build/value/null); confidence expose + scaled penalty + flag; tokens footgun kill (`text-secondary`, `text-white`, dead `dark:`); score color/label single map + button loading + focus rings; slider a11y + charts responsive/keyboard + Three fallback + contrast + skip-link; weights governance + `MET_BONUS` review + `bright→sharp` fix + dead Q removal; relaxation cheapest-first + `exhausted` UI.

### 9.3 P2 — Harden
- Drop `unsafe-eval` if build passes + `report-uri` + `X-RateLimit-Remaining`; secret-scan + `npm audit` in CI; e2e on `next start`; APM/metrics/alerting + cron log sink; price-sync subquery + `pg_trgm` assert; dynamic footer build; compare-bar offset + drawer trap.

---

## 10. Verification & Risks

### 10.1 What Was Verified
- VERIFIED (direct reads): stack, scripts, routes, `src/lib` surface (27 files), `prisma/schema` head (legacy vs spine, units), `.env.example`, `docs/` + `tests/` inventory.
- PARTIALLY VERIFIED (subagent summaries, not re-read): API specifics, CSP/HSTS, sitemap/robots, component states, engine formulas.
- NOT VERIFIED: live DB size/quality, price-feed latency, `build/test/dev` execution, browser/a11y runtime, analytics (completion, drop, CTR).

### 10.2 Remaining Risks / Unknowns (do not assume)
- Real catalog size/quality, price freshness, user split novice vs pro, email willingness, monetization, 60-sec claim, `Base URL` prod value, cron auth working, pool exhaustion under load, spine cutover readiness.

### 10.3 Final Status
- Audit complete, no code changed. `handoff.md` is the deliverable. Next: team-lead decisions (canonical quiz, footer wording, revenue, weight governance) → P0 slice → re-verify (unit+API+e2e+Playwright live + a11y + SEO routes).

