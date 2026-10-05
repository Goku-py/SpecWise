# SPECWISE V2 — ARCHITECTURE MAP (Phase 0 satellite)

> Read-only baseline. Evidence: `FILE:` + `SYMBOL:` / config values. UNKNOWN/PARTIAL labeled.

## 1. Stack (verified)

Next.js 16.2.10 App Router (`package.json:35`) · React 19.2.4 · TS5 strict, alias `@/*` (`tsconfig.json`) ·
Tailwind v4 CSS-first (`postcss.config.mjs:3`, no tailwind.config) · Prisma 7.8 + `@prisma/adapter-pg` + `pg`
Pool max 15/idle 120s/conn-timeout 15s (`src/lib/prisma.ts:10-12`, dev-global singleton) · Zod 4 · Zustand 5 ·
three/R3F fenced `dynamic ssr:false` · `motion` single-consumer (`V3Quiz.tsx:10`) · Vitest 4 + Playwright.

## 2. Architecture diagram (verified only)

```
Browser: region cookie (httpOnly:false, prod-secure, lax) + localStorage v2 + ~30 "use client" islands
  │ POST /api/quiz {schemaVersion:v3,profile} · GET /api/laptops/search?q&region
  ▼
App Router RSC — async server pages, all data pages force-dynamic
  ├─ direct prisma.* reads (layout, admin, [id], sitemap, category)
  │  OR catalog-cache.ts (unstable_cache, tag laptops-catalog, TTL CATALOG_CACHE_TTL_SECONDS||3600)
  ├─ server actions ("use server"): app/actions.ts setRegion · app/admin/actions.ts
  │  login/logout/toggleLaptopStatus/createLaptopAction/updateLaptopAction
  └─ src/proxy.ts (NOT middleware.ts): geo header (x-vercel-ip-country/cf-ipcountry/cloudfront-viewer-country)
     → region cookie 1yr; matcher skips _next/static|image|assets. No src/middleware.ts exists.
  ▼
Postgres (Prisma 7 adapter-pg). Sole write layer src/lib/db/catalog.ts:
  validate → tx → invalidateCatalogCache + revalidatePath×6 (SKIP_CACHE_REVALIDATE=1 bypass)
  ▲ seed data/laptops.json · POST /api/admin/import · cron PricesAPI 06:00 (vercel.json)
```

No NextAuth/OAuth/session lib. No SWR/React-Query. Admin = shared-secret cookie + Bearer APIs; cron = CRON_SECRET
Bearer. Public: all pages, `GET /api/laptops/[id]`, `/api/laptops/search`, `POST /api/quiz`.

## 3. Route table

### Pages

| Route | File | Data source | Render |
|---|---|---|---|
| `/` | `app/page.tsx:23` | `getCatalogStats` + `getActiveCatalog→toScorable→resolveIllustrativeMachines` | RSC async (DB per request) |
| `/quiz` | `app/quiz/page.tsx:43` | `getRegionFromCookies` + `parseV3ShareParams` → dynamic `V3Quiz` | RSC shell + client island, `QuizLoading` skeleton |
| `/results` | `app/results/page.tsx:11` | `initialRegion` (discarded: `void`) → `ResultsViewV3` reads localStorage | RSC shell + client; absent → `router.replace("/quiz")`, renders `null` |
| `/laptops` | `app/laptops/(catalog)/page.tsx:47` | `getActiveCatalog→toCardDto` → `CatalogView` (debounced search API, `/` shortcut) | `force-dynamic` |
| `/laptops/[id]` | `app/laptops/[id]/page.tsx:231` | `getLaptopBySlug→getLaptopById`, retailer hrefs, `slugRedirect` 308s, rivals(60) | `force-dynamic` + `generateStaticParams` (US) + `dynamicParams:true` |
| `/compare` | `app/compare/page.tsx:12` | localStorage legacy snapshot, region-agnostic | RSC shell + Suspense client |
| `/compare/[slugs]` | `app/compare/[slugs]/page.tsx:299` | `resolvePair` + region `pickBestOffer`, canonical path, GEO + JSON-LD | `force-dynamic` |
| `/category/[useCase]` | `app/category/[useCase]/page.tsx:28` | `getActiveCatalog→toScorable→runV3(categoryProfile)` | `force-dynamic`, non-slug → 404 |
| `/about /privacy /terms` | static pages | static | RSC static |
| `/admin`, `/admin/laptops/new`, `/admin/laptops/[id]/edit` | cookie-guarded RSC | direct prisma + region prices | `force-dynamic` |

### APIs

