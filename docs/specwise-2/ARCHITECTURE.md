# SpecWise 2.0 — Architecture

## Future shape (evolution, not rewrite)
Same Next.js + Postgres + Prisma + RSC + client islands. Changes: single `scoreLaptops()` entrypoint (delete `decomposition.ts` mirror; slider = labeled overlay); single question bank + `validation.ts` v2; `ShareLink` table + `/r/[shortId]` + `/compare/[shortId]` (CSPRNG ids, no PII in URL, legacy `?ids=`+storage fallback); slug unique index (backfill → concurrently → `@unique`, keep legacy→308); `pg_trgm` search; Next 16 `use cache` + `cacheTag/cacheLife` (replace deprecated `unstable_cache`, preserve keys); ISR for detail/category (`revalidate=3600` + `generateStaticParams`), `force-dynamic` kept only for `/results /compare /admin`; guarded seed (`ALLOW_WIPE_SEED=1` + `pg_dump` runbook).

## Data flows
Quiz → `POST /api/quiz` (Zod v2 + 60/min) → pipeline (INTENT→…→RESULTS per RECOMMENDATION.md) → top 12 + ledger → localStorage (compat keys) + optional ShareLink + optional Resend (opt-in, fire-and-forget). Compare/detail resolve server-side by ID — never localStorage-only.

## Security/privacy
Share endpoints inherit Zod + RateLimit + Retry-After; add limits to `health/get-by-id/revalidate/cron`; email never in share payload/URL (Lead only); JSON-LD escape first, then CSP `unsafe-eval` removal (test three/motion), nonce last; admin cookie Secure scoping fixed for localhost dev.

## Analytics (privacy-minimal, future)
`quiz_started/completed/abandoned`, `question_skipped`, `recommendation_viewed/adjusted`, `comparison_started`, `product_viewed`, `purchase_link_clicked`, `result_shared` — aggregate only, no per-user tracking, no unnecessary PII.

## A11y (binding)
Per DESIGN-REQUIREMENTS.md: labeled inputs, slider roles + keyboard, `role=alert`/`aria-live`, 44px targets, motion-safe, text equivalents.

## Tests
Golden top-3 + edge fixtures + contract/property tests (determinism, price-unknown invariant, ledger completeness, explanation traceability); Playwright region/SEO/a11y; CI = lint + tsc + unit + api + e2e + build on postgres:16 (+ future secret-scan/dep-audit).
