# SpecWise 2.0 — Roadmap (dependency-ordered)

## Phase 2 — Scoring + questionnaire foundations
Objective: one ranker, one bank. Inputs: CURRENT-STATE + RECOMMENDATION + QUESTIONNAIRE. Outputs: single `scoreLaptops()`, v2 bank (Q1–Q9), price-0 quarantine, deterministic tie-break, slider-as-overlay. Likely files: `src/lib/scoring.ts, decomposition.ts, validation.ts, components/quiz/*, results/*`. Deps: none. Tests: golden top-3 + edges + quiz 200/400/429. Risk: ranking shift (medium). Exit: golden pass, zero dead inputs, ledger present.

## Phase 3 — Data/infra hardening
Objective: safe migrations + fast reads. Outputs: slug unique + redirect table, trigram similarity ranking (GIN index already exists — wire it into the search route), region-keyed cache entries (fixes verified region collision), region allowlist + price freshness/availability model, guarded idempotent seed (dry-run/backup/restore) + runbook, localStorage v2 validate-then-adapt, RateLimit retention. Files: `prisma/*, lib/catalog-cache.ts, lib/prisma.ts, lib/regions.ts, api/laptops/search, api/* (region validation), scripts/*`. Deps: Phase 2 fixtures (goldens must stay byte-identical throughout). Tests: staging migrate up/down, search similarity + threshold, region-keyed cache regression, slug 308 chain, seed idempotency + restore drill, full unit/API/E2E. Risk: high. Exit: backup/restore drilled, CI green. Detail: `PHASE-3-PLAN.md`.

## Phase 4 — Shareable + static + region-consistent
Objective: `/r/[id]`, `/compare/[id]`, ISR detail/category, region-consistent JSON-LD, CSP report-only→enforce. Files: `app/r/*, app/compare/*, app/laptops/*, app/category/*, lib/share.ts`. Deps: Phases 2–3. Tests: share round-trip, legacy fallback, per-region JSON-LD snapshots. Risk: medium (SEO). Exit: old links work, sitemap excludes shells.

## Phase 5 — Trust/SEO/a11y + release
Objective: noindex shells, canonical/OG-image, BreadcrumbList/ItemList/FAQ, labels/alerts/live-regions, 44px + contrast pass. Files: `layout.tsx, sitemap.ts, robots.ts, globals.css, header/catalog/results`. Deps: Phase 4 URLs frozen. Tests: Playwright region/SEO/a11y + Lighthouse. Risk: low. Exit: shells deindexed, OG/canonical verified.

## Phase 5+ — Ops
Secret-scan/dep-audit CI, Sentry/uptime, structured rid+JSON logs + `x-request-id`, cron monitoring. Exit: rollback + reseed-restore tested.
