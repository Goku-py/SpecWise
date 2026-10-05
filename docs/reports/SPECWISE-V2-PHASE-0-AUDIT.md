# SPECWISE V2 PHASE 0 — MASTER AUDIT (READ-ONLY FORENSIC BASELINE)

> Status: COMPLETE (read-only; no source modified).
> Repo: https://github.com/Goku-py/SpecWise · Live: https://specwise-tech.vercel.app/
> Local inspection root: `D:\College\Me\Projects\specwise`
> Evidence standard: every claim cites `FILE:` + `SYMBOL:` / config value / command result / observed live behavior.
> Labels: UNKNOWN = cannot verify · PARTIAL = exists but incomplete · INFERENCE / ASSUMPTION explicitly marked.
> Satellites (full depth): `SPECWISE-V2-ARCHITECTURE-MAP.md`, `SPECWISE-V2-QUIZ-AUDIT.md`,
> `SPECWISE-V2-RECOMMENDATION-AUDIT.md`, `SPECWISE-V2-DESIGN-AUDIT.md`, `SPECWISE-V2-DATA-AUDIT.md`, `SPECWISE-V2-TECH-DEBT.md`.
> No fixes, redesigns, or behavior changes were made in this phase.

---

## 1. Executive overview

SpecWise is a Next.js 16.2.10 (App Router) + React 19 + Prisma 7 (Postgres via `pg` adapter) workload-matched laptop
finder. User takes a 4-step Quick quiz (+ optional Advanced step), profile POSTs to `POST /api/quiz`, server scores the
region-filtered active catalog with the v3.1 engine (`Final = 0.65W + 0.20C + 0.15V`, Best-value `0.55/0.20/0.25`),
returns a 12-item DTO persisted to localStorage, rendered on `/results`. Catalog browsing (`/laptops`),
server-rendered detail (`/laptops/[id]`), two disjoint compare systems, cookie-region admin CRUD, nightly PricesAPI
cron, Unsplash-only images, procedural R3F 3D (hero + hardware explorer). Verified in `package.json:27-45`,
`src/app/api/quiz/route.ts:15`, `src/lib/recommend/v3/engine.ts:SYMBOL runV3`, `src/lib/recommend/v3/scoring.ts:1-17`.

Critical production fact (observed 2026-10-04T17:05Z): **live prod DB is empty** — `/` shows
`0 machines · 0 price points · 0 regions`, `/laptops` shows "No laptops in the catalog yet", while `/about` still
claims "56 laptops across 6 regions". `GET /api/health` returns ok. `robots.txt` sitemap points at
`http://localhost:3000/sitemap.xml`. See §30.

## 2. Verified tech stack

| Layer | Verified value | Evidence |
|---|---|---|
| Framework | Next.js 16.2.10, App Router | `package.json:35`, `src/app/` routing |
| Runtime/UI | React 19.2.4, Tailwind CSS v4 (CSS-first, no tailwind.config) | `package.json:38-41,58`, `postcss.config.mjs:3`, `globals.css:1` |
| Language | TypeScript 5 strict (`jsx:react-jsx`, alias `@/*`) | `tsconfig.json` |
| DB/ORM | Prisma 7.8 + `@prisma/adapter-pg` + `pg` Pool (max 15) | `package.json:28-36`, `src/lib/prisma.ts:7-14` |
| Validation | Zod v4 | `src/lib/laptop-fields.ts:1`, `src/lib/validation/product.ts:8` |
| Client state | Zustand 5 (quiz store), localStorage v2 envelopes, URL `?s=` share | `src/store/useV3QuizStore.ts:8`, `src/lib/storage.ts`, `src/lib/share.ts` |
| 3D | three 0.185 + @react-three/fiber 9 + drei 10, all `dynamic ssr:false` | `package.json:30-31,42`, wrappers |
| Anim | `motion` 13 — exactly 1 consumer (`V3Quiz`) | grep `from "motion` → 1 match |
| Icons | lucide-react | header/catalog/footer |
| Email | resend 6 (server-only, `sendResultsEmail` dead code, zero callers) | `src/lib/email.ts:53` |
| Test | Vitest 4 (node env) + Playwright e2e (dev server, workers:1, retries:0) | `vitest.config.mts`, `playwright.config.ts:16-32` |
| Deploy | Vercel; single cron `0 6 * * * → /api/cron/update-prices` | `vercel.json:1-8` |
| Node | `engines >=20.9`, `.nvmrc` 24, CI node 24 + Postgres 16 | `package.json:24-26`, `ci.yml:38-41` |

