# SPECWISE — Database Validation Report

Date: 2026-10-05. Tool: `npm run db:validate` → `scripts/db-validate.mjs`
(stdlib + repo `pg` dep, read-only, exits 0/1, no secrets printed).
Result at seed time: **ALL CHECKS PASSED (14 total)**.

## Contract under test

From live read paths (`catalog-cache.ts` `getActiveCatalog`/`toScorable`/`pickBestOffer`,
v3 engine, detail/compare pages): each laptop needs brand, model, os, cpuBrand, cpuFamily,
ramAmount, storageAmount, displaySize, `status='active'`, unique non-null slug; ≥1
`LaptopPrice` row per region or it is `priceMissing`; `imageUrl` null or allowlisted
(`images.unsplash.com`, https, with path).

## Per-check results (post-seed)

| # | Check | Result |
|---|---|---|
| 1 | reachable (PG handshake) | PASS |
| 2 | migrations applied (10 on disk ⊆ applied) | PASS — 10 applied, 10 on disk |
| 3 | brand count ≥ 10 | PASS — 10 rows |
| 4 | retailer count ≥ 6 | PASS — 6 rows |
| 5 | laptop count 56/56 active | PASS |
| 6 | price count = 672 (56 × 12) | PASS |
| 7 | per-region distribution (112 each) | PASS — US=112 IN=112 GB=112 DE=112 CA=112 AU=112 |
| 8 | duplicate slugs | PASS — 0 |
| 9 | null/empty slugs | PASS — 0 |
| 10 | missing required fields | PASS — none |
| 11 | invalid records (null numerics / non-active) | PASS — 0 |
| 12 | image host allowlist | PASS — 0 non-null, 0 off-allowlist (null renders fallback, by design) |
| 13 | orphaned prices | PASS — 0 |
| 14 | laptops with zero price rows | PASS — every active laptop has prices |

## Region / pricing validation

- 6/6 regions present, exactly 112 price rows each = 56 laptops × 2 retailers/region.
- Retailers per region match `src/lib/regions.ts` (US: Amazon/Best Buy, IN: Amazon/Flipkart,
  GB: Amazon/Currys, DE: Amazon/MediaMarkt, CA: Amazon/Best Buy, AU: Amazon/JB Hi-Fi).
- Live spot check via `POST /api/quiz` (IN region): top items carry `currency: INR` with
  positive whole-unit prices (e.g. gaming 342692, dev 234958, study-office 166400).

## Image validation

- 56/56 `imageUrl` null — expected (Phase 8 forbids first-hit assignment; nothing invented).
- Allowlist enforced at write (`catalog.ts`) and read (`product-image.ts`) gates;
  validator mirrors it (`images.unsplash.com`, https, path required). 0 violations.
- UI renders the deliberate "Image unavailable" fallback (confirmed in screenshots).

## Recommendation determinism (app-level, dev server)

- gaming/dev/study-office via `POST /api/quiz`: 12 items each, `scores.W/C/V` numeric,
  `strengths` (3) + `whyAbove` present, IN pricing correct.
- Two identical gaming POSTs: identical `laptopId` order (12/12).
- What-If (priorities speed→battery): both 200, top changed (Strix Scar 17 → Book4 Ultra),
  proving server-side rerank (client never scores).

## SEO with data present

- `/sitemap.xml`: 200, 56 `/laptops/` product URLs.
- `/robots.txt`: 200.
- Product JSON-LD (detail page): present, no `image` key (gated on null), no
  `aggregateRating` (none without `reviewCount`) — compliant.

## Re-run

`npm run db:validate` — exit 0 = ship, exit 1 = named check(s) FAILED (names print).
Safe to run against live DB any time (SELECTs only).
