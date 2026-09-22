# SpecWise 2.0 — Current State

**Date:** 2026-09-22 (UTC) · **Phase:** 0 — Discovery only · **Method:** read-only source inspection + 6 specialist agents. No production code modified, no redesign, no refactors.
**Evidence tags:** VERIFIED (source/config seen) · INFERRED (strong suggestion) · UNKNOWN (cannot establish) · MISSING (expected, absent) · RISK (verified condition with problem potential).

## 1. Executive Overview

SpecWise is a single Next.js App Router app: workload-quiz → F-score ranked laptop recommendations with 6-region pricing, plus browse/catalog/category/detail/compare/admin surfaces. VERIFIED (`package.json`, `src/app`, `src/lib/scoring.ts`, `prisma/schema.prisma`).
Core pipeline VERIFIED: `QuizFlow` (client) → `POST /api/quiz` → Zod validate → rate-limit 60/min/IP → cached catalog (`status=active` + region prices) → 7-stage filter w/ progressive relaxation → F-score ranking → top 12 → localStorage + optional Resend email → `/results` with client-side radar/re-rank → `/compare?ids=` → `/laptops/[id]` → affiliate/retailer buy link.
Product solves "pick a laptop by workload, not jargon" for students/office/coding/gaming/creative/travel buyers. Trust via zero-bias claim + open methodology table + live DB counts; friction via unexplained terms (F-score, TGP, P3/Delta-E), affiliate-claim dissonance, dead `#api` nav link. INFERRED (code + copy inspection).
Biggest verified risks: three rankers that can disagree (server F-score vs slider re-rank vs breakdown sort); dead questionnaire inputs (`displaySize`, `webcam`, `security`, `gaming`-value, `upgradeability`-value) that never affect scoring; price-missing (`price=0`) laptops ranking top on budget; localStorage-only results (no shareable URLs); `force-dynamic` everywhere (zero static/ISR); region-agnostic JSON-LD lowest-price vs region-filtered UI.

## 2. Repository Architecture

VERIFIED: `src/app` (routes + API), `src/components` (`quiz,results,catalog,compare,charts,three,hero,product,laptop,layout,ui,boot,theme`), `src/lib` (business logic), `src/hooks`, `src/middleware.ts`, `src/data` absent (seed lives in `data/laptops.json`), `prisma/` (schema, single migration `20260707071011_init`, `seed.ts`, `migrate-prices.ts`), `scripts/` (`generate-laptops,fetch-laptops,fetch-images`), `tests/` (scoring/api/e2e), `docs/` (incl. prior `PRODUCTION-AUDIT.md` 2026-08-02, score 5.5/10), `public/` (only svg icons, no OG image), `.github/workflows/ci.yml`, `vercel.json` (cron only), `next.config.ts`, `vitest/playwright` configs.
Conventions VERIFIED: `@/*→src/*`, strict TS ES2017, Tailwind v4 (`@tailwindcss/postcss`, no tailwind.config), `prisma generate` postinstall, generated client in `src/generated/prisma`.

## 3. Technology Stack

VERIFIED (`package.json`): Next 16.2.10, React 19.2.4, Tailwind v4, lucide-react 1.23, motion 13, three 0.185 + fiber 9.7 + drei 10.7, Postgres via `pg` 8.22 + `@prisma/adapter-pg`, Prisma 7.8, Zod 4.4.3, Resend 6.17.2, TS 5 strict, Vitest 4.1 + Playwright 1.62, tsx, dotenv. Node `>=20.9`, `.nvmrc` 24. Fonts Inter + JetBrains Mono via `next/font`; images `next/image` + Unsplash remotePattern only.

## 4. Application Architecture

