# Phase 3 Plan — Data + Infrastructure Foundation

Plan only. No implementation, no migrations, no schema changes, no installs, no production modifications. All file/line evidence verified from the current tree on 2026-09-22.

## 1. Objective
Give SpecWise 2.0 a safe data and infrastructure foundation — region-correct pricing, unique slugs, region-keyed caching, trigram-backed search, non-destructive seed/update, versioned localStorage — without touching the Phase 2 recommendation contract (`CanonicalAnswers`, `buildProfile`, `scoreLaptops`, ledger, tie-break, goldens) or any UI. No ISR, no `/r/[id]`, no SEO/GEO work in this phase.

## 2. Current infrastructure
- **DB:** Postgres via Prisma; 9 migrations (`prisma/migrations`, latest `20260802_phase2_schema_v2`). Models: `Laptop` (40+ spec columns, `slug String?` non-unique + non-unique `@@index`, nullable `brandId`, `status` enum, `createdAt/updatedAt`), `LaptopPrice @@id[laptopId,region,retailer]` (`price` Int **major units** + `priceLastUpdated`), `PriceSnapshot` (`priceCents` **minor units** + `inStock` + `capturedAt`, `@@unique[laptop,retailer,region,capturedAt]`), `Brand`, `Retailer` (code-keyed), `RateLimit` (no TTL cleanup — unbounded growth), `Lead` (`answers` Json).
- **Cache:** `unstable_cache` in `src/lib/catalog-cache.ts` with **static keys** (`["active-laptops-catalog"]`, `["laptop-by-id"]`, `["laptop-by-slug"]`) — region arg ignored (VERIFIED collision: first region fetched wins). Shared tag `laptops-catalog`, TTL 3600 (`CATALOG_CACHE_TTL_SECONDS`), busted via `revalidateTag(tag, "max")` + `revalidatePath` in write paths/cron.
- **Search:** `GET /api/laptops/search` uses `contains … mode: insensitive` on brand/model, 60/min/IP. `pg_trgm` extension + GIN trigram index on `(brand, model)` + composite `(laptopId, region, price)` index already exist (`20260707150000_add_search_indexes`) but the route never uses similarity ranking.
- **Prices:** 6 regions (`US/IN/GB/DE/CA/AU`, FX in `src/lib/regions.ts`, incl. 1.18/1.2 buffers on IN/GB). Cron `GET /api/cron/update-prices` (CRON_SECRET bearer): batch 5, 24h freshness window, snapshot-always + conditional apply (`PRICE_SYNC_APPLY`), never creates new `LaptopPrice` rows — idempotent batching, good foundation.
- **Seed:** `prisma/seed.ts:257-258` wipes (`deleteMany` prices + laptops) then reseeds, non-transactional; brands/retailers upserted idempotently; Unsplash fetch embedded in seed.
- **Client state:** `specwise-quiz-answers/step/mode`, `specwise-results`, `specwise-answers`, `specwise-boot-seen`; read with `JSON.parse` + cast, no schema validation (SECURITY §6).
- **Rate limiting:** 60/min/IP keyed on `x-forwarded-for[0]` (spoofable; SECURITY §4), DB-backed `RateLimit` upsert per request.
- **Perf baseline (measured):** scoring 0.567 ms/56 items; slider 0.032 ms; 1 blocking DB query on cache hit (rate-limit upsert), 2 on miss; v2 payload +895 B/item.

## 3. Target infrastructure
Same stack, hardened: unique slugs with redirect history; region-keyed cache entries; trigram similarity search with region scoping; append-only price history with freshness window; transactional idempotent seed/update with dry-run + backup; versioned localStorage with validate-then-adapt; bounded validation strings; unchanged Phase 2 engine consuming the same `ScorableLaptop` shape.

## 4. Database changes
- **M1 — slug uniqueness:** backfill null/dup slugs in SQL (deterministic `slugify(brand,model,variant)` + numeric suffix), then `CREATE UNIQUE INDEX CONCURRENTLY`, then `slug String @unique`. Keep app-level generator as second guard. Add `SlugRedirect(from, laptopId, createdAt)` table for renamed slugs → 308 (preserves indexed URLs).
- **M2 — price freshness/availability:** add `LaptopPrice.inStock Boolean @default(true)` + `validUntil DateTime?` (offers expire; structured data needs real availability). `PriceSnapshot` already append-only — keep; add retention policy (e.g. keep 90d, cron purge) instead of unbounded growth.
- **M3 — RateLimit TTL:** scheduled `DELETE WHERE updatedAt < now() - interval '24 hours'` (cron or pg_cron) — fixes unbounded table flagged in code comment.
- **M4 — provenance:** add `Laptop.dataSource String @default("seed")` + `sourceUpdatedAt DateTime?` (distinguish hand-curated vs fetched rows; supports freshness display). No new spec columns — raw facts already sufficient for all 9 capability dims.
- **Explicit non-goals:** no normalized capability columns (derived at score time per Phase 2 contract — duplicating them would rot); no new spec fact columns; no `Lead.answers` schema change.