Notably absent (vs old docs): `@neondatabase/serverless`, `class-variance-authority` — already cleaned.

## 3. Repository structure

```
src/app/            routes, layouts, API routes, server actions, admin
src/components/     landing/ quiz/ catalog/ product/ laptop/ three/ hero/ results/ charts/ ui/ layout/ admin/
src/lib/            prisma.ts regions.ts region.ts region-store.ts catalog-cache.ts db/catalog.ts
                    recommend/v3/ (quiz.ts validate.ts types.ts requirements.ts workloads.ts scoring.ts
                                   capabilities.ts engine.ts) storage.ts share.ts api.ts affiliate.ts
                    compare-pairs.ts layer-specs.ts laptop-fields.ts validation/product.ts
                    admin-auth.ts cron-auth.ts rate-limit.ts slug.ts email.ts utils.ts price-sync.ts
src/store/          useV3QuizStore.ts (quiz canonical profile)
src/hooks/          use-reduced-motion.ts use-count-up.ts
src/proxy.ts        region geo-cookie (NOT middleware.ts — Next 16 convention)
src/generated/      Prisma client build artifact (gitignored, excluded)
prisma/             schema.prisma (559 lines) / migrations (10 dirs) / seed.ts / scripts/backfill-spine.ts / migrate-prices.ts
scripts/            generate-laptops.ts fetch-laptops.ts fetch-images.ts tmp-redir.ts
data/               laptops.json (seed source)
tests/              api/ (12 files) v3/ (2) v2/ (3) landing-p0..p3 (4) + src/lib/__tests__/ (2)
docs/               PRODUCTION-AUDIT.md REDESIGN-ARCHITECTURE.md design-system/ specwise-2/ (16 files)
```

Config: `next.config.ts` (Unsplash-only images, CSP, HSTS prod-only), `eslint.config.mjs`,
`vitest.config.mts`, `prisma.config.ts`, `vercel.json`, `.env.example` (16 vars, names only).

## 4. Architecture

```
Browser (region cookie httpOnly:false + localStorage v2 + "use client" islands ~30)
  │ POST /api/quiz {v3,profile} · GET /api/laptops/search?q&region
  ▼
App Router RSC (async server pages, all data pages force-dynamic)
  ├─ direct prisma reads OR catalog-cache (unstable_cache tag laptops-catalog TTL 3600)
  ├─ server actions: setRegion | login/logout | toggleLaptopStatus | create/updateLaptopAction
  └─ proxy.ts: geo header → region cookie; matcher skips _next/static|image|assets
  ▼
Postgres via pg Pool(max 15)→PrismaPg adapter. Writes ONLY via src/lib/db/catalog.ts
  (validate → tx → invalidateCatalogCache + revalidatePath×6)
  ▲ seed data/laptops.json · import API · cron PricesAPI 06:00
```

Auth: no NextAuth/OAuth. Admin = shared-secret cookie `admin_key` + Bearer APIs; cron = `CRON_SECRET` Bearer.
Public: all pages, `GET /api/laptops/[id]`, `/api/laptops/search`, `POST /api/quiz`. No SWR/React-Query.
Detail page is `force-dynamic` + `generateStaticParams` (US slugs) + `dynamicParams:true`. Full map: ARCHITECTURE-MAP.

## 5. Route map

Pages: `/` (proof + hero) · `/quiz` (RSC shell + dynamic V3Quiz) · `/results` (localStorage-gated client) ·
`/laptops` (force-dynamic + debounced search) · `/laptops/[id]` (slug-or-legacy, 308 redirects) ·
`/compare` (stored snapshot) · `/compare/[slugs]` (canonical SEO pair) · `/category/[useCase]` (runV3 preset) ·
`/about /privacy /terms` (static) · `/admin`, `/admin/laptops/new`, `/admin/laptops/[id]/edit` (cookie-guarded).
APIs: `POST /api/quiz` (public 60/min) · `GET /api/laptops` (admin Bearer) · `GET|PATCH /api/laptops/[id]`
(GET public unthrottled — H1; PATCH admin 30/min) · `GET /api/laptops/search` (public trigram>0.25→contains, ≤20) ·
`POST /api/admin/import` (≤200/≤50, one tx) · `POST /api/admin/revalidate` (tag-only) ·
`GET /api/cron/update-prices` (CRON_SECRET; batch 5; snapshot-first) · `GET /api/health` (`SELECT 1`).
Utility: `sitemap.ts` (+bounded compare pairs) · `robots.ts` (allow /, disallow /admin,/api) · `manifest.ts` ·
`not-found.tsx` · `error.tsx` ("use client").