| Contract | File | Auth/limit |
|---|---|---|
| `POST /api/quiz` `{v3,profile}→runV3 DTO` | `api/quiz/route.ts:15` | public, 60/min/IP, 400 on shape/schema/region |
| `GET /api/laptops?region&page&pageSize` | `api/laptops/route.ts:8` | admin Bearer, 60/min, region required |
| `GET /api/laptops/[id]` | `api/laptops/[id]/route.ts:8` | public, NO rate limit (H1) |
| `PATCH /api/laptops/[id]` | same `:32` | admin Bearer, 30/min, `validateLaptopPatch→updateLaptop`, no DELETE export |
| `GET /api/laptops/search` trigram>0.25→contains ≤20 | `api/laptops/search/route.ts:39` | public, 60/min |
| `POST /api/admin/import` ≤200/≤50, one tx, per-index errors | `api/admin/import/route.ts:64` | admin Bearer, 30/min |
| `POST /api/admin/revalidate` tag-only | `api/admin/revalidate/route.ts:5` | admin Bearer, no limit/logging |
| `GET /api/cron/update-prices` batch 5, snapshot-first | `api/cron/update-prices/route.ts:73` | CRON_SECRET Bearer (403 prod-if-unset; open dev) |
| `GET /api/health` `SELECT 1` | `api/health/route.ts:4` | none |

Utility: `sitemap.ts` (static 8 + categories + laptop slugs + bounded pairs; DB-failure fallback),
`robots.ts` (allow /; disallow /admin,/api), `manifest.ts`, `not-found.tsx`, `error.tsx` ("use client").

## 4. Data flow per surface

| Surface | Source fn | Price shown |
|---|---|---|
| `/` hero proof | `getActiveCatalog→toScorable→resolveIllustrativeMachines` | `pickBestOffer` region |
| `/laptops` grid | `getActiveCatalog→toCardDto` (`prices[0]`) | cheapest row, no stale flag |
| `/laptops` search | `GET /api/laptops/search` (direct prisma, 1 price-asc) | `prices[0] ?? null` |
| `/laptops/[id]` | `getLaptopBySlug/ById` → client region filter | all regional rows |
| `/results` | `POST /api/quiz` DTO | `item.price` + missing/stale flags |
| `/category/*` | same pipeline, `categoryProfile` | same |
| `/compare/[slugs]` | `getLaptopBySlug/Id` + `regionBestOffer→pickBestOffer` | region cheapest-valid |
| `/compare` stored | localStorage DTO as-is | stored snapshot (possibly stale) |
| `/admin` | direct prisma + region prices (no cache) | `prices[0] ?? 0` |

## 5. Caching

`unstable_cache` + `revalidateTag(TAG,"max")` (`catalog-cache.ts:106-109`); per-write 6-path fan-out
(`catalog.ts:170-175`, cron replica `:60-67`); `SKIP_CACHE_REVALIDATE=1` bypass; `POST /api/admin/revalidate`
tag-only (INFERENCE: static paths lag to TTL). Cron `force-dynamic`; all data pages `force-dynamic`.

## 6. Key files (PATH/PURPOSE/STATUS)

`src/proxy.ts` geo-cookie VERIFIED · `app/layout.tsx` fonts/metadata/`laptop.count` VERIFIED ·
`app/actions.ts` `setRegion` VERIFIED · `lib/prisma.ts` pool+adapter VERIFIED ·
`lib/catalog-cache.ts` cache+`pickBestOffer`+`toScorable` VERIFIED · `lib/db/catalog.ts` sole writes VERIFIED ·
`lib/regions.ts` 6 regions/fx VERIFIED · `lib/region.ts` + `lib/region-store.ts` server/client region VERIFIED ·
`lib/admin-auth.ts` + `lib/cron-auth.ts` Bearer VERIFIED · `lib/rate-limit.ts` DB+memory fallback VERIFIED ·
`lib/slug.ts`, `lib/affiliate.ts`, `lib/compare-pairs.ts`, `lib/api.ts`, `lib/storage.ts` (v2 envelopes),
`lib/types.ts` (PARTIAL), `lib/utils.ts` (Intl 0-dec), `lib/layer-specs.ts` (8 layers) VERIFIED ·
`store/useV3QuizStore.ts` quiz store VERIFIED · `hooks/use-reduced-motion|count-up` PRESENT (contents UNKNOWN).

## 7. Contradictions / UNKNOWN

- Docs/comments say `src/middleware.ts`; code has `src/proxy.ts`, no `middleware.ts` (stale post-Next-16 rename).
- `slug.ts`/`seed.ts` comments claim slug NOT unique; schema has `slug @unique` (schema wins; P2002 path exists).
- `detail-pricing.tsx` "ISR/static" comment vs `force-dynamic`. `about` "56 laptops" vs live 0.
- UNKNOWN: migration SQL/applied state; `data/laptops.json` length; env values; cron dashboard wiring;
  `/laptops/[slug]` revalidate target; manifest token consistency.