VERIFIED: Server pages/RSC (`/`, `/laptops`, `/laptops/[id]`, `/category`, `/admin`) + ~30–32 `"use client"` islands (quiz-flow, results-view/grid, compare-content, catalog-view, three canvases via `dynamic(ssr:false)`, region-picker, weight sliders, charts). DB path: Server/API → `lib/prisma.ts` (pg Pool max 15, global singleton) → Postgres; reads via `lib/catalog-cache.ts` `unstable_cache` TTL 3600 tag `laptops-catalog`, busted by `revalidateTag` + `revalidatePath` on admin/cron writes. Region: `middleware.ts` geo (`x-vercel-ip-country`/`cf-ipcountry` ∩ REGION_CODES) → `region` cookie (httpOnly:false, 1y) → `lib/region.ts` server read + `actions.ts:setRegion` + `lib/region-store.ts` client sync. Email: quiz route → `lib/email.ts` (escapeHtml, 10s timeout, fire-and-forget, skip if no key). Data flow `Quiz → POST /api/quiz → getActiveCatalog → toScorable (cheapest regional price else price=0) → scoreLaptops → top 12` VERIFIED.

## 5. Routes and User Flows

VERIFIED pages: `/`, `/quiz` (server region → `QuizFlow`), `/results` (localStorage-only, region-change refetch), `/laptops` (`force-dynamic`, SSR → `CatalogView` + debounced `/api/laptops/search`), `/laptops/[id]` (slug-first then legacy id, legacy→308, else notFound; `generateStaticParams` present but neutralised by `force-dynamic`), `/category/[useCase]` (whitelist else notFound, scores via `scoreLaptops(defaultAnswers+useCase)`), `/compare?ids=` (Suspense + localStorage pool via `useSyncExternalStore`), `/about /privacy /terms`, `/admin + /admin/laptops/new + /admin/laptops/[id]/edit` (cookie `admin_key===ADMIN_API_KEY` else LoginForm), `/sitemap.xml /robots.txt /manifest`, `not-found/error/loading` variants. VERIFIED APIs: `POST /api/quiz` (public, 60/min), `GET /api/laptops` (Bearer admin, 60/min), `GET /api/laptops/[id]` (public, no limit — RISK enumeration), `PATCH /api/laptops/[id]` (Bearer, 30/min, Zod whitelist), `GET /api/laptops/search` (public, 60/min), `POST /api/admin/import` (Bearer, 30/min, ≤200 laptops/50 prices), `POST /api/admin/revalidate` (Bearer, no limit), `GET /api/cron/update-prices` (CRON_SECRET Bearer / prod-403 / dev-open, no limit; Vercel cron `0 6 * * *`), `GET /api/health` (public, SELECT 1). Primary flow + alternates (browse, category, detail) VERIFIED; results/compare break on cleared storage (redirect to quiz) — RISK for sharing.

## 6. Current UX

VERIFIED: home (live counts, CTAs, 5 use-case cards, methodology table, Three.js hero w/ reduced-motion freeze + low-particle), quiz (Quick: workload→budget→review; Advanced: workload→constraints→requirements→review; workload preset cards seed 12 fields; NEXT disabled only if `!useCase`; localStorage persist + 300ms debounce; Back-from-step-0 wipes), results (FScoreMeter + 8-axis SVG radar top-match only + WeightSlider 8-dim re-rank + reset), detail (Overview/CPU/GPU/Mem/Display/Ports/Physical/Battery + region-filtered pricing table + Product JSON-LD + priority LCP image), catalog (debounced search, skeletons, empty/error+retry), compare (12-row table, sticky col, Arrow-key scroll, missing-IDs panel), admin (region price filter, toggle, edit links; 34-field form), header (sticky, scroll-compact, mobile menu w/ inert+Escape+focus-restore, RegionPicker) / footer (affiliate disclosure, BUILD 2026.8.2). States VERIFIED for loading/empty/error each surface. RISK: `#api` nav anchor has no target (dead link site-wide); Database/Catalog naming drift; aside `w-1/4 min-w-[280px]` squeeze on mobile; refurbished/FX pricing shown without "estimate" label.

## 7. Current Questionnaire