## 6. User journey

LANDING (`/` hero + 6 workload cards: "Preview here" 3D-glow vs "Start match →" prefill `?s=`) → QUIZ
(4 Quick + optional Advanced; submit POST → localStorage `specwise-v3-results/profile` → `/results`) → RESULTS
(Best-match `FScoreMeter` + WhyBlock; **no detail links, no compare handoff, no share URL**; direct visit bounces to
`/quiz`) → DETAIL (via catalog/compare cards, never via v3 results) → COMPARE (two disjoint systems, zero continuity).
Region change in quiz writes cookie + `router.refresh()`. Dead ends: landing has no browse on-ramp (footer only);
`/compare?ids=` always empty for v3 users (reads legacy `specwise-results` key only). Full trace: DESIGN-AUDIT §4.

## 7. Questionnaire

4 Quick steps (`QUICK_STEPS = Workload/Budget/Priorities/Must-haves`) + conditional Advanced (step 4, only when
`advancedOpen`). Q0 workload multi-cards (6) + importance radios (>1 selected) + gaming subtype conditional +
dev-intensity in Advanced only. Q1 region select + Min/Max numbers + No-max checkbox (optional; no min≤max UI check).
Q2 priorities max-2-of-6 (silent slice, skippable). Q3 must-haves: RAM 16/32/64, storage 512/1024/2048, OS any/prefer/must,
GPU conditional (`gpuRelevant`), weight conditional (`carry` priority). Advanced: workload-gated sections
(`ADVANCED_MATRIX`); cpu-cores hard-only; vram target↔hard flip; size/refresh/battery target-only; ports always-hard
multi; upgrade hard; refurb hard; no Advanced weight editor. Server validation (`CanonicalProfileSchema`) is
authoritative; client gate is only step-0 non-empty. Persistence: localStorage v2 + `?s=` share-in; `reset()` drops
region to US. Exact wording + per-question STATE/DEFAULT/CONDITIONAL/AFFECTS/NEXT: QUIZ-AUDIT.

## 8. Answer → requirement mapping

Every Quick/Advanced control traces to a store mutator and a scoring reader — no orphan control. Budget→hard
min/max (min NEVER relaxed). RAM/storage Prefer = Type-A (explanation-only, no C effect) vs Must = hard
(relax bands `[32,24,16,8]` / `[1024,512,256]`). OS must = hard never-relaxed; os-prefer = Type-B (real C term).
GPU prefer = no targetClass → C-neutral (verified no-effect, not untraceable). Weight hard fails on null.
Display-size/refresh/battery prefers are filter-dead (no hard emitter in UI) — refresh/battery surface via
`missedPreferred`, display-size is fully silent. Ports all-must-match hard (drop-last relax). Upgrade/refurb hard
(refurb never relaxed). Workload proposals are all Type-A targets = explanation seeds, not score movers (except via
weights); `color-prefer` hardcodes `short=0`. Full 22-row matrix: QUIZ-AUDIT §6.

## 9. Recommendation engine

`V3Quiz.submit → POST /api/quiz → CanonicalProfileSchema → getActiveCatalog(region) → toScorable → runV3`:
active-filter → `buildRequirements` → `weightsForProfile` → `capsContextFor` → hard-filter → relax loop (≤3 ledger,
budget1-gated budget2) → exhausted→12 fewest-failures + `awaitingUser` iff `intentHardBlocks` → per-laptop
`capabilitiesForV3` → W/C + `confidenceFor` → pool-local V → `finalScore` → sort (Final→K ε→price→weight→id) →
brand+model diversity cap 2 → price-missing lane (priced first, missing max 3) → slice 12 + explanations
(strengths top-3 raw caps, compromises lowest-2 weight×cap, `missedPreferred`, `whyAbove` Δ>0.02, evidence strings).
`fxToUSD` omitted by both callers (identity; single-currency pool so min-max invariance holds). Verbatim pipeline:
RECOMMENDATION-AUDIT §7.

## 10. Scoring model

