# SPECWISE V2 — TECH DEBT (Phase 0 satellite)

> Verified only. Format: PROBLEM / EVIDENCE / IMPACT / RISK. DO NOT FIX YET (Phase 0 rule).

## ARCHITECTURE
- Doc-vs-code `middleware.ts→proxy.ts`. EVIDENCE: `src/proxy.ts` exists, no `middleware.ts`; stale refs in
  `region.ts:8`, region-picker, `handoff.md:30`, `README:16`, `CURRENT-STATE:15,24,119`, `REDESIGN:4,683`.
  IMPACT: future agents edit wrong path. RISK: P2 process.
- Slug-uniqueness comments vs schema `@unique`. EVIDENCE: `schema.prisma:62` vs `slug.ts:4`, `seed.ts:17`.
  IMPACT: P2002 surprise. RISK: P2.

## DATA
- Prod DB empty + stale copy live. EVIDENCE: `/` 0/0/0, `/laptops` empty, `/about` "56 laptops" (2026-10-04T17:05Z).
  IMPACT: every prod flow degraded. RISK: **P0**.
- Cron wiring unverified + batch-5/day too slow. EVIDENCE: `vercel.json:2-7` (no auth header); batch default 5.
  IMPACT: silent 401/403s; weeks-to-cover. RISK: P0 freshness.
- Pool mismatch max-15/15s vs docs 5/5s. EVIDENCE: `prisma.ts:10-12` vs `.env.example:47-49`.
  IMPACT: serverless exhaustion. RISK: P1.
- `deleteLaptop` dead (zero callers); no delete UI/route. EVIDENCE: `catalog.ts:417`. IMPACT: orphan semantics. RISK: P2.
- No admin preview; draft unreachable; no price editor. EVIDENCE: form ends Save/Cancel; `actions.ts:60-62`.
  IMPACT: live-mutation risk. RISK: P2.
- Tag-only `/api/admin/revalidate` vs tag+paths elsewhere. EVIDENCE: `revalidate/route.ts:5` vs `catalog.ts:170-175`.
  IMPACT: static lag to TTL. RISK: P2.
- `prices[0]` list vs `pickBestOffer` elsewhere. IMPACT: inconsistent stale display. RISK: P2.
- Spine with no read path (dual-schema carry cost). RISK: P2.

## FRONTEND
- Results cul-de-sac (no detail/compare/share; bounce unexplained). EVIDENCE: `results-view-v3.tsx`. RISK: P1 UX.
- Dual compare, zero continuity (footer→A legacy-only; detail→B; results→neither). RISK: P1 UX.
- V3 best-match text-only (no image). RISK: P2 UX.
- "Only show" footguns + non-relaxable budget-min/OS/refurb → zero-state. RISK: P1 UX.
- Explorer "real specs" overpromise + all-"—" heatsink. RISK: P2 trust.
- Duplication (`Card`/divs, two `Section`s, `SpecRow`/`SpecCard`, compare-only scroll a11y). RISK: P2 drift.
- `results-view-v3` blank-flash (`null` while loading). RISK: P2.
- `motion` single-consumer; `RadarChart`/`TerminalBox`/legacy results dormant; `numShortfall` + unused imports dead.
  RISK: P3.

## BACKEND
- None beyond data/security sections; write layer centralized and validated (positive).

## UX
- Landing dual-action split + no browse on-ramp. RISK: P2.
- Progress 4→5 denominator shift; OS 8-chip noise; budget side-by-side at 360px. RISK: P3.

## PERFORMANCE
- 3 `set-state-in-effect` cascading renders + R3F scene/camera mutations (lint errors). EVIDENCE: lint output
  (`results-view-v3.tsx:26`, `hero-laptop-wrapper.tsx:110,131`, `hero-laptop-scene.tsx:36,55,60,84`,
  `exploded-laptop.tsx:46`). RISK: P2 perf/lint-gate.
- Unpaginated admin table; unbounded `/compare?ids=` columns; `min-w-[600px]` scroll tables. RISK: P2.
- `next dev` e2e only (never prod build); retries 0. RISK: P2 CI gap.
- No bundle/CWV measurement. RISK: P3 (UNKNOWN).

