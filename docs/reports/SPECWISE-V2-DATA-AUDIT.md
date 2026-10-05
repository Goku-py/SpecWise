# SPECWISE V2 — DATA AUDIT (Phase 0 satellite)

> Read-only. Schema: `prisma/schema.prisma` (559 lines). No schema changes made.

## 1. Models (legacy live vs spine)

**Legacy (live source of truth):** `Laptop` (40+ cols; `slug String? @unique`; `brandId String?` optional FK;
`status Status=active`; `ports/securityFeatures String[]`; `dataSource="seed"`; `@@index([status,createdAt desc])`)
· `SlugRedirect(from @unique→laptopId, cascade)` · `LaptopPrice` composite PK `(laptopId,region,retailer)`,
**`price` WHOLE major units** (schema comment 106–109), `inStock/validUntil/priceLastUpdated`,
`@@index([region])`, `@@index([laptopId,region,price])` · `PriceSnapshot` (`priceCents` MINOR,
`@@unique(laptopId,retailer,region,capturedAt)`, `@@index(laptopId,capturedAt)`) · `Brand` (name+slug unique;
`laptops[]+products[]`) · `Retailer` (code unique) · `RateLimit(key,window @unique)` · `Lead(email,region @unique,
answers Json)`.
**Spine (additive, NOT live — sitemap "not migrated yet"):** `Product` (`slug @unique`, `legacyLaptopId @unique`,
`brandId` required Restrict, 3 indexes) + `SpineSlugRedirect` + `ProductPrice` (`priceMinor` minor,
PK `(productId,region,retailer)`) + `SpinePriceSnapshot` + `LaptopSpec` 1:1 (typed: `ramAmountGb/PosInt`,
`displayWidthPx/HeightPx`, `displayTouch` merged, `weightKg`, `batteryWh/LifeHr`; children `LaptopPort(kind,count,
label)` PK3, `LaptopWireless(wire)`, `LaptopSecurity(feature,label)`) + `CpuSpec/GpuSpec/MotherboardSpec/RamSpec/
PsuSpec`. Enums: Category(6), GpuType, RamDimmType, PsuModularity, EfficiencyRating, MoboFormFactor, WireStandard(6),
PortKind(19), SecurityFeature(6), DatasourceKind(4). "Exactly one spec per Product" is app-enforced only (comment
196–199). Migrations: 10 dirs (`..._init` … `..._phase3_data_foundation` + lock); SQL not read.

## 2. Seed / pipeline

`upsertBrands`(10) → `upsertRetailers`(6: amazon/best-buy/flipkart/currys/mediamarkt/jb-hi-fi, templates null) →
`loadSeedRows` (fail-fast `validateSeedRow`: brand/model, finite price/ram/storage/display, arrays, pricesOverride) →
per-laptop `$transaction` (`deterministicLaptopId` upsert; update path touches only slug/brandId/isPopular/notes/
dataSource — INFERENCE: re-seed preserves spec edits) + price upserts + redirect trail (`prisma/seed.ts:1-239`).
Pipeline: `scripts/generate-laptops.ts` (one-shot typed USD → `data/laptops.json`) → `scripts/fetch-laptops.ts`
(TechSpecs + PricesAPI `pricesOverride`; missing keys skip) → `seed.ts` → `scripts/fetch-images.ts` (Unsplash fill
nulls, 1.5s delay) → `prisma/scripts/backfill-spine.ts` (`--dry-run/--mock`, pure `parseDisplayResolution/
mergeDisplayTouch/majorToPriceMinor(×100)/mapGpuType`, `LaptopProductSpineSchema`-validated). Spine has no read path.
`migrate-prices.ts`, `tmp-redir.ts` PRESENT (contents UNKNOWN).

## 3. Writes (sole layer `lib/db/catalog.ts`)