Versions `v3.1/v3.1` (`types.ts`). 9 dims `[cpu,gpu,vram,ram,storage,display,battery,portability,build]`.
`W = Σ w·cap / Σ w` over available caps only (nulls excluded both sides). `C` = importance-weighted Type-B shortfall
mean; no B-targets → 1; Type-A ignored (`default: short=0`); `numShortfall` dead code.
`V = 0.5·perfNorm + 0.5·priceScore` (pool-local min-max, `Math.log` price); <4 items or <2 priced → all 0.5.
`K = 0.6·completeness + 0.4·freshness` (missing 0.3 / stale 0.6 / fresh 1.0); tiers High≥.80/Med≥.55/limited.
`overall = round(final·100)`. Workload vectors v3.1 + `INFLUENCE {1.0,0.6,0.25}` blend + `PRIORITY_INCREMENT` shifts +
carry/screen caps context. No penalty/bonus scalars exist in v3. Per-dim anchors/weights/formulas: RECOMMENDATION-AUDIT §8.

## 11. Re-ranking

No live re-rank/rescore. `ResultsViewV3` is display-only ("No client-side scoring or re-ranking").
Legacy `WeightSlider` + `ResultsGrid` adjuster exist but are dormant (no route import observed). No dynamic-weight UI
in v3 flow; priorities are quiz-time inputs, not post-hoc sliders. `quickToProfile` builder is test/share-only.

## 12. Database

Legacy live tables: `Laptop` (40+ cols, `slug @unique`, optional brandId, `status=active`, `String[]` ports/security)
· `LaptopPrice` PK `(laptopId,region,retailer)`, **whole major units** · `PriceSnapshot` (`priceCents` minor,
unique per laptop/retailer/region/capturedAt) · `SlugRedirect` · `Brand` · `Retailer` · `RateLimit` · `Lead`.
Spine (additive, NOT live — "not migrated yet"): `Product` + `ProductPrice` (minor) + `LaptopSpec` 1:1 + port/wireless/
security + Cpu/Gpu/Motherboard/Ram/Psu specs; enums Category(6)/GpuType/RamDimmType/PsuModularity/EfficiencyRating/
MoboFormFactor/WireStandard(6)/PortKind(19)/SecurityFeature(6)/DatasourceKind(4). 10 migrations on disk; SQL contents
not read. Full field tables: DATA-AUDIT §10.

## 13. Catalog pipeline

`generate-laptops.ts` (one-shot → `data/laptops.json`) → `fetch-laptops.ts` (TechSpecs + PricesAPI merge; missing keys
skip) → `seed.ts` (brands 10 + retailers 6 upsert; fail-fast `validateSeedRow`; per-laptop tx; re-seed preserves spec
edits per INFERENCE) → `fetch-images.ts` (Unsplash fill nulls, 1.5s delay) → `backfill-spine.ts` (idempotent,
`--dry-run/--mock`, pure fns). Live reads use legacy tables only; spine has no read path.

## 14. Pricing

Units: `LaptopPrice.price` major whole; snapshot `priceCents = price·100`; `formatPrice` Intl 0-decimals. 6 regions
(US/IN/GB/DE/CA/AU, fx `1, 83·1.18, 0.8·1.2, 0.92, 1.37, 1.54`); strict `isSupportedRegion` on APIs (400, no fallback)
vs lenient UI `getRegion→US`. Seed fx-expands every laptop to 12 rows (2 retailers×6 regions, ±4% 2nd variance).
`pickBestOffer` = cheapest valid (inStock+unexpired), stale fallback flagged, null→`priceMissing`. List page uses
`prices[0]` (no stale flag) vs quiz/detail/compare use `pickBestOffer` — same ordering, different stale semantics.
`buildAffiliateUrl`: affiliateUrl → overrides(empty) → template(all NULL) → url → null; cron writes affiliateUrl:null.
Cron: oldest-`updatedAt` batch (default 5), snapshot-all-first always, apply-only-existing, `PRICE_SYNC_APPLY=false`
snapshot-only. Full matrix per surface: DATA-AUDIT §14.

## 15. Cache / data fetching

`getActiveCatalog(region)` (per-region `findMany` active + region prices, price-asc) · `getLaptopById/BySlug`
(full prices); shared tag `laptops-catalog`, TTL `CATALOG_CACHE_TTL_SECONDS||3600`. Bust = `revalidateTag(tag,"max")`
+ 6 `revalidatePath`s; cron duplicates fan-out; `SKIP_CACHE_REVALIDATE=1` bypass; `/api/admin/revalidate` busts tag
only (INFERENCE: static paths may lag to TTL). No SWR/React-Query. Per-surface source table (§4) in DATA-AUDIT.

## 16. Laptop detail