Actual UI is `quiz-flow.tsx`, NOT `questions.ts` (dead bank of 18 Qs — zero imports — RISK: divergent RAM/ports/security sets). VERIFIED mapping: gate (mode, client-only branching) · workload (4 cards → `useCase` + preset fills minRam/storage/gpu/battery/portability/displayQuality/gaming — SOFT weight profile + seeds HARD fields) · budget (RangeSlider 200–5000 USD → usdToLocal — HARD) · os (HARD via osScore) · minRam/minStorage (HARD) · cpuBrand (preset-only `no-preference`; HARD exact match; `Qualcomm` catalog values can never match — RISK) · weight→portability (SOFT only) · battery (SOFT only) · displayQuality multi ≤3 (SOFT only) · buildQuality (SOFT-flag; scorer checks Al/Mg/Carbon, ignores value) · upgradeability / displaySize / security / webcam / gaming-value / email (NONE in filter/score — dead; email only triggers Lead upsert + best-effort send). Only `useCase` required by Zod; all else nullable/toggle-to-null; all-null (except useCase) valid → pure profile fit. Validation: arrays capped, email `z.email().max(254)`, region free-string, ports/security free-strings, budget 0–10M no min≤max check. Tech-knowledge needed: minRam/minStorage (some), upgradeability/cpuBrand/displayQuality-oled/etc (yes); rest no.

## 8. Current Recommendation Engine

VERIFIED (`scoring.ts:256 scoreLaptops`, `filterPipeline:151-183`, `computeScores:186-199`): S1 `toScorable` (cheapest regional price else 0) → S2 progressive relaxation per-step (try filter → fallback → skip; never empties unless all-active empty) → S3 dimension scores (heuristics, no cited evidence — UNKNOWN calibration): `gpu dedicated min(1,0.6+vram/32) else 0.3; cpu min(1,0.4+cores/24); ram ≥32:1 ≥16:.85 ≥8:.6 else .3; storage ≥1024:1 ≥512:.85 ≥256:.6 else .4; battery priority-gated (high ≥8h→1 else .3; top ≥10h→1 else .1); portability weight-banded; display per-quality (basic→1, bright ≥400nit, color P3/100% else .4, oled else .2, refresh ≥120→1 ≥90→.7 else .3, touch else .2)` → F-score-style weighted blend (α=0.5 heuristic) over use-case PRIORITIES → rank desc → top 12. No tie-break (ties keep DB createdAt-desc order — RISK instability). `macos+dedicated-gpu` silently relaxes both filters and returns integrated Macs with tradeoff note (no contradiction warning — RISK). `price=0` passes any `min≥0` budget and scores budget=1 (top-rank distortion — RISK). Deterministic given same DB+answers (pure, no RNG). Explanations: reasons/tradeoffs builders + client `computeRankedBreakdown` top-3 `deltaVsPool` as "WHY #1". DIVERGENCE VERIFIED: `decomposition.ts` mirror calls battery/portability/display with null prefs (pool-mean neutral), hardcodes color-accurate→0.4/touch→0.5, redefines build as reviewScore proxy, drops budget+upgradeability without renormalisation; slider re-rank (`Σslider·decomp/Σslider·100`) overwrites matchScore — three rankers can disagree (server F vs slider mean vs breakdown sort).

## 9. Data Model

VERIFIED (`schema.prisma`): `Laptop` 40+ cols (brand/model/variant, os, cpu Brand/Family/Gen/Cores/Benchmark?, gpu Type default integrated/Model/VRAM?, ram Amount req/Type?/Upgradeable, storage Amount req/Type SSD/Expandable, display Size req/Resolution/Refresh 60/Panel?/Brightness?/Gamut?/Touch, battery Capacity?/Life?, weight?, buildMaterial?, webcam?, `ports String[]`, wireless?, `securityFeatures String[]`, backlit/touchscreen/refurbished bools, slug nullable non-unique app-enforced w/ suffix, brandId nullable→Brand SetNull, status enum default active, isPopular, imageUrl?, reviewScore?, notes?; indexes `[status,createdAt desc]`, `[slug]`); `LaptopPrice @@id[laptop,region,retailer]` INT major units; `PriceSnapshot(priceCents minor, inStock, capturedAt, @@unique[laptop,retailer,region,capturedAt])`; `Brand(name/slug unique)`; `Retailer(code unique)`; `Lead @@unique[email,region] (answers Json)`; `RateLimit(key+window unique)`. Heavy optionals + `[]` defaults + false bools; detail page guards each. Slug race (app-enforced non-unique) — RISK.

## 10. Catalog and Pricing