## 5. Pricing/region model
- **Source of truth:** `LaptopPrice` row `(laptopId, region, retailer)` = offer; `PriceSnapshot` = history/audit. `price` stays major units; add explicit `currency` check constraint per region (`US→USD, IN→INR, GB→GBP, DE→EUR, CA→CAD, AU→AUD`).
- **Region allowlist:** single `REGION_CODES` enum enforced at API boundary (`region` query/body validated against it; unknown → 400, never silent fallback). Fixes typo-region → price-unknown-lane confusion (SECURITY §11).
- **Freshness:** offer valid iff `priceLastUpdated` within freshness window (default 30d; cron refreshes); stale offers serve with `stale: true` flag and lose tie-break priority rather than vanishing. `toScorable` picks cheapest **valid** row; none-valid ⇒ `priceMissing` (engine quarantines — unchanged).
- **Region consistency:** JSON-LD offer MUST be built from the same region-filtered rows the UI prices (kills lowest-across-regions mismatch). Currency formatting stays server-side per row currency (no FX math at read time; FX only seeds regional rows).

## 6. Slug migration
Sequence: (1) read-only audit query listing null/duplicate slugs; (2) backfill migration (data-only, reversible by re-running generator); (3) `CREATE UNIQUE INDEX CONCURRENTLY` in a separate migration (no table lock); (4) flip Prisma field to `@unique`; (5) `SlugRedirect` insert on any future slug change + 308 handler in `[slug]` route (legacy-id → slug 308 already exists — extend to old-slug → new-slug). Concurrent creation guarded by unique index (app pre-check is best-effort only). Rollback: drop index, revert field — data (redirects) preserved.

## 7. Cache architecture
Contract (no ISR yet): every catalog cache entry key includes its varying dimension — `["active-laptops-catalog", region]`, `["laptop-by-id", id]`, `["laptop-by-slug", slug]` (id/slug keys already effectively unique; make explicit). Keep tag `laptops-catalog` + TTL 3600. Invalidation matrix: admin import/toggle, cron apply, seed → `revalidateTag` + existing `revalidatePath` set (unchanged call sites, verified in write layer + cron). Phase-appropriate: fix keys now; `use cache`/`cacheTag` migration deferred to Phase 4 ISR work (ARCHITECTURE.md already sequences it there). Add a cache-behavior test: seed US+IN prices, fetch US then IN, assert different payloads (regression for the collision).

## 8. Search/FTS
Entities: laptops (brand, model, variant) — prices/retailers are filters, not search text. Strategy: keep `contains` as fallback; primary path `ORDER BY similarity(brand || ' ' || model, q) DESC` using the existing GIN trigram index, threshold `> 0.15`, limit 20. Filters: `region` (scopes price join), `status=active` always, optional `maxPrice/os`. Normalization: trim, collapse whitespace, lowercase (trigram is case-sensitive-ish; use `lower()`); strip retailer noise tokens. No new extension needed (already enabled). Frontend search UX is out of scope — only the route + index usage + tests.

## 9. LocalStorage migration
Strangler, compat preserved: `OLD (raw JSON) → VALIDATE (Zod safeParse: legacy QuizAnswers / results envelope with scoringMeta numerics finite-checked) → ADAPTER (toCanonical for answers; drop unknown keys; recompute nothing) → NEW (versioned envelope `{v: 2, …}`)`. Malformed/corrupt → discard + fall back to quiz gate (current behavior, keep). Stale (v1 shape, no scoringMeta) → accepted; slider uses display-estimate fallback already in `decomposition.ts`. New writes use v2 envelope; old keys kept as fallback read path for one release. Never trust stored `matchScore` for server decisions — refetch revalidates.

## 10. Safe seed/update strategy
Replace wipe+reseed with: (1) `pg_dump` backup step (required in runbook, artifact retained); (2) `--dry-run` mode printing row diffs (insert/update/skip counts, slug collisions) without writing; (3) Zod validation of every input row before any write; (4) transactional upsert batches (`$transaction`, per-batch, not one giant txn); (5) idempotent keys (deterministic laptop id, `@@id` price rows, upsert brands/retailers — already done); (6) post-seed verify query (counts + spot-check slugs/prices) with non-zero exit on mismatch; (7) rollback = restore dump (documented command). Remove network I/O (Unsplash) from the seed path — move to a separate `fetch-images` step. Guard destructive mode behind `ALLOW_WIPE_SEED=1` (refuse otherwise).