`/laptops/[id]` server `force-dynamic` + `generateStaticParams` (US) + legacy-id/old-slug 308s. Order: JSON-LD →
Back link → H1 + badges + `DetailPriceLine` → LCP `ProductImage 400×256 priority` → `ExplorerWrapper` (ssr:false) →
8-section spec grid → `DetailPricingTable` (client region filter) → 3 canonical rivals. Pricing/buy hrefs resolved
server-side; client islands switch region post-mount. Detail comment "stays ISR/static" is stale vs force-dynamic.

## 17. Comparison

Two disjoint systems sharing only `canonicalComparisonPath`: A — `/compare?ids=` (client, localStorage legacy
`specwise-results` only, 12 fixed rows, no add/remove on-page, unshareable, **always empty for v3 users**); B —
`/compare/[slugs]` (server, canonical SEO pair, 19 rows, GEO summary + JSON-LD, shareable, no scores). Neither is
scoring-aware (A shows legacy match score; B spec/price only). No cross-link from v3 results to either.

## 18. Images

Single `imageUrl` per laptop (no gallery; `LaptopImage` model unused by flows). `ProductImage` ("use client",
`next/image`, null/error→`Monitor` icon fallback; no blur/sizes/loader). `remotePatterns`: exactly
`images.unsplash.com` (+ matching CSP) — any other host fails optimization; admin URL field has no domain guard.
Alt always `brand+model`. V3 results render **no image**. No CDN beyond Next optimizer.

## 19. Three.js / 3D

All 3D is **stylized procedural illustration** (boxes/cylinders/spheres + canvas textures + PMREM RoomEnvironment) —
no real/CAD/scanned model, no product-accurate dimensions. Hero (`HeroLaptop`: chassis, instanced 48+3 keys, PartSlabs,
512×320 canvas screen; pointer-parallax + scroll explode; DPR ≤1.75, IO-gated) · Topology (8 node spheres + links +
80–200 particles; mount PARTIAL) · Explorer (8 mini-model layers; click-select; honest DB panel, heatsink all-"—").
Every entry `dynamic ssr:false` + DOM poster fallback + `CanvasErrorBoundary` + reduced-motion static frame.
Explorer copy "inspect its real specs" overpromises (geometry is generic).

## 20. Design system

Tailwind v4 CSS-first, dark-only (`--background #090A0F`, `--accent #FF5500`, `--electric #38E1FF`,
`--violet #7C6CFF`), Geist Sans + JetBrains Mono (mono-terminal voice), radius 8/12/16/20, `Button/Badge/Card/Progress/
MatchBadge` primitives + `Chip/RangeSlider/WeightSlider` quiz-local. Token core coherent; component layer duplicated
(`Card` vs hand-rolled divs, two `Section`s, `SpecRow` vs `SpecCard`); dangling `accent-soft` class; 3 heading idioms.
Lucide icons; keyframes + quiz-only `motion`. Full token/usage tables: DESIGN-AUDIT.

## 21. UI architecture

Groups: layout/nav (RootLayout→Header/HeaderClient/RegionPicker/Footer/BootSequence) · forms (`buttonVariants`,
`MustPreferBlock`, native inputs; `RangeSlider` consumer-not-found) · quiz (V3Quiz/store/Progress/share) · results
(v3 live `ResultsViewV3/FScoreMeter`; legacy `ResultsGrid/EvidenceFlow/WeightSlider` dormant) · catalog
(`CatalogView` debounced search + `LaptopCard`) · detail (`DetailPriceLine/Table`, `BuyButton`, `ProductImage`,
explorer) · compare (A/B) · charts (`FScoreMeter` live; `RadarChart` orphaned) · 3D (fenced) · admin (table + form +
toggle/login) · feedback (none — no form/widget/toast system). Duplication noted, no refactor per phase rules.

## 22. State management

Zustand `useV3QuizStore` (in-memory draft; persisted only on submit) → POST → localStorage DTO
(`specwise-v3-results`, server-authoritative, never refetched; stale after catalog changes) + profile
(`specwise-v3-profile` for refine-hydration). Legacy `specwise-results` read-only by compare-A. URL `?s=` full-profile
share-in (≤8192 chars). Cookies: `region` (long-lived, server+client mirror) + `admin_key`. Server: `unstable_cache`
TTL 3600. No quiz Context, no session cookies, no query lib. `WorkloadProvider` is landing-only.

## 23. Admin