VERIFIED: `scripts/generate-laptops.ts` ~50 hand entries → `data/laptops.json` → `prisma/seed.ts` (deterministic IDs, uniqueSlug, FX fallback 2 retailers×6 regions ±4% variance, Brand/Retailer upserts, wipe+reseed, Unsplash backfill, cache revalidate) → Postgres. `fetch-laptops.ts` TechSpecs (v5 search+detail, regex mappers) + PricesAPI (6 countries, 11s throttle) → pricesOverride. Regions VERIFIED (`lib/regions.ts`): US/IN/GB/DE/CA/AU + currency/fx/retailers. FX cited: IN 97.94, GB 0.96, DE 0.92, CA 1.37, AU 1.54 (seed). Sufficiency: enough for current heuristic ranker; MISSING for future model: TGP/wattage, sustained thermals, panel nits measured/gamut-coverage numeric, keyboard/touchpad quality, mic/speaker, hinge/serviceability scores, real retailer availability/price-validity timestamps, review-count/aggregate rating. Price-validity/availability: `inStock` only in snapshots; JSON-LD hardcodes InStock; UI shows FX estimates unlabeled — RISK.

## 11. Comparison System

VERIFIED (`compare-content.tsx`): reads `?ids=` + localStorage `specwise-results` pool only (no independent fetch); states: no-results→quiz CTA, missing-ids list, empty→results CTA; 12-row table (Price/OS/CPU/GPU/RAM/Storage/Display/Panel/Battery/Weight/Score+Buy), sticky col, keyboard Arrow-scroll, focus ring; displays stale slider-modified matchScore. MISSING: shareable/server comparison, spec-diff highlighting, price-normalised ranking. RISK: cleared-storage or shared link shows error, not products.

## 12. SEO

VERIFIED: site-wide title/description + `metadataBase` (env fallback localhost) + OG siteName/type/title/desc + twitter large-image card + themeColor + `lang=en` (`layout.tsx:21-42`); sitemap 8 static + categories + DB laptops w/ lastModified + DB-fail fallback (`sitemap.ts`); robots Allow:/ Disallow:/admin,/api + sitemap (`robots.ts`); manifest; Organization+WebSite+SearchAction (`/laptops?q=`) + detail Product+Brand+Offer(lowest)+sku/url/image? JSON-LD; single h1/route; header/main/footer/nav semantics; legacy-id→slug 308; category whitelist→notFound; headers in `next.config.ts` (HSTS prod, CSP, nosniff, DENY, poweredByHeader:false); detail LCP priority + always-present alt. MISSING: canonical, robots directive, OG url/images, twitter images/creator, title.template, per-page OG images, BreadcrumbList/ItemList/FAQ/AggregateRating, `offers.availability` real value, proper breadcrumb `ol/li` (current nav>Link+span), pagination (fine now), OG image asset. RISK: sitemap indexes thin shells `/results /compare`; `?q=` uncrawlable client-fetch; category near-duplicates; JSON-LD lowest-across-regions vs region-filtered UI mismatch; `generateStaticParams` + `force-dynamic` conflict.

## 13. GEO / AI Search

VERIFIED strengths: machine-readable spec tables (`SpecRow`), region/currency price rows, Product JSON-LD, deterministic live counts, affiliate disclosure + contact + non-affiliation statement, 6-region awareness w/ flag+single-currency UI. MISSING: visible last-updated/published dates, price-validity, review-methodology/author entity, BreadcrumbList/ItemList/FAQ schema. RISK: hardcoded `BUILD 2026.8.2` + "56 laptops" copy drifts vs live DB and poisons snapshots; region-agnostic offer vs regional UI inconsistency. No ranking-effect claims made.

## 14. Accessibility

VERIFIED: mobile menu Escape+focus-first+restore+`inert`; `/` focuses search; RegionPicker listbox/option/selected; quiz `nav aria-label`; `focus-visible:ring-2` on buttons/links; reduced-motion collapses CSS animations + hero freezes (80 vs 200 particles, viewport-gated) + explorer snaps + quiz scrollToTop respects; canvases aria-hidden; charts/demo `role=img`+labels; fieldset/legend, labelled email, sticky-col scoping, arrow-key table nav. MISSING/RISK: search input placeholder w/o `<label>`; async error string w/o `role=alert`; header toggle 40px < 44px target; muted `#9CA3AF` on card borderline (ratio unmeasured — UNKNOWN); custom sliders lack `role=slider` audit; no `aria-live` on results; 3D topology lacks full textual equivalent; quiz per-field errors untraced (UNKNOWN).

