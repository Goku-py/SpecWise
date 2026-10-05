# SPECWISE — Database Rebuild (Repair) Report

Date: 2026-10-05. Mode: REPAIR per `SPECWISE-DATABASE-RECOVERY-AUDIT.md` §6 (binding).
No new provider. No new database. No `ALLOW_WIPE_SEED`. No DROP/TRUNCATE/DELETE.
Seed source: `data/laptops.json` only (56 records). No fake data. No commits. No pushes.

## 1. Old state (pre-seed, from the audit)

- Neon Postgres (ap-southeast-1), reachable, PG 18.6, all 10 on-disk migrations applied.
- `Laptop`: 0 rows. `LaptopPrice`: 0. `Brand`: 0. `Retailer`: 0. `RateLimit`: 34 rows
  (recent app writes — runtime R/W proven). Catalog empty because never seeded, not unreachable.

## 2. Root cause

Empty tables, not a dead database. Prior `ECONNREFUSED` reports were transient/environmental.
Fix = run the canonical idempotent seed against the existing database.

## 3. Provider decision

Keep the existing Neon DB. A new provider/DB adds migration, secret-rotation, and
Vercel-rewire risk for zero data benefit. Nothing in this repair creates provider lock-in
beyond the `DATABASE_URL` string already in use.

## 4. Schema / migration strategy

No schema changes. No new migrations. Live read paths (`Laptop` / `LaptopPrice` /
`SlugRedirect` / `Brand` / `Retailer`) already exist and are migrated
(latest `20260922000000_phase3_data_foundation`). Known non-blocking drift (spine tables
in schema without migrations, `Lead` model without table, leftover `AdminUser`/`UseCase`)
left untouched by design — documented in the audit, not this repair's scope.

## 5. Seed strategy

- Command: `SKIP_CACHE_REVALIDATE=1 npm run db:seed` (default upsert path; wipe skipped).
- Fail-fast `validateSeedRow` runs before any write: 56/56 rows valid, seed proceeded.
- Brands/retailers upserted by stable key; laptops upserted by `deterministicLaptopId`
  with `SlugRedirect` 308 trail on rename; prices FX-expanded to 12 rows/laptop
  (2 retailers × 6 regions) via `generatePrices`, upserted per `(laptopId, region, retailer)`.
- `imageUrl` left null for all 56 (correct — Phase 8 forbids first-hit auto-assignment;
  `SEED_FETCH_IMAGES` not set). Cache auto-invalidation skipped (no `NEXT_PUBLIC_APP_URL`
  locally); catalog tag busted manually via `POST /api/admin/revalidate` → `{"ok":true}`.

## 6. Counts (read-only SELECTs, post-seed)

| Table | Rows |
|---|---|
| Brand | 10 |
| Retailer | 6 |
| Laptop (active/total) | 56 / 56 |
| LaptopPrice | 672 (56 × 12) |

Per-region prices: US=112, IN=112, GB=112, DE=112, CA=112, AU=112 (56 laptops × 2 retailers each).
Duplicate slugs: 0. Null/empty slugs: 0. Active laptops with zero price rows: 0.
Null `imageUrl`: 56/56 (by design — deliberate fallback renders).

## 7. Validation

`npm run db:validate` (`scripts/db-validate.mjs`, stdlib + repo `pg` only): **14/14 PASS**
(reachable, 10/10 migrations, counts, per-region distribution, dup/null slugs, required
fields, numerics/status, image allowlist, orphans, zero-price laptops). Full per-check
results: `SPECWISE-DATABASE-VALIDATION.md`.

## 8. Smoke (dev server, real data, server killed after)

30/30 checks passed: `/laptops` 56 product links + `q=thinkpad` filter + price display;
`/quiz` submit (IN) → `/results` 12 ranked items; Results→Detail; Results→Compare;
Detail→Compare; Compare→Detail; What-If priority change reranks through `POST /api/quiz`
(order changed speed→battery). 3 profiles (gaming/dev/study-office): items + W/C/V +
explanations + INR pricing all present; identical POSTs byte-identical order.
`/sitemap.xml` lists 56 product URLs; `/robots.txt` 200; product JSON-LD has no
`aggregateRating` without `reviewCount` (none present) and no `image` (null gated).
Screenshots (viewed): `specwise-dbstab/` — laptops/results/detail/compare desktop + mobile laptops.

## 9. Gates

- `npx tsc --noEmit`: clean (exit 0).
- `npm run test:unit`: 6 files, 79 passed / 3 skipped.
- `npm run lint`: 9 errors / 7 warnings = pre-existing baseline, zero new.
- `npm run build`: success.
- `npm run db:validate`: 14/14 PASS.

## 10. Rollback + switchover plan (owner actions)

- Rollback: seed writes are upserts — nothing was deleted. Worst case, flip rows to
  `status='archived'` via the admin toggle; there is no wipe to undo.
- Cache: if any surface still shows the empty catalog, `POST /api/admin/revalidate`
  (tag `laptops-catalog`) or wait out `CATALOG_CACHE_TTL_SECONDS` (3600).
- Production switchover (cannot do from here — no Vercel access):
  1. Confirm Vercel Production `DATABASE_URL` points at this Neon host.
  2. Set `NEXT_PUBLIC_APP_URL=https://specwise-tech.vercel.app` (fixes sitemap/JSON-LD origin).
  3. Redeploy `main` so production serves current commits.
  4. Hit production `POST /api/admin/revalidate`, then spot-check `/laptops` count.

## 11. Deviations / notes

- One transient `POST /api/quiz` (gaming/aaa) returned 200 with 0 items on a cold dev
  server seconds after startup; 5/5 immediate retries returned 12 items and all later
  runs were stable. Non-reproducing; watch once in production, no code change made
  (engine/quiz code untouched per instructions).
- Temp probe scripts (`tmp-smoke/dbg/quizprobe/counts`) lived in `scripts/` or temp dir
  during the run and were deleted. Files created/modified: see §12.

## 12. Files created / modified

- Created: `scripts/db-validate.mjs` (deterministic validation, exits 0/1).
- Modified: `package.json` (added `db:validate` script only).
- Created: `docs/reports/SPECWISE-DATABASE-REBUILD.md` (this file),
  `docs/reports/SPECWISE-DATABASE-VALIDATION.md`.
- Seed log + screenshots (outside repo):
  `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-dbstab\`.