Gate: cookie `admin_key === ADMIN_API_KEY` (pages) + Bearer `timingSafeEqual` (APIs); fail-closed if unset; login
10/min/IP, generic error; cookie `httpOnly/secure/sameSite:lax/path:/admin`, 24h, no revocation. List (region GET
filter, unpaginated) · toggle active↔archived (draft unreachable) · create/edit via `LaptopFormSchema` + whitelist
+ slug-regen-on-brand/model + redirect trail · import (≤200/≤50, atomic tx, per-index errors) · **no delete UI**
(`deleteLaptop` dead code) · **no price editor · no preview** (draft via PATCH only). Post-write tag+6-path bust.

## 24. Security

CRITICAL: none verified. HIGH: H1 `GET /api/laptops/[id]` no rate limit (unauthenticated DB read + enumeration);
H2 rate-limit identity trusts `X-Forwarded-For` unconditionally (rotatable; NAT collapse). MEDIUM: M1 raw-secret
cookie + non-constant-time browser compare; M2 stored image/price URLs rendered without scheme allowlist (admin-key
gated); M3 cron/revalidate/health unthrottled (cron secret-gated, expensive per hit); M4 `</script>` breakout via
`dangerouslySetInnerHTML` JSON-LD (admin-key gated). LOW: revalidate missing logging; admin region unvalidated;
`secure:true` breaks localhost; empty-`q` uncapped browse (rate-limited); `sendResultsEmail` dead code.
INFO positives: no `NEXT_PUBLIC_*` secret leak; no unsafe SQL interpolation (parameterized); security headers + CSP;
Unsplash-only image surface; `.env` gitignored. Full evidence: TECH-DEBT §22 (+ appsec partition §21/22).

## 25. Performance

Fenced/lazy 3D (DPR clamp, IO-gated frameloop, disposal, instancing) — good. Risks: `motion` dep for one island;
`RadarChart`/`TerminalBox`/legacy results dead weight (PARTIAL); unpaginated admin table; `/compare?ids=` unbounded
columns; `overflow-x-auto min-w-[600px]` tables; results blank-flash (`null` while loading); 3 known
`setState-in-effect` cascading renders (results-view, hero wrapper ×2) + R3F scene/camera mutation lint errors
(lint currently failing — see §28); duplicate catalog reads per surface; `checkRateLimit` 2% prune; cron batch-5
weeks-to-cover. No bundle/CWV measurement taken (read-only).

## 26. Accessibility

Good bones: single H1s, landmarks, `fieldset/legend`, labeled scroll-regions (compare), `aria-pressed/current/live`,
keyboard-native controls, Escape paths, canvas `aria-hidden` + DOM equivalents, exemplary reduced-motion plumbing
(hook + CSS + per-component). Gaps: compare-only scroll-region treatment (detail-pricing/admin/methodology lack it);
`RadarChart` mouse-only hover (dormant); custom slider focus styling PARTIAL; contrast unmeasured (accent/amber/red
small mono at risk); reduced-motion SSR flash (default animate then correct). No screen-reader/device pass executed.

## 27. Responsive

`md:` nav switch (hamburger + `inert` + focus restore), `sm:2 lg:3` grids, sticky-column compare, fixed 132px
FScoreMeter, `h-80` explorer canvas, `min-h-11` touch targets, safe-area only in mobile menu. Tight spots: budget
Min/Max side-by-side at 360px; tables require horizontal scroll; `RadarChart` fixed 320px (dormant). No container
queries, no landscape rules. No device rendering executed — static-read only.

## 28. Testing

Inventory: `src/lib/__tests__/` (share, compare-pairs) · `tests/v3/` (invariants, cutover) · `tests/v2/` (storage,
region, price) · `tests/landing-p0..p3` (4) · `tests/api/` (12: admin-auth, import, quiz-v3, patch, rate-limit, jsonld,
region, health, retention, slug-redirect, seed, search) · `tests/e2e/` (Playwright, dev-server). Config node-env,
`tests/setup-env.ts` loads `.env`, `tests/api/global-setup.ts`.
Diagnostics performed (2026-10-04, read-only): `npx tsc --noEmit` → PASS (no output); `npm run test:unit`
(`src/lib/__tests__` + `tests/scoring`) → **2 files / 11 tests PASS**; `npm run lint` → **FAIL: 9 errors, 7 warnings**
(errors: `set-state-in-effect` in `results-view-v3.tsx:26`, `hero-laptop-wrapper.tsx:110,131`,
`hero-laptop-scene.tsx:84`; `immutability` scene/camera mutation in `exploded-laptop.tsx:46`,
`hero-laptop-scene.tsx:36,55,60`; empty interface `heading.tsx:4`. Warnings: unused vars in `backfill-spine.ts:474`,
`V3Quiz.tsx:63`, `capabilities.ts:148`, `scoring.ts:10,59` incl. dead `numShortfall` + unused `capabilitiesForV3`
import, `hero-laptop-scene.tsx:75`, `retention.test.ts:17`). Full `npm test` (needs DB/server), `test:api`, `test:e2e`,
`next build` NOT run (mutation/DB-gated; recorded not-run). Untested critical: live quiz→results on empty catalog,
refine round-trip, region-switch re-render, compare-A with legacy payload, cron batch, import rollback.