## 15. Performance

Code-baseline VERIFIED: three/fiber/drei isolated via `ssr:false dynamic()` (mitigated); zod/resend/pg server-only (good); ~30 client islands; RSC pages BUT `force-dynamic` on `/laptops /laptops/[id] /category /admin*` + cron + blocking async layout DB count → zero static/ISR (RISK); `next/image` + detail/grid priority + memo card (fixed) but no `sizes` seen; Inter/JetBrainsMono display:swap; single `findMany+include prices(region, 6 cols, orderBy)` + in-mem scoring — no request-path N+1; search `contains insensitive OR(brand,model) orderBy isPopular`, no tsvector/trigram (RISK at scale) + 60/min limit; `unstable_cache` TTL3600 shared getters (deprecated API in Next 16 — RISK) + ×5 revalidatePath; quiz O(n) over ~56 rows (cheap); stagger animations (idx×60–200ms) risk perceived LCP/CLS; OG/social image, Cache-Control, Sentry/APM absent. Commands: `tsc --noEmit` PASS (exit 0), `eslint` PASS (exit 0) — VERIFIED via read-only run; build/dev/migrations/vitest/playwright NOT RUN in Phase 0.

## 16. Security

VERIFIED: `ADMIN_API_KEY` Bearer w/ `timingSafeEqual` (`admin-auth.ts`), `CRON_SECRET` same (`cron-auth.ts`); admin cookie `httpOnly, Secure (unconditional — RISK breaks http localhost), SameSite=lax, path:/admin, 24h`, 10/min login; RSC cookie `===` guard (non-constant-time, low risk); API auth matrix §5; quiz/search/get 60, patch/import 30, login 10 per min/IP; missing limits on health/get-by-id/revalidate/cron (low risk; get-by-id enumeration noted); Zod v4 strict enums, nullable 0–10M, array caps; only raw SQL is rate-limit with parameterised `$1..3` (safe); rest Prisma builder; `.env` gitignored, `.env.example` 14 key names only (values never read); XSS: email escapeHtml + http(s) URL check + `rel=noopener noreferrer sponsored` good, but JSON-LD `dangerouslySetInnerHTML JSON.stringify` w/o `</script>` escape (VERIFIED RISK); CSRF: Bearer APIs immune, cookie server-actions rely on SameSite:lax only (RISK, Next built-ins UNKNOWN); SSRF: no user-URL fetch; outbound PricesAPI/Unsplash fixed + `seed revalidate fetch(appUrl)` env-controlled; no user uploads. Headers VERIFIED (`next.config.ts`); CSP allows `unsafe-inline/unsafe-eval` (weakens XSS — RISK); images locked to Unsplash. Deps versions VERIFIED, vuln status UNKNOWN (no audit run — MISSING); no secret-scan/dep-audit in CI.

## 17. Testing

VERIFIED inventory: `vitest.config.mts` (node env, `tests/**/*.test.ts`, 30s, dotenv + `SKIP_CACHE_REVALIDATE=1`, global-setup waits 30s + warms 5 routes, XFF helpers); `playwright.config.ts` (e2e dir, workers 1, retries 0, base :3000, reuse dev); scoring suites (filters, f-score, answers, reasons incl. battery≥8h gate, use-cases golden top-3 × every useCase on 56-row fixture + 5-row edge fixtures); api suites (health, quiz 200/400/429, rate-limit 429+Retry-After, admin-auth 401/400/200 matrix, patch 400/404/apply-revert/429, import valid/per-index/>200); e2e (quiz gate→stub→results serial, results/compare seeded/empty/hydration, catalog SSR+debounce+empty, region INR/USD/switch/menu-Esc). MISSING: coverage thresholds/reporters, typecheck/lint counted as CI only. Status: tsc PASS, eslint PASS (read-only runs); vitest/playwright/build NOT RUN in Phase 0 → record as NOT RUN (not PASS/FAIL).

## 18. Deployment