## ACCESSIBILITY
- Scroll-region treatment compare-only; RangeSlider focus PARTIAL; contrast unmeasured; reduced-motion SSR flash;
  RadarChart mouse-only (dormant). No SR/device pass. RISK: P2 (unmeasured).

## SECURITY
- HIGH H1: `GET /api/laptops/[id]` no rate limit. EVIDENCE: `route.ts:8-26` vs PATCH `:36-43`. RISK: HIGH.
- HIGH H2: FWD-IP unconditional trust. EVIDENCE: `rate-limit.ts:14-20`, `admin/actions.ts:26-27`. RISK: HIGH.
- MEDIUM M1: raw-secret cookie + `===` browser compare. EVIDENCE: `admin/actions.ts:16,34`, `admin/page.tsx:31` vs
  `admin-auth.ts` timingSafeEqual. RISK: MEDIUM.
- MEDIUM M2: stored URLs rendered sans scheme allowlist (admin-gated). EVIDENCE: `product-image.tsx:38`,
  `buy-button.tsx:56`, `affiliate.ts:100`; admin `imageUrl` no `.url()` (`laptop-fields.ts:146`). RISK: MEDIUM.
- MEDIUM M3: cron/revalidate/health unthrottled (cron secret-gated but expensive). RISK: MEDIUM.
- MEDIUM M4: JSON-LD `</script>` breakout (admin-gated). EVIDENCE: `layout.tsx:98`, `[id]:317`, `[slugs]:324`.
  RISK: MEDIUM.
- LOW L1–L5: revalidate logging; admin region unvalidated (`admin/page.tsx:36`); `secure:true` localhost break;
  empty-`q` uncapped browse (`search/route.ts:88`, rate-limited); `sendResultsEmail` dead code. RISK: LOW.
- INFO positives: no NEXT_PUBLIC secret leak; parameterized SQL; headers+CSP; Unsplash-only surface; `.env`
  gitignored.

## TESTING
- Lint FAILING: 9 errors + 7 warnings (recorded 2026-10-04; full output in master §28). RISK: P1 process (gate absent).
- Full suite (`npm test`/`test:api`/`test:e2e`) + `next build` NOT run (DB/server-gated). `test:unit` 11/11 PASS;
  `tsc --noEmit` PASS. RISK: P2 coverage gap.
- Untested critical: empty-catalog quiz→results, refine round-trip, region re-render, compare-A legacy payload, cron
  batch, import rollback. RISK: P2.

## DOCUMENTATION
- README stale-incomplete (5/18 scripts, 3/16 vars). PRODUCTION-AUDIT superseded. MASTER.md superseded (correctly
  ignored). DECISIONS read-as-shipped risk. Stale code comments (proxy/ISR/slug). RISK: P2.

## DEPLOYMENT
- `robots.txt` localhost sitemap live. EVIDENCE: `GET /robots.txt` → `http://localhost:3000/sitemap.xml`. RISK: P1 SEO.
- No OG image asset (`public/` has no OG). RISK: P2 SEO.
- Unsplash-only lock-in (`remotePatterns` + CSP). RISK: P2.
- No audit/Dependabot/drift CI; vuln UNKNOWN. RISK: P2.
- `.env.example↔code` names all present (positive); `NEXT_PUBLIC_APP_URL` fallback is the localhost source.

## Preservation (audit classification, not permission)
KEEP AS-IS: v3.1 math/weights/tie-break/lanes; explanations; `CanonicalProfile`+validation; `pickBestOffer`; 308s;
canonical pairs; admin whitelist+atomic import; cache discipline; reduced-motion; JSON-LD model (post-escape-fix).
REWORK LATER: results onward-paths; compare convergence; multi-host images; admin delete/price/preview; results share.
REASSESS: `motion`; dormant components; spine-vs-legacy. DEFER: thermals, galleries, email. REMOVE CANDIDATE
(decision-gated): `numShortfall`, unused imports, dormant components (after full-grep).