## 29. Deployment

Commands: dev/build/start/lint/test(+unit/api/e2e)/postinstall-generate/migrate/seed/backfill/fetch-images/setup —
full table in ARCHITECTURE-MAP. Vercel: cron-only config, no auth header (dashboard wiring UNKNOWN). `next.config.ts`:
no domains/redirects/output flags; CSP `connect-src 'self'` blocks future telemetry. Env: 16 vars (README documents
3 — stale). DB: Prisma 7 adapter, 10 migrations, `migrate deploy` in CI; pool mismatch code max-15/15s vs docs 5/5s.
Images: Unsplash-only (`remotePatterns` + CSP). Runtime node 24. E2E runs on `next dev`, never prod build.

## 30. Live-site comparison (observed 2026-10-04T17:05Z via fetch)

| URL | Live state | Verdict |
|---|---|---|
| `/` | Renders; trust panel `0 machines · 0 price points · 0 regions` | works, catalog EMPTY |
| `/laptops` | "No laptops in the catalog yet." | degraded (empty DB) |
| `/quiz` | Q-bank renders | render OK; submit-on-empty UNKNOWN (not exercised) |
| `/results`, `/compare` | title shell only (localStorage gate — expected) | PARTIAL |
| `/about` | claims "56 laptops across 6 regions" | CONTRADICTS live `/` + `/laptops` |
| `/api/health` | `{"status":"ok",…,"uptime":2.82}` | OK |
| `/robots.txt` | `Sitemap: http://localhost:3000/sitemap.xml` | BROKEN (localhost leak) |
| `/sitemap.xml` | unfetchable via tool | UNKNOWN |

Could not verify (read-only/tool limits): quiz POST on prod, detail/category/compare with real rows (none exist),
console errors, CWV, `/admin`, cron runs, OG images, mobile viewports, screenshots.

## 31. Documentation quality

`handoff.md` (2026-09-23) ACCURATE — best entry. `docs/specwise-2/CURRENT-STATE.md` accurate; DECISIONS/ROADMAP are
plans, not shipped (e.g. `/r/[id]`, tie-break variant unconfirmed). `README.md` (106 lines) STALE-incomplete
(5/18 scripts, 3/16 env vars). `docs/PRODUCTION-AUDIT.md` (5.5/10, 2026-08-02) SUPERSEDED ("no CI/tests/sitemap"
all now exist). `docs/design-system/*/MASTER.md` SUPERSEDED (light/gold vs shipped dark/ember; correctly gitignored).
`docs/REDESIGN-ARCHITECTURE.md` contract ACCURATE (three-fencing spot-checks pass). Comments: `proxy.ts` vs
`middleware.ts` stale refs (code, handoff, README, 3 docs); slug-uniqueness comments contradict schema `@unique`;
detail-pricing "ISR/static" stale vs force-dynamic; hardcoded "56 laptops" in `/about`.

## 32. Third-party dependencies

next/react critical; three-stack heaviest but fenced+lazy (keep fence); zustand tiny+critical; zod server-critical;
resend optional (dead path — keep guarded); pg/prisma critical (pool mismatch is the risk); tailwind4 critical;
`motion` single-consumer REVIEW candidate; lucide tree-shaken keep; clsx/tailwind-merge negligible; toolchain
(typescript/eslint/vitest/playwright/tsx/dotenv/cross-env) keep. No audit/Dependabot in CI — vuln status UNKNOWN.

## 33. Technical debt

Full register with PROBLEM/EVIDENCE/IMPACT/RISK (P0–P3): TECH-DEBT.md. Headlines: prod empty DB + stale about-copy +
localhost robots (P0/P1) · cron wiring unverified + batch-5 too slow (P0/P1) · pool mismatch (P1) · GET-by-id
unthrottled + FWD-IP spoofing (H) · raw-secret cookie + URL scheme gaps + JSON-LD `</script>` (M) · results cul-de-sac
+ dual compare + no v3 images + hard-filter footguns (UX) · lint failing 9E/7W (process) · docs drift (P2) ·
Unsplash lock-in (P2) · e2e-on-dev-only (P2) · dead code (`numShortfall`, `RadarChart`, `TerminalBox`, legacy results,
`deleteLaptop`, `sendResultsEmail`) · spine with no read path.