VERIFIED: Vercel (cron-only `vercel.json`); default `next build/start`; Node ≥20.9 / 24; env keys §16; `CRON_SECRET` prod-required, `SKIP_CACHE_REVALIDATE=1` test-only; single migration `20260707071011_init`, `prisma.config.ts` seed, `db:setup=generate+migrate+seed`; CI (`.github/workflows/ci.yml` 173 lines): unit (lint+tsc+test:unit) → api (dev+test:api) + e2e (chromium) + build on postgres:16; build needs DB rows for static params. MISSING: down-migration/rollback, secret-scan/dep-audit/preview, explicit CDN config (INFERRED Vercel edge), Sentry/uptime, custom domain (UNKNOWN — not in repo), structured logging beyond `lib/logger.ts` rid+JSON console + `x-request-id`.

## 19. Technical Debt

VERIFIED: dead `questions.ts` bank diverged from live quiz; client/server scoring divergence (three rankers); `price=0` missing-price distortion; dead inputs collected but unscored; no tie-break; slug non-unique app-enforced + race; `unstable_cache` deprecated in Next 16; `force-dynamic` everywhere; search without FTS index; hardcoded BUILD/count copy; OG-image/ canonical/ breadcrumb-schema gaps; CSP unsafe-inline/eval; JSON-LD script-escape; admin Secure-cookie dev break; cron dev-open; rate-limit IP-spoofable (standard); single migration + wipe+reseed (data-loss risk on misuse); `data/laptops.json` hand-entries + regex TechSpecs mappers (fragile); no coverage gates.

## 20. Rehaul Opportunities

Opportunity map — directions only, NOT decisions:

| Area | Current State | Evidence | Problem | Potential Direction | Priority |
|---|---|---|---|---|---|
| Product positioning | Workload quiz + zero-bias claim, affiliate footnote | `page.tsx`, `footer.tsx`, `about` | Bias-claim dissonance, "database" undersells guidance | Clarify honest-monetisation story + guided-first messaging | High |
| Homepage | Live counts + cards + methodology + 3D hero | `page.tsx:51-79` | Heavy hero, dead #api link, drift-prone hardcodes | Lightweight proof-first hero, evergreen counts | Medium |
| Navigation | Database/Compare/methodology/api + region picker | `header-client.tsx:20-21` | Dead #api anchor, naming drift | Single taxonomy + verified anchors | Medium |
| Questionnaire | Quick/Advanced presets, 1 required field, dead bank | `quiz-flow.tsx`, `validation.ts:74` | Dead inputs, `questions.ts` divergence, jargon | Single question bank wasted-input-free, plain-language | High |
| Preference model | Null-heavy answers, weight presets | `validation.ts`, presets `60-157` | Sparse/all-null valid, implicit trade-offs | Explicit hard-vs-soft + priority model | High |
| Recommendation engine | 7-stage relax + heuristic F-score, no tie-break | `scoring.ts:151-256` | Arbitrary weights, 3 rankers disagree, price-0 distortion | Calibrated weights, one ranker, measured fallbacks | High |
| Results | Radar top-match + sliders overwrite score | `results-view:106-119` | Slider re-rank contradicts server, WHY opaque | One explainable score + honest "adjusted view" label | High |
| Laptop detail | Full specs + regional prices + Product JSON-LD | `laptops/[id]` | Region-agnostic offer, flat h2s, no related links | Region-consistent facts + related paths | Medium |
| Comparison | localStorage pool, stale scores | `compare-content.tsx` | Unshareable, missing-IDs error | Server-resolvable shareable compare | Medium |
| Catalog | SSR + debounced search, no FTS | `laptops/page`, `search/route` | Uncrawlable `?q=`, no trigram, no pagination plan | SSR search + index + canonical pages | Medium |
| Mobile UX | Responsive grids, 40px toggle, squeeze aside | `header-client`, `results-view` | Touch-target + squeeze risks | 44px targets, stacked results layout | Medium |
| Accessibility | Good keyboard/motion baseline, label/alert gaps | `catalog-view:106`, `globals.css:164` | Missing label/alert/slider roles | Label every input, live-region results | High |
| Design system | Dark-only tokens, hairline/glow utils | `globals.css:10-61` | Borderline muted contrast, dual legacy/new names | Contrast-verified token pass | Low |
| SEO | Sitemap/robots/OG base, no canonical/OG-image | `layout:21-42`, `sitemap.ts` | Thin `/results /compare` indexed, duplicate categories | Canonical + noindex shells + OG assets | High |
| GEO | Strong tables/JSON-LD, no dates/methodology entity | `SpecRow`, JSON-LD | Drift hardcodes, region mismatch | Dated, region-consistent, attributed facts | Medium |
| Data model | 40-col Laptop, app-enforced slug, snapshots | `schema.prisma` | Slug race, optional-heavy, no validity stamps | Unique slug, price-validity, measured fields | High |
| Performance | Dynamic-everything, deprecated cache API | `force-dynamic` ×5, `catalog-cache` | Zero ISR, deprecated API, stagger LCP | Static-where-possible, current cache API | Medium |
| Security | Bearer admin, Zod, weak CSP/script-escape gaps | `admin-auth`, `next.config:12-50` | unsafe-inline/eval, unescaped JSON-LD, no limits on 3 routes | Harden headers/escape/limits without breaking admin | High |
| Testing | Scoring+API+E2E suites, no coverage gates | `tests/`, `vitest/playwright` cfgs | Unrun-in-Phase-0, no thresholds | Baseline CI run + coverage gates in Phase 1 | Medium |
| Deployment | Vercel + single migration + wipe-seed | `vercel.json`, `ci.yml`, `seed:258` | No rollback, reseed wipe risk | Safe migrations + backup/restore runbook | Medium |