`LAPTOP_EDITABLE_FIELDS` whitelist · `validateLaptopPatch` · `createLaptop` (auto slug+unique) · `updateLaptop`
(slug regen only on brand/model) · `setLaptopStatus` · `upsertLaptopPrice` · `deleteLaptop` (cascade; **zero callers**,
no DELETE route/UI) · `createLaptopWithPrices` · `importLaptops` (atomic) · `recordSlugRedirect` ·
`invalidateAfterWrite` (tag + 6 paths; `SKIP_CACHE_REVALIDATE=1` bypass). `LaptopFormSchema` (required
brand/model/os/cpuBrand/cpuFamily/ram/storage/displaySize; gpuType→integrated; refreshRate→60; score 0–10;
comma-split arrays; `imageUrl` optionalString max-1000 **no `.url()`** — vs `ImportPriceSchema` url/affiliateUrl
`.url()`-enforced) + API-only extras + `validateLaptopPatch` (imageUrl `typeof string` only). Import caps
200/50, per-index errors. `mapWriteError` P2025→404/P2002→409/generic; `withLogging` generic 500 + request-id
(except `revalidate` — no wrapper). Pagination `Number("abc")→NaN→skip:NaN` edge (likely 500, not injection).

## 4. Pricing / regions

Units: major whole (`LaptopPrice`) vs minor cents (`PriceSnapshot=price·100` cron `:140`; `ProductPrice minor` via
`majorToPriceMinor ×100`); `formatPrice` Intl 0-dec, 6 currencies. Regions (`regions.ts:11-16`): US 1 · IN 83×1.18 ·
GB 0.8×1.2 · DE 0.92 · CA 1.37 · AU 1.54. Strict `isSupportedRegion` (400) on search/quiz/list vs lenient UI
`getRegion→US`. Seed fx-expands 12 rows/laptop (2 retailers×6, ±4% 2nd variance). `pickBestOffer` (`catalog-cache`):
cheapest valid (inStock+unexpired) → stale fallback flagged → null=`priceMissing` (`toScorable:160-162` keeps price 0
+ flag). **List uses `prices[0]` (no validity flag) vs quiz/detail/compare use `pickBestOffer`** — INFERENCE: same
order, different stale semantics. `buildAffiliateUrl`: affiliateUrl → overrides(empty) → template(all NULL today) →
url → null; detail resolves server-side (`[id]:259-280`); cron writes `affiliateUrl:null` (`:179`). Cron: oldest-
`updatedAt` active w/o 24h snapshot, batch `PRICE_SYNC_BATCH||5`, `~1.1s` sleep/country, 95s timeout, never throws;
snapshot-all-first; apply-only-existing+known-Retailer; `APPLY=false` snapshot-only.

## 5. Cache / fetching

`getActiveCatalog(region)` / `getLaptopById/BySlug`, shared tag + TTL 3600 (`CATALOG_CACHE_TTL_SECONDS||3600`).
Bust: `revalidateTag(tag,"max")` + 6 paths; cron replica; `SKIP_CACHE_REVALIDATE=1`; `/api/admin/revalidate` tag-only
(INFERENCE: static lag to TTL). No SWR/React-Query. Pool: `pg` max 15/idle 120s/conn-15s vs docs 5/120s/5s (mismatch).
Per-surface matrix: `/` proof `pickBestOffer` · grid `prices[0]` · search 1-row · detail all-rows→client filter ·
results/category DTO · compare-B region-best · compare-A stored snapshot · admin direct `prices[0]??0`.

## 6. Admin data flow

Cookie-gated table (region GET, unpaginated full render) · toggle active↔archived (draft unreachable; comment
`actions.ts:60-62`) · create/edit (`formDataToLaptopValues`→`safeParse`→whitelist→redirect; prefill
`laptopToFormValues`) · no delete UI · no price editor · no preview (draft via PATCH only) · import atomic ·
post-write freshness via tag+paths.

## 7. Issues / UNKNOWN

- Slug-uniqueness comments (write-layer-only) contradict schema `@unique` (schema wins).
- `deleteLaptop` dead; no preview; no price editor; draft unreachable.
- `revalidate` tag-only; list-vs-rest stale asymmetry; lenient-vs-strict region undocumented.
- Hardcoded `/about` "56 laptops" rots vs live count.
- UNKNOWN: live counts; migration SQL/applied; `laptops.json` length/drift; env values; cron wiring; `[slug]`
  revalidate target; `LaptopImage` usage; fetch-images backfill state.