## 34. Preservation map

KEEP AS-IS: v3.1 engine math + weights + tie-break + lane/diversity rules; explanation generator; `CanonicalProfile`
shape + server validation; `pickBestOffer` semantics; slug-redirect 308s; canonical compare paths; admin whitelist +
atomic import; cache tag/TTL discipline; reduced-motion plumbing; JSON-LD safety *model* (after escaping fix).
KEEP BUT REWORK LATER: results page (add detail/compare/share links); compare convergence; image pipeline (multi-host);
admin (delete/price-editor/preview); `?s=` share (results-side UI); cron throughput. REASSESS: `motion` dep; legacy
results/radar/terminal dead code; spine vs legacy dual-schema. DEFER: thermal modeling, multi-image galleries, email
results. REMOVE CANDIDATE (decision-gated, not permission): `numShortfall`, unused imports, dormant components —
only after full-grep confirmation.

## 35. Unknown / unverified areas

1. Live DB row counts/history (seeded ever? wiped?) — no runtime access. 2. Migration SQL contents/applied state.
3. `data/laptops.json` length/drift. 4. Vercel dashboard env/cron-header wiring + run history + DB URLs.
5. `ADMIN_API_KEY/CRON_SECRET` strength/presence in prod. 6. Zod v4 `.url()` scheme strictness. 7. `?page=abc` NaN runtime.
8. Log-pipeline exposure. 9. `HeroTopology` live mount; `RadarChart/RangeSlider/TerminalBox/ResultsGrid` consumers
(full-grep pending). 10. `illustrative-*`/`prefill`/`workload-context` internals. 11. `error/not-found/loading` contents.
12. `status-badge/weight-slider/theme-toggle` deletion state. 13. Contrast ratios, screen-reader + device passes.
14. Bundle bytes, CWV, console errors. 15. Sitemap body, OG rendering. 16. Quiz POST on empty catalog. 17. Vuln status.
18. Traffic/completion analytics (no source in repo).

## 36. Final system map

```
USER → HOME (proof) → QUIZ (profile) → REQUIREMENT MAPPING → RECOMMENDATION ENGINE (W/C/V+K)
  → RANKED CATALOG → RESULTS ├── LAPTOP DETAIL (specs/prices/explorer/rivals) · compare-A (legacy snapshot)
  └── COMPARE-B (canonical SEO pair) → PRICE/DEALS (affiliate hrefs, region-scoped)
FRONTEND: RSC shells + ~30 client islands (quiz/results/catalog/pricing/explorer/charts/admin)
SERVER: API routes + server actions + proxy.ts geo-cookie + unstable_cache (tag TTL 3600)
DATABASE: Postgres — legacy Laptop/Prices live; spine additive/unread; Brand/Retailer/RateLimit/Lead/SlugRedirect
CACHE: per-region catalog + by-id/by-slug; tag+6-path bust; tag-only revalidate gap
EXTERNAL: PricesAPI (cron) · TechSpecs (import script) · Unsplash (images) · Resend (dead path) · Vercel (host+cron)
ADMIN: cookie/Bearer shared-secret CRUD + atomic import + status toggle (no delete/price-editor/preview)
```

## 37. Recommended sequence for future phases (no solutions, only ordering)

1. Decide data truth first: prod DB state + legacy-vs-spine read path + seed/cron ownership — everything (results,
detail, SEO, trust copy) depends on it. 2. Freeze engine contract: confirm v3.1 math/weights/relaxation/ledger as
immutable baseline with invariant tests before any UX work touches requirements. 3. Settle identity/persistence:
results shareability (`/r/[id]` vs URL DTO), stored-DTO invalidation, compare-A/B convergence target — routes and
state flow from this. 4. Settle region/pricing semantics: strict-vs-lenient, stale display rules per surface,
`prices[0]` vs `pickBestOffer` unification. 5. Settle image sourcing: host allowlist + gallery model before any
catalog UI work. 6. Settle admin operating model: single-shared-secret vs real sessions, delete/preview/price-edit
needs — determines auth and tooling scope. 7. Then UX information architecture (results onward-paths, quiz clarity),
then visual system, then 3D/charts role, then a11y/responsive passes, then CI hardening (prod-build e2e, audit step,
lint gate). Each step is a decision input to the next; do not implement out of order.
