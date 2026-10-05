# SPECWISE — Database Recovery Audit

Date: 2026-10-05. Method: direct source reads + live read-only probes against `DATABASE_URL` (Neon, ap-southeast-1). No writes performed. No secrets recorded (host region only).

## 1. Root cause (evidence-backed)

The catalog is empty because **the database was never seeded (or was wiped), not because it is unreachable**:

- TCP 5432 to the Neon host: OPEN; full Postgres protocol handshake succeeds; server reports **PostgreSQL 18.6**.
- `_prisma_migrations` shows all 10 on-disk migrations applied, latest `20260922000000_phase3_data_foundation`.
- `Laptop`: 0 rows. `LaptopPrice`: 0 rows. `Brand`: 0. `Retailer`: 0.
- `RateLimit`: 34 rows — the running app itself has written recently, proving runtime read/write works.
- Prior `ECONNREFUSED` reports were transient/environmental (this environment connects cleanly; Vercel-side network was never proven dead).

## 2. Schema vs database (drift inventory)

Live source of truth (all read paths): legacy `Laptop` / `LaptopPrice` / `PriceSnapshot` / `SlugRedirect` / `Brand` / `Retailer` — all tables exist. DRIFT (non-blocking, documented):

- Spine tables (`Product`, `LaptopSpec`, `CpuSpec`, `GpuSpec`, `MotherboardSpec`, `RamSpec`, `PsuSpec`, `ProductPrice`, `SpinePriceSnapshot`, `SpineSlugRedirect`, `LaptopPort`, `LaptopWireless`, `LaptopSecurity`) exist in `schema.prisma` but **no migration file ever created them** (phase-3 migration only creates `SlugRedirect`). Nothing reads them. No action required; do not query them from runtime code.
- `Lead` model in schema has no table (`42P01`). Nothing writes leads (`sendResultsEmail` is dead code). No action required.
- Leftover tables `AdminUser`, `UseCase` (0 rows each) from removed models. Harmless. Do not drop without a migration; do not use.
- `Retailer` table uses `code`/`name`/`baseUrl` (+ null linkTemplate/affiliateProgram by seed design — no invented affiliate config).

## 3. Catalog contract (minimum viable, from live read paths)

Per `catalog-cache.ts` (`getActiveCatalog`, `toScorable`, `pickBestOffer`), engine (`hardFailures`, `capabilitiesForV3`), and detail/compare pages, each laptop needs: `brand`, `model`, `os`, `cpuBrand`, `cpuFamily`, `ramAmount` (Int GB), `storageAmount` (Int GB), `displaySize` (Float in), `status='active'`, `slug` (unique, write layer guarantees), stable `id`. Strongly scoring-relevant when present: `cpuCores`, `gpuType`+`gpuModel`+`gpuVRAM`, `displayRefreshRate` (default 60), `batteryLife`, `weight`, `ports[]`, `isRefurbished`, `ramUpgradeable`, `storageExpandable`, `isTouchscreen`, `displayPanelType`/`displayBrightness`. Per region: ≥1 `LaptopPrice` row (`region`, `retailer`, `currency`, whole-unit `price`, `inStock`, `validUntil`) or the laptop is `priceMissing` (shown last, max 3, never priced 0). `imageUrl`: only explicitly verified hosts (allowlist = `images.unsplash.com`); null is correct and renders the deliberate fallback.

## 4. Data source audit (`data/laptops.json`)

56 records. All have finite `price` (USD base). Brands: Apple 7, Dell 7, HP 7, Lenovo 7, ASUS 8, Acer 6, MSI 4, Razer 3, Samsung 3, Microsoft 4. OS: Windows 49, macOS 7. `imageUrl`: 0 present (correct — Phase 8 forbids first-hit auto-assignment). No `pricesOverride` (regional prices are FX-derived at seed). Field-level validation (duplicates, malformed display/battery, bad enums) is the seed's `validateSeedRow` fail-fast job — rerun report required at seed time.

## 5. Seed/idempotency audit (`prisma/seed.ts`)

- Brands/retailers: upserted by stable key (`name`, `code`). Idempotent.
- Laptops: `deterministicLaptopId` + per-row `$transaction` upsert; slug renames keep a `SlugRedirect` 308 trail. Rerun repairs partial rows, never duplicates.
- Prices: `generatePrices` FX-expands each USD price to 12 rows (2 retailers × 6 regions, ±4% second-retailer variance); upserted per `(laptopId, region, retailer)`.
- Wipe is opt-in (`ALLOW_WIPE_SEED=1`); default path never deletes. **Safe to run against the live database.**
- Regions/currencies (from `src/lib/regions.ts`): US/USD ×1, IN/INR ×97.94, GB/GBP ×0.96, DE/EUR ×0.92, CA/CAD ×1.37, AU/AUD ×1.54. Retailers per region: US {Amazon, Best Buy}, IN {Amazon, Flipkart}, GB {Amazon, Currys}, DE {Amazon, MediaMarkt}, CA {Amazon, Best Buy}, AU {Amazon, JB Hi-Fi}.

## 6. Repair vs rebuild decision

**A. REPAIR the existing database.** Evidence: reachable, correctly migrated for every table the app reads, app writes proven (RateLimit), seed is idempotent and non-destructive. A new provider/DB adds migration, secret-rotation, and Vercel-rewire risk for zero data benefit. The "rebuild" reduces to: run the canonical seed against this database, then validate.

## 7. Cache note

`catalog-cache.ts`: `unstable_cache` + tag `laptops-catalog`, TTL `CATALOG_CACHE_TTL_SECONDS` (3600). Empty-catalog reads may be cached; after seeding, bust via `POST /api/admin/revalidate` (tag) or natural TTL. Scripts must set `SKIP_CACHE_REVALIDATE=1`. Do not remove caching.

## 8. Open owner actions (cannot verify from here)

- Confirm Vercel **Production** `DATABASE_URL` points at this Neon host; set `NEXT_PUBLIC_APP_URL=https://specwise-tech.vercel.app` (fixes localhost sitemap/JSON-LD).
- Redeploy `main` so production serves the V2 commits (last probe: prod ~4 commits stale).
- Rollback path: seed writes are upserts; worst case, rows flip to `status='archived'` via admin toggle — no wipe was or will be performed.