## 11. Security work
- **Phase 3 work:** region allowlist at API boundary (§5); region in cache key (§7); `.max()` on validation strings + `.finite()` on numerics (extends the Phase-2 numeric-clamp fix to `validation.ts` strings/ports/security elements and canonical `useCase` enum); localStorage validate-then-adapt (§9).
- **Future hardening (not Phase 3):** proxy-trustworthy rate-limit identity + email-scoped limits/captcha; request body size cap; `scoringMeta` debug-gating; CSP/JSON-LD escape (sequenced in Phase 4 per ARCHITECTURE.md).
- **Not applicable:** prototype pollution (fixed-key iteration verified), XSS/CSRF/SSRF in reviewed paths.

## 12. Performance considerations
Phase 3 must not regress: scoring stays O(n) pure (DB changes don't touch it); cache-key fix *reduces* wrong-region recomputation; trigram similarity uses the existing GIN index (verify with `EXPLAIN`: Bitmap Index Scan expected; fallback to `contains` if planner regresses). Measure after: quiz p50/p95 (target: unchanged ±10%), search latency before/after similarity switch, cache hit rate per region. No optimization of the 0.567 ms scorer — evidence says leave it.

## 13. Migration sequence
1. M4 provenance + M3 RateLimit purge (zero-risk, independent) → 2. M2 price columns (nullable/additive; backfill `inStock=true`) → 3. slug backfill + `CONCURRENTLY` unique + `@unique` flip → 4. `SlugRedirect` table + 308 handler → 5. cache-key fix + collision regression test → 6. search similarity path + threshold tests → 7. region allowlist + stale-offer flag → 8. seed rewrite (dry-run/validate/txn/backup) + runbook. Each step independently deployable; engine goldens re-run after every step (expect zero diff — data identical).

## 14. Rollback strategy
Migrations: forward-only with down path documented per migration (drop index / drop nullable column / revert field); data backfills re-runnable, never destructive. Slug flip rollback keeps redirect table (harmless). Seed rollback = restore `pg_dump` artifact (tested restore in staging first). Cache/search changes are code-only → revert commit. No step may delete user-visible data (prices, redirects, leads).

## 15. Testing strategy
- Migration tests: apply to staging snapshot, assert constraints/indexes exist, backfill counts match, app boots.
- Contract tests: region-keyed cache (US≠IN payloads), allowlist rejects `XX`, stale-offer flagging, trigram ordering (typo tolerance: "macbok" finds MacBook), slug collision suffixing, redirect 308 chain.
- Regression: full unit (100) + API (26) + E2E (17) + goldens after EVERY migration step — any diff blocks.
- Seed: dry-run diff test on fixture, idempotency test (seed twice → same row counts), backup/restore drill.

## 16. Deployment strategy
Staging first for every migration (production-like snapshot restore). Order: code tolerating both states → migrate → verify → code requiring new state (expand/migrate/contract within Phase 3's additive steps; the `@unique` flip is the only contract step, guarded by backfill + concurrent index). Cron/seed changes deploy with `PRICE_SYNC_APPLY=false` soak first (snapshot-only), then apply. No maintenance window needed (concurrent indexes, additive columns).

## 17. Risks
- Slug backfill collisions on near-duplicate variants (mitigated: deterministic suffixes + audit query + dry-run).
- `CREATE INDEX CONCURRENTLY` cannot run inside a transaction — Prisma migrate wraps in txn: use `db execute` script step outside migrate, documented.
- Trigram threshold tuning (too loose → noise; too strict → no better than contains): ship behind threshold constant + tests, default 0.15.
- FX-buffer staleness (IN 1.18/GB 1.2 multipliers drift): freshness window + cron refresh bound the damage; real multi-currency normalization is future work.
- Seed rewrite scope creep: strictly mechanical (same rows in, same rows out) — any catalog content change is out of scope.

## 18. Dependencies
Phase 2 contract (frozen) → Phase 3 infra → Phase 4 (ISR/`/r/[id]`/JSON-LD, per ARCHITECTURE.md). External: Postgres with `pg_trgm` (already enabled), `pg_dump` availability in deploy env, staging snapshot access. No new npm dependencies.

## 19. Exit criteria
- [ ] M1–M4 applied on staging with rollback tested; goldens byte-identical
- [ ] Region allowlist enforced; unknown region → 400 (test)
- [ ] US≠IN cache payloads (collision regression test green)
- [ ] Search uses trigram similarity with threshold + region scoping (tests)
- [ ] Stale-offer flag + region-consistent offer builder (tests)
- [ ] SlugRedirect + 308 chain (tests); legacy-id 308 preserved
- [ ] Seed: dry-run, validation, transactional idempotent batches, backup/restore drilled
- [ ] localStorage v2 envelope with validate-then-adapt (tests); old keys still read
- [ ] Full suite green (unit 100+, API 26, E2E 17, goldens) + tsc + eslint
- [ ] PHASE-3 runbook (backup/restore commands) written and executed once on staging