## 21. Unknowns / Questions

UNKNOWN: live `DATABASE_URL`/keys parity; custom domain; `data/laptops.json` row count at audit time; quiz per-field error copy; muted/accent contrast ratios; `/results //compare` indexability intent; `#api` anchor intent; weight/threshold calibration evidence (α=0.5, PRIORITIES); vuln status of deps; scale needs (pagination/FTS thresholds); sender-domain verification for Resend. Questions for Phase 1: shareable-results requirement? price-estimate vs live-price promise? admin SSO vs API-key? static-vs-dynamic SEO target? affiliate disclosure wording owner?

## 22. Files and Systems That Must Be Preserved

`prisma/schema.prisma` + migrations + live data (no wipe outside seed); `src/lib/scoring.ts` behaviour until replacement calibrated (golden `use-cases.test.ts` fixture is regression anchor); `src/lib/validation.ts` contract; `src/lib/catalog-cache.ts` invalidation keys; `middleware.ts` region cookie contract; slug→308 redirect (`laptops/[id]/page.tsx:164`); sitemap/robots/health/cron paths; `ADMIN_API_KEY/CRON_SECRET` auth; `Lead/RateLimit/LaptopPrice/PriceSnapshot` tables; localStorage keys (`specwise-quiz-answers/step/mode`, `specwise-results/answers`) for backward compat during strangler.

## 23. High-Risk Areas for Rehaul

Strangler/parallel preferred: scoring replacement (golden tests first), slug-uniqueness migration (backfill + unique index, not rewrite), dynamic→static route conversion (SEO value at stake), questionnaire single-bank merge (user-visible), compare shareable URLs (preserve old `?ids=`+storage fallback), CSP tightening (breaks inline 3D/styles if rushed), reseed/migration safety (backup before any destructive seed), admin auth changes (lockout risk), price-region consistency (JSON-LD vs UI).

## 24. Current-State Verification Checklist

- [x] Routes/pages/APIs enumerated from source — VERIFIED
- [x] Quiz→API→filter→score→results→compare→detail traced — VERIFIED
- [x] Questionnaire mapped incl. dead inputs + dead `questions.ts` — VERIFIED
- [x] Scoring formulas documented (heuristics flagged UNKNOWN-calibration) — VERIFIED
- [x] Decomposition divergence + three-rankers — VERIFIED
- [x] Prisma models/relations/nulls + ingestion chain — VERIFIED
- [x] SEO/GEO/a11y/perf/security/testing/deployment inspected — VERIFIED
- [x] `tsc --noEmit` PASS, `eslint` PASS (read-only) — VERIFIED
- [ ] `vitest run`, `playwright test`, `next build` — NOT RUN in Phase 0 (explicitly out of scope for write-safety)
- [x] Production code unmodified; no deps installed/deleted — VERIFIED
- [x] `AGENTS.md` absent at root (`**/AGENTS*` zero hits) — no update made — VERIFIED
