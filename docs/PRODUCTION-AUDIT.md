# SpecWise — Production-Level Audit Report

**Date:** 2026-08-02 · **Method:** 5 parallel specialist lanes (live QA via Playwright, design review, senior architecture review, external research, static stack/SEO audit) + direct verification · **Server:** Next.js 16.2.10 dev, live-tested at 6 viewports

---

## 1. Executive Summary

SpecWise is a well-organized full-stack demo (~9K lines, Next.js 16 + Prisma 7 + PostgreSQL) with a genuinely good recommendation engine and a defensible security baseline — but it is **not yet a production system**. The quiz-to-results core is the product and it works; the catalog experience is bolted on as client-side shells that fetch from internal APIs, which cripples SEO and Core Web Vitals, and several shipped features are broken or misleading.

**What's strong:** 8 committed DB migrations (incl. pg_trgm search indexes); strict TypeScript; Zod validation; constant-time admin key checks; security headers + CSP; rate limiting on core endpoints; solid quiz UX foundations; zero horizontal overflow across all tested viewports; correct `next/image` + `next/font` usage; React Compiler on by default.

**What's broken or blocking:**
1. **Admin toggle is dead code** — `toggleLaptopActive` server action reads an `Authorization` header that browsers cannot send → always "Unauthorized".
2. **All 56 seeded laptop IDs end in `-undefined`** (`prisma/seed.ts:68` interpolates a `region` field that doesn't exist in `data/laptops.json`) → broken URLs/canonicals.
3. **CSP blocks the app's own geolocation** — `connect-src 'self'` rejects `https://ipapi.co/json/`, 2 console errors on every page load.
4. **Hydration mismatch on `/compare`** — localStorage read during first client render.
5. **Homepage fabricates stats** ("1,248 Laptops", "93% accuracy", "12 regions") vs 56 real laptops / 6 regions — legal/E-E-A-T liability.
6. **Catalog pages are client shells** — `/laptops`, `/laptops/[id]`, `/category/*` render nothing server-side → empty to crawlers, LCP gated by hydration + API round-trip + DB query.
7. **No tests, no CI, no rate limit on search/admin-login, no sitemap/robots/metadata, no affiliate disclosure.**
8. **Visual design is template-grade** — DM Sans + stone/amber, staggered fade-ins, pill badges, bento formula: the recognizable "AI-generated" signature.

**The path:** Phase 0 quick fixes (1–2 days) → Phase 1 server-rendered catalog + honest homepage (1 week) → Phase 2 data model v2 + admin CRUD + affiliate/pricing system (1–2 weeks) → Phase 3 search & discovery (1 week) → Phase 4 tests/CI/scale.

---

## 2. Overall Rating: **5.5 / 10**

| Area | Score | One-line verdict |
|---|---|---|
| Tech stack & dependencies | 7/10 | Modern, clean, 2 unused deps, minor version lag |
| Architecture & rendering | 6/10 | Good core; wrong SSR/CSR balance for a catalog |
| UI/UX design | 4/10 | Functionally solid, visually generic/AI-flavored |
| Responsiveness | 8/10 | Best-in-class for this codebase; no overflow anywhere |
| Performance (CWV) | 5/10 | Client shells + no caching → LCP 2.5–4s on 4G |
| Accessibility | 6/10 | Good foundations, systemic gaps (motion, keyboard) |
| SEO | 3/10 | Un-crawlable content pages, no metadata/sitemap/schema |
| Routing & redirects | 6/10 | Fine routes, 3 dead footer links, 1 wrong slug |
| Catalog scalability | 4/10 | Seed-script-bound; no create path, no admin CRUD |
| Code quality & ops | 5/10 | Clean code; no tests/CI/logging strategy/engines pin |
| Security | 7/10 | Solid baseline; CSP self-breakage, spoofable IP, PII |
| Data integrity | 5/10 | `-undefined` IDs, fabricated stats, dead quiz fields |

---

## 3. Tech Stack Audit

| Technology | Version | Why it's used | Verdict |
|---|---|---|---|
| Next.js (App Router, Turbopack) | 16.2.10 | Framework | ✅ Keep. 2 patches behind (16.2.12). Cache Components (`cacheComponents`, `'use cache'`, `cacheLife`/`cacheTag`) are the current API — `unstable_cache` is deprecated-replacement |
| React / React DOM | 19.2.4 | UI | ✅ Keep; bump to 19.2.8. React Compiler enabled by default in Next 16 — verify zero babel conflicts |
| TypeScript | 5.9.3 | Types | ✅ Keep. TS 7 (tsgo) exists — do not jump yet. Add `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, drop `allowJs` |
| Tailwind CSS 4 | 4.3.2 | Styling | ✅ Keep; bump 4.3.3 |
| Prisma 7 (prisma-client gen, driver adapters) | ^7.8.0 | ORM | ✅ Correct modern setup. Bump 7.9.1 |
| PostgreSQL (pg + Neon) | pg ^8.22.0 | Data | ✅ Keep. **Unused dep: `@neondatabase/serverless` — zero imports; remove** |
| Zod | 4.4.3 | Validation | ✅ Server-only, zero client weight |
| Resend | 6.17.2 | Email | ✅ Fine; bump 6.18.1 |
| lucide-react | ^1.23.0 | Icons | ✅ Tree-shakes fine; bump 1.28.0 |
| clsx / tailwind-merge / cva | — | Styling utils | ⚠️ **`class-variance-authority` unused (zero imports); remove**. Keep clsx + tailwind-merge |
| npm | — | Package manager | ✅ |
| eslint 9 + eslint-config-next | 9.39.4 | Lint | ✅ Stay on 9.x (v10 unsupported by config-next) |
| Fonts | DM Sans (next/font) | Typography | ⚠️ Replace per design section (AI-signature font) |
| State management | Context + localStorage | Client state | ✅ Appropriate at this scale; no new library needed |
| Animations | CSS keyframes | Motion | ⚠️ 5 near-identical keyframes, 2 unused; consolidate |
| Search | pg_trgm ILIKE (GIN) | Search | ✅ Correct for ≤10K items; migrate to tsvector + Typesense later |
| CI/CD | — | — | ❌ None — highest-priority gap |
| Testing | — | — | ❌ None — `scoring.demo.ts` exists but is unwired |

**Config issues:** no `engines`/`.nvmrc` (host runs Node 24.18.1, nothing pins ≥20.9); `@types/node` ^20 vs Node 24; `POSTGRES_POOL_MAX` default 15 vs 5 documented in `.env.example`; `.env.example` contains a mojibake character (`API ?"used`).

---

## 4. UI/UX Audit

### Why it looks AI-generated (evidence-based)
The design lane isolated 16 specific tells, the most damning:

1. **DM Sans + stone + amber** (`layout.tsx:9`, `globals.css:6-18`) — the single most common AI-template font/palette combo.
2. **Staggered `animate-fade-in` + `animationDelay`** at 0.1s intervals (`page.tsx:58-166`, `results-grid.tsx:130`) — the recognizable AI motion signature.
3. **Pill-badge intro chips** ("Precision Matching Engine") — 80% of AI landing pages.
4. **The section formula:** `py-24` + centered `text-2xl font-bold` h2 + muted subtitle + bento grid.
5. **Hover-lift cards** (`hover:-translate-y-0.5 hover:border-accent/30`) everywhere.
6. **Ad-hoc second accent** — raw `text-blue-500` appears once ("Advanced" mode, `quiz-flow.tsx:170`), breaking the amber identity.
7. **Zero depth** — every surface is `border bg-card rounded-xl/2xl`; no elevation hierarchy.
8. **Dead template CSS** — unused `glow-pulse`/`float` keyframes; `MASTER.md` references Satoshi/GSAP that were never implemented (doc/code drift).
9. **Generic microcopy** ("engineered for you", "No account required • Free to use") — content-free filler.
10. **Fake affordances** — a visible `⌘K` hint wired only to `/`; `✓`/`!` text-glyph icons; same `Monitor` icon reused for Graphics and Overview.

### Redesign direction: "Precision Instrument"
A measurement-lab identity for laptop discovery — editorial serif + instrument-panel data, one ember signal color:

- **Typography:** Fraunces (display, H1/H2, `-0.03em` tracking) + Schibsted Grotesk (body) + **IBM Plex Mono for every spec value, price, score, and stat** — mono data is the identity hook and supercharges scanability.
- **Color:** ember (`#C14000` light / `#FF6B2C` dark) on bone (`#F5F3EE`) / ink (`#0B0B10`); `--good` green for match wins; delete the ad-hoc blue; all tokenized, dark-default preserved.
- **Surfaces:** 6px radii, hairline borders, 3 elevation levels, dotted-grid image underlays, one 1.5px ink-border "instrument moment" per screen.
- **Motion:** one choreographed entrance per page (600ms `cubic-bezier(0.16,1,0.3,1)`), directional quiz transitions, 200ms micro-interactions, all transform/opacity only, full `prefers-reduced-motion` guard.
- **Key components:** bottom-sheet mobile nav; radial match-score gauge + two-column "fits brief / trade-offs" ledger on results; instrument-panel definition list on detail page (kills icon repetition); compare table with per-row **winner highlighting** (ember tick + "BEST" tag); 44px+ touch targets everywhere.
- **Copy:** factual, human tone ("3 minutes, 7 questions, zero jargon"); real numbers only.

*(Copy rewrite is orchestrator responsibility after design implementation; design spec in `.opencode` design lane output.)*

---

## 5. Responsiveness Audit

**Live-tested: 8 pages × 6 viewports** (344×882 foldable, 375×667, 768×1024, 1024×768, 1440×900, 2560×1440).

**Headline result: zero page-level horizontal overflow at any viewport** — verified via scrollWidth vs innerWidth on every combination. Grids reflow correctly (1/2/3 cols), images never distort (all `next/image` object-cover), sticky header and compare bar never collide.

**Issues found:**
| Sev | Issue | Detail |
|---|---|---|
| SHOULD-FIX | Touch targets < 44px (WCAG 2.5.8) | Theme toggle 24×24, region button 32px, breadcrumb link 33×16, retailer icon buttons 32×32, quiz budget inputs 42px — on every page |
| SHOULD-FIX | Compare table keyboard-unreachable | 600px-min table in `overflow-x-auto` with no `tabindex`/focusable children → ~270px of columns unreachable at 375px |
| NIT | Mobile menu is in-flow expansion | Pushes content instead of overlaying — acceptable, but bottom-sheet preferred (design §4) |
| NIT | Ultrawide full-bleed stretch | Fine, but content max-width recommended (max-w-6xl with margins) |
| NIT | Compare table horizontal scroll | Internal scroll is contained, but mobile card layout recommended (§4) |

**Recommendations:** unify to 44px min targets; card-layout transform for all 3 tables on mobile; `env(safe-area-inset-bottom)` on floating bars; `sizes` prop on grid images.

---

## 6. Performance Audit

**Estimated current CWV (4G): LCP 2.5–4s, Lighthouse Perf ~55–70** on content pages. The dominant cause is architectural: `/laptops`, `/laptops/[id]`, `/category/*`, `/results`, `/compare` are client components rendering `null`/skeletons until a post-hydration fetch completes (API → DB). Home is fine (static text LCP).

**Top issues with expected impact:**

| # | Issue | Impact |
|---|---|---|
| 1 | CSR data-fetch shells on all content pages | **Largest lever.** Server-render `/laptops` + `/laptops/[id]` (ISR, shared catalog cache) → LCP < 1.2s target becomes reachable; saves a round-trip + DB query per visit |
| 2 | No `Cache-Control` on any API response; `/api/laptops/search` hits Postgres per keystroke (300ms debounce) | Add CDN/s-maxage headers + serve search from the cached catalog; INP guard |
| 3 | `/results` blank-until-fetch + layout shift | Skeleton now, but ISR/`use cache` upstream removes the flash |
| 4 | Detail hero image `loading="lazy"` yet it's the LCP element | `priority` prop → ~0.3–0.5s LCP win on detail pages |
| 5 | 5 near-duplicate keyframes + 20 inline animationDelays on home | Perceived delay ~0.3s; consolidate |

**Already good:** `next/font` (self-hosted, preloaded, `display:swap`), `next/image` with width/height + lazy loading (56 cards load only 18 images), React Compiler on by default, zod/resend/pg all server-only, lucide tree-shakes (~20 icons). **No bundle bloat found.**

---

## 7. Accessibility Audit (WCAG 2.2 AA)

**Passes:** logical tab order; `:focus-visible` respected on buttons; real `<button>`s (no div-buttons); meaningful image alts; contrast passes (muted 4.60:1, accent 4.71:1); `html lang="en"`; labeled quiz inputs (aria-label).

**Fails / needs work:**

| Sev | Finding | Fix |
|---|---|---|
| SHOULD-FIX | **No `prefers-reduced-motion` anywhere** — zero media queries; animations run unconditionally | Single global `@media (prefers-reduced-motion: reduce)` zeroing animation/transition durations |
| SHOULD-FIX | Compare table not keyboard-scrollable | `tabindex="0"` + arrow-key handler, or sticky first column |
| SHOULD-FIX | `<a>`/`<Link>` wrapping `<button>` (invalid interactive-in-interactive) | Header CTA, compare empty-state, results "View Deal", category back link | Make the link the styled element or use router |
| SHOULD-FIX | Mobile menu Escape key dead (listener on container, focus stays on toggle); no focus move/restore | Move handler + manage focus |
| NIT | Quiz email input placeholder-only label; budget inputs aria-label-only | Visible `<label>` or `aria-labelledby` |
| NIT | MatchBadge emerald-500-on-emerald-500/20 ≈ 3:1 | Use full-strength token (new `--good`) |
| NIT | Heading order: home renders `h3` before `h2`; steps skip to `h4` | Fix hierarchy |
| NIT | Header link focus = thin `outline:auto 1px`; card accessible names concatenate full text | Unified `ring-2` focus; aria-label on cards |
| NIT | `/laptops` card name reads entire card text; `⌘K` hint is false | Short names; wire `meta+k` or remove hint |

---

## 8. SEO Audit

**Grade: F** — the biggest systemic gap.

- **Metadata:** only root layout exports title/description. No page-level `Metadata`/`generateMetadata` anywhere; no OpenGraph, Twitter cards, canonical, alternates, `viewport`, or `theme-color`. `/laptops/[id]` and `/category/*` **cannot** add metadata — they're `"use client"`.
- **Crawlability:** `/laptops`, `/category/*`, `/results`, `/compare` render empty shells to crawlers (client-fetch). Quiz funnel has zero crawlable content. **Converting catalog pages to RSC/ISR is the single highest-ROI SEO fix.**
- **Sitemap/robots:** none (`robots.ts`, `sitemap.ts`, `manifest.ts`, icons, `opengraph-image` all missing).
- **Structured data:** zero JSON-LD — missing Organization/WebSite (home), Product (detail, incl. offers/reviews/aggregateRating).
- **Truthfulness/E-E-A-T:** homepage claims "1,248 Laptops", "2k+ Models" (contradicts itself), "85,000+ Price Points", "12 regions", "93% accuracy rate" — none real (56 laptops, 6 regions, static seed prices). **Legal liability** (false advertising) + trust killer. Footer: "© 2025"; links to `/about`, `/privacy`, `/terms` → **404**; social links to bare `x.com`/`github.com`. **No affiliate disclosure** (FTC/ASA violation with `affiliateUrl` present).
- **Headings/semantics:** good `header/nav/main/footer/table` usage; h1s unique; home h3-before-h2 violation; internal linking lacks `/laptops` ↔ `/category` cross-links.

---

## 9. Component Architecture Review

**Current state:** home, quiz shell, admin, API routes = server components; everything else `"use client"` with `useEffect`+`fetch` against own APIs; region is global client context (3s `ipapi.co` timeout → every page renders US first then flips); 17 `"use client"` modules; duplicated DTOs hand-declared in 3 pages; no `loading.tsx`/`not-found.tsx`.

**Rendering strategy (target):**

| Route | Strategy |
|---|---|
| `/` | SSG with real catalog counts at build |
| `/laptops` | **ISR server component** (shared catalog cache, `revalidate: 3600`); region + filters as URL params |
| `/laptops/[id]` | `generateStaticParams` + ISR + `generateMetadata` (free SEO) |
| `/category/[useCase]` | ISR, precomputed top-12 |
| `/quiz`, `/results`, `/compare` | Dynamic client (genuinely interactive); region via cookie |
| `/admin` | Dynamic (already correct) |

**Other fixes:** delete `region-context.tsx` → region cookie set by server action, read via `await cookies()`; kills hydration flip + `ipapi.co`; `next/dynamic` for `quiz-flow` (largest bundle); `memo()` on `LaptopCard` (re-renders on every compare toggle); single source of DTOs in `src/lib/types`; unified `Loading`/`not-found` boundaries.

---

## 10. Routing & Redirect Review

- **Live routes:** `/`, `/quiz`, `/results`, `/laptops`, `/laptops/[id]`, `/compare`, `/category/[useCase]`, `/admin` — all resolve; dynamic params valid.
- **Broken/missing:** `/about`, `/privacy`, `/terms` (footer links → 404); no global `not-found.tsx`; no `loading.tsx` anywhere.
- **Slug mismatch:** `/category/developer` → "Category not found"; the valid slug is **`coding`** (label map vs TS union drift).
- **Deep-linking:** `/results` and `/compare` are localStorage-gated — no shareable state, hard refresh loses context (also the cause of the compare hydration bug).
- **URL hygiene:** laptop IDs end in `-undefined`; CUID/`-undefined` URLs are non-canonical — migrate to `/laptops/[slug]` with 308 redirects.
- **Breadcrumbs:** absent on catalog/detail pages.
- **Auth protection:** `/admin` gate works (cookie); server action auth broken (§1).

---

## 11. Catalog Scalability Plan

**Decision: stay database-driven (Postgres + Prisma) — with `data/laptops.json` demoted to an import/seed artifact.** Research consensus (Directus/Prismic/Payload comparisons, 2026): relational product data with prices/reviews/availability belongs in Postgres; headless CMSs serve editorial content; Git content collections break at 1,000+ docs and can't handle time-series prices; Airtable lacks integrity. Add **Directus** (free, self-hosted, wraps your existing schema — removable anytime) only if non-developers must curate.

**Schema evolution (all additive — zero code per laptop):**

```prisma
model Brand { id String @id; name String @unique; slug String @unique; logoUrl String? }
model Category { id String @id; name String; slug String @unique; useCase String }
// Laptop: + brandId, categoryId, slug @unique, status (draft|active|archived)
model LaptopTag { laptopId String; tag String; @@id([laptopId, tag]) }
model LaptopImage { id String @id; laptopId String; url String; position Int; isPrimary Boolean }
model LaptopReview { id String @id; laptopId String; source String; score Float; url String?; date DateTime }
model LaptopBenchmark { id String @id; laptopId String; cpuMark Int?; gpuMark Int?; batteryHours Float?; source String }
model PriceSnapshot { id String @id; laptopId String; retailerId String; priceCents Int; currency String; inStock Boolean; capturedAt DateTime }
  // @@unique([laptopId, retailerId, capturedAt]) — append-only, integer cents
model Retailer { id String @id; code String @unique; name String; baseUrl String; linkTemplate String?; enabled Boolean }
model Availability { laptopId String; retailerCode String; region String; inStock Boolean; lastChecked DateTime; @@id([laptopId, retailerCode, region]) }
```

**Content pipeline:** admin CRUD becomes the only create path — forms generated from a single `LAPTOP_FIELDS` metadata array (name/type/label/options) so schema additions auto-render forms (mirrors the existing `questions.ts` pattern). Bulk import endpoint (`POST /api/admin/import`, transactional upsert, single cache invalidation) + keep `scripts/*` as importer. All writes funnel through one mutation layer (`src/lib/db/catalog.ts`) so cache invalidation (`revalidateTag` + `revalidatePath` for ISR pages) can't be forgotten.

---

## 12. Purchase Link System Design

**Current:** free-text retailers duplicated across `LaptopPrice` rows; buttons hardcoded; FX rates synthesize fake prices in seed; no availability; no fallbacks.

**Target:**
- **Schema:** `Retailer` (code, name, `linkTemplate` with `{asin}`/`{model}` placeholders, affiliate program) + `ProductOffer` (`@@unique([productId, retailerId, region])`, `affiliateId`, `priceCents`, `currency`, `availability`, `priority`, `isActive`, `validFrom/To`). Index `[productId, region]`. Money as integer cents, never float.
- **Link building:** one server util `src/lib/affiliate.ts` — `buildAffiliateUrl()` with fallback chain: signed partner URL → template (e.g. `?tag=specwise-20`) → plain URL → hidden. Retailer quirks in a per-retailer map (additive, the only code touch ever needed).
- **UI:** one shared `<BuyButton>` (results, compare, detail) renders from `buyOptions: { retailer, price, currency, inStock, url, badge }[]` sorted price-asc, in-stock first. **Adding a retailer = one DB row; zero frontend changes.**
- **Pricing:** nightly cron (`src/app/api/cron/update-prices/route.ts`) → append `PriceSnapshot`, update offers + availability, bump `priceLastUpdated`, invalidate catalog. Fallback policy: cheapest other region with "ships internationally" badge, or hidden.
- **Compliance:** affiliate disclosure line rendered globally (FTC).

---

## 13. Search & Discovery Improvements

**Decision: Postgres now, Typesense later.** At ≤10K items, Postgres FTS is free and fast (Supabase benchmark: parity with dedicated engines at small scale). pg_trgm GIN index already exists — good foundation. Typesense (~$10–20/mo self-host) becomes worthwhile at 100K+ with heavy faceting; Meilisearch if DX outweighs single-node limits; Algolia only if search becomes revenue-critical.

- **Now:** `searchVector tsvector` column (brand/model/variant/cpu/os, `plainto_tsquery` + `ts_rank`, trigram fallback for prefixes) — kills `contains` full scans.
- **Filters/sort:** server-side via `searchParams` (`?q=&brand=&ramMin=&gpu=dedicated&sort=price-asc`) — shareable, cacheable, back-button-safe. Whitelisted sorts in SQL, never JS.
- **Suggest:** lightweight `/api/search/suggest` (8 compact results) for the header ⌘K combobox — debounced, **rate-limited** (currently none), cached.
- **Discovery rails:** `RecentlyViewed` table (cookie-scoped sessionId) + related-by-use-case on detail; saved comparisons in a `Comparison` table (kills the localStorage compare bug for good).

---

## 14. Prioritized Issues

**🔴 Critical**
1. Admin `toggleLaptopActive` always fails (header auth in server action) — dead feature.
2. Seed bug: all 56 laptop IDs end in `-undefined` — broken URLs, canonical, SEO, deep-links. Requires reseed + slug migration.
3. Fabricated homepage statistics ("93% accuracy", "1,248 laptops") — legal + E-E-A-T liability.
4. CSP `connect-src 'self'` blocks the app's own `ipapi.co` — 2 console errors on every load.

**🟠 High**
5. Catalog pages client-rendered shells — SEO un-crawlable + LCP 2.5–4s.
6. `/compare` hydration mismatch + localStorage-gated deep-linking.
7. No rate limit on `/api/laptops/search` (public, per-keystroke DB) or admin `login` action (key-guessing vector).
8. No tests, no CI (scoring engine is the crown jewel — untested).
9. RateLimit table grows ~86K rows/day, no cleanup.
10. Zero SEO infra: metadata, sitemap, robots, JSON-LD, OG/Twitter; footer 404s; no affiliate disclosure.
11. Quiz collects 5 fields (`displaySize`, `webcam`, `security`, `refurbished`, `gaming`) that never affect scoring.

**🟡 Medium**
12. Touch targets < 44px across all pages; compare table not keyboard-scrollable.
13. No `prefers-reduced-motion`; `<a>` wrapping `<button>`; mobile-menu Esc dead.
14. Region architecture: client context + `ipapi.co` vs cookie/URL; `x-forwarded-for` spoofable; `"unknown"` IP bucket collapse.
15. Duplicated DTOs in 3 pages; no `engines`/`.nvmrc`; `.env.example` mojibake; pool size mismatch.
16. PII (leads: email + answers) with no retention/deletion/consent path.
17. Hardcoded FX rates synthesize fictional prices; `db:seed-weights` no-op; dead `scoring.demo.ts`.

**🟢 Low**
18. Unused deps (`@neondatabase/serverless`, `class-variance-authority`); version bumps (next, react, prisma, lucide, resend, tailwind).
19. CSP hardening: drop `unsafe-eval`, add `object-src 'none'`, `base-uri 'self'`, `upgrade-insecure-requests`; add COOP/CORP.
20. `⌘K` hint lies (only `/` wired); `© 2025`; `theme-color` missing; `sizes` on grid images; home heading order; dead keyframes; plain-comparison key checks (login/toggle).

---

## 15. Step-by-Step Refactoring Roadmap

**Phase 0 — Quick wins (1–2 days)**
1. Fix `toggleLaptopActive` → authenticate via `admin_key` cookie (delete header check).
2. Fix seed ID construction (drop `region` from ID; add `slug`) + reseed; remove `-undefined`.
3. CSP: whitelist `https://ipapi.co` in `connect-src` (or drop geolocation).
4. Replace homepage stats with real DB counts at build time; remove fabricated claims; add affiliate disclosure; fix "© 2025".
5. Add `not-found.tsx`, `loading.tsx` for catalog pages; delete dead footer links or stub the pages.
6. RateLimit cleanup (opportunistic `DELETE ... updatedAt < now() - 1 day` in `rate-limit.ts`); rate-limit search + login.
7. Delete dead code: `scoring.demo.ts` → move to Vitest fixture; remove `db:seed-weights` no-op; uninstall 2 unused deps; add `engines` + `.nvmrc`.

**Phase 1 — Rendering & SEO (1 week)**
8. Convert `/laptops`, `/laptops/[id]`, `/category/*` to server components + ISR via shared catalog cache; region via cookie/searchParam; `generateStaticParams` + `generateMetadata` + `priority` on LCP image.
9. Delete `region-context.tsx` + client `api.ts` fetches; region cookie set by server action.
10. Fix `/compare` (mounted-state read of localStorage) + move saved comparisons to DB.
11. Add `sitemap.ts`, `robots.ts`, JSON-LD (Organization/WebSite/Product), OG/Twitter metadata, `manifest.ts`, theme-color.
12. Accessibility sweep: reduced-motion guard, 44px targets, focus management in mobile menu, `<a>`/`<button>` nesting, compare-table keyboard access, heading order, MatchBadge contrast.
13. Lazy-load `quiz-flow`; `memo` `LaptopCard`; consolidate keyframes; single-source DTOs.

**Phase 2 — Data model & catalog operations (1–2 weeks)**
14. Schema v2: Brand/Category/LaptopTag/LaptopImage/LaptopReview/LaptopBenchmark/PriceSnapshot/Retailer/Availability + `slug`; migration + backfill + 308 slug redirects.
15. Admin CRUD driven by `LAPTOP_FIELDS` metadata array; bulk import endpoint; unified mutation layer `src/lib/db/catalog.ts`.
16. Affiliate system (`src/lib/affiliate.ts` + `Retailer` rows) + shared `<BuyButton>`; nightly price cron with `PriceSnapshot` append + invalidation.

**Phase 3 — Search & discovery (1 week)**
17. `tsvector` column + ranked queries; server-side filters/sort via searchParams; suggest endpoint; recently-viewed + comparisons in DB; `/laptops` ↔ `/category` cross-links.

**Phase 4 — Quality & scale (ongoing)**
18. Vitest: scoring engine first (filter fallbacks, F-score ordering, per-use-case regression), then API integration (Zod 400s, 429s, admin auth); Playwright e2e (quiz → results → compare).
19. GitHub Actions: `npm ci → prisma generate → eslint → tsc --noEmit → vitest` on PR; build on main.
20. Scale levers: precomputed `LaptopScore` table for 10K+; Typesense at 100K+; TimescaleDB hypertables for price history at 100M rows; CDN caching headers; observability (OpenTelemetry); Directus evaluation for non-dev curation.

---

## 16. Recommended Folder Structure

```
src/
  app/
    (marketing)/page.tsx            # static, real counts
    quiz/page.tsx                   # dynamic, lazy quiz-flow
    results/page.tsx  compare/page.tsx
    laptops/page.tsx                # ISR server component, ?region=&filters=
    laptops/[slug]/page.tsx         # generateStaticParams + ISR + generateMetadata
    category/[useCase]/page.tsx     # ISR, precomputed top-12
    admin/layout.tsx                # auth guard once
    admin/page.tsx  admin/laptops/new|edit/page.tsx   # field-metadata-driven CRUD
    api/quiz/route.ts  api/search/suggest/route.ts
    api/admin/*/route.ts  api/cron/update-prices/route.ts
    robots.ts  sitemap.ts  not-found.tsx  error.tsx
  components/
    layout/  quiz/  results/  compare/
    product/  # buy-button.tsx, laptop-card.tsx, spec-table.tsx
    ui/       # primitives only
  lib/
    config.ts                     # env validation (fail-fast)
    db/                           # prisma client, catalog.ts mutation layer
    scoring/                      # pure, testable (filters.ts, priorities.ts, scoring.ts)
    affiliate/                    # affiliate.ts, retailers/*.ts
    search/  validation/  email/  logger/  rate-limit/
    types/                        # single source of DTOs
  server/                         # non-HTTP business logic (import/export, price sync)
tests/                            # scoring/*.test.ts, api/*.test.ts, e2e/
```

Two invariants: **DTOs only in `src/lib/types`** and **writes only via `src/lib/db/catalog.ts`** (cache invalidation by construction).

---

## 17. Recommended Tech Stack Changes

| Action | Change |
|---|---|
| **Remove** | `@neondatabase/serverless`, `class-variance-authority` (unused) |
| **Upgrade** | next 16.2.12, react 19.2.8, prisma 7.9.1, lucide-react 1.28, resend 6.18, tailwind 4.3.3, @types/node ^24 |
| **Add** | `engines: { node: ">=20.9" }` + `.nvmrc` (24) |
| **Add (dev)** | Vitest (+ Playwright for e2e), GitHub Actions CI |
| **Add (data)** | Directus self-hosted — only if non-developers curate; otherwise custom admin |
| **Add (search)** | `tsvector` + GIN now; Typesense self-hosted at 100K+ docs |
| **Adopt** | Next.js 16 Cache Components (`cacheComponents: true`, `'use cache'` + `cacheLife`/`cacheTag`, `updateTag`/`revalidateTag(tag, profile)`) — replaces `unstable_cache` |
| **Typography** | Fraunces + Schibsted Grotesk + IBM Plex Mono (via `next/font`) |
| **Keep** | Next 16, Prisma 7, PostgreSQL, Tailwind 4, Zod 4, Resend, npm, eslint 9 (not 10) |
| **Don't add** | State library (context is enough), animation library (CSS suffices), React Query (server components eliminate the client-fetch layer), Algolia/Meilisearch yet |

---

## 18. Long-Term Scalability Plan

1. **10K laptops:** precomputed `LaptopScore` table (scoring runs at write-time; reads become `ORDER BY score` SQL) — removes per-request scoring cost and keeps the quiz instant.
2. **100K+ / faceted search:** Typesense self-hosted (write-through indexing on catalog mutations + nightly full re-index safety net); vector search available for "natural-language match" features.
3. **Price history at 100M rows:** TimescaleDB hypertables (automatic partitioning + compression); tiered retention (30–90d full, 1y daily aggregates, weekly beyond); server-side downsampling for charts.
4. **Edge/CDN:** ISR + `Cache-Control: s-maxage` on public GETs; region resolution via `x-vercel-ip-country` (drop `ipapi.co`); edge middleware for region redirects.
5. **Observability:** structured logging (LOG_LEVEL, request IDs — `withLogging` foundation exists), OpenTelemetry traces on scoring + API, error tracking (Sentry).
6. **Content operations:** CSV/API import pipeline → review workflow (draft/active/archived statuses) → Directus or in-house admin; audit trail on all mutations.
7. **Monetization & compliance:** affiliate program matrix per retailer/region, disclosure rendering, price-history graphs as the trust surface; FTC-safe practices.
8. **Localization:** currency/region already data-driven (`regions.ts` → DB `Region` table); i18n framework only when non-EN locales ship.
9. **Multi-tenancy/HA:** PostgreSQL pool sizing via env (already parameterized); connection-pooled Neon or RDS; Typesense RAFT cluster if search is critical.
10. **Guardrails:** scoring regression suite runs in CI on every change; catalog schema changes require migrations + seed snapshots; performance budgets (LCP < 1.2s, INP < 200ms) enforced via CI Lighthouse.

---

*Sources: live Playwright QA (6 viewports, console/network), design lane (17 files), architecture lane (full source), librarian research (Next.js 16 caching, Directus/Payload/Sanity, search engines, price-history patterns), static stack/SEO lane (npm registry, configs), plus direct verification (migrations, seed IDs).*
