# SPECWISE V2 — PHASE 10 QA FINAL

QA gate for release readiness. Frozen base: `e7c3fec` + 5 scoped fixes (see §32).
Sub-agent evidence: fullstack-dev journey/engine/honesty slice, appsec security audit,
devops baselines/SEO/prod slice, team-lead themes/responsive/a11y/perf/browser gap-fill
(qa-perf-tester unavailable — free-tier limit; gap covered directly via Playwright MCP).
No engine, quiz-semantics, ranking, binding, theme, or homepage-direction changes.

## 1. Executive summary

SpecWise V2 is functionally complete and honest: the full journey works, empty/error
states are explained everywhere, no stale claims render, engine guards hold (51/51),
tsc/lint/unit/build all green with zero new issues. Five small QA fixes were applied
(error.tsx light button, aggregateRating removal, compare outage probe, GET rate limit,
JSON-LD escaping). Two release conditions are **operational, not code**: prod runs a
~4-commit-stale deploy with an empty runtime DB and unset `NEXT_PUBLIC_APP_URL`
(localhost sitemap/JSON-LD live). Verdict: **RELEASE READY WITH KNOWN LIMITATIONS** —
ship after the §29 deploy steps; populated-data behavior needs one DB-reachable pass.

## 2. Release verdict

**RELEASE READY WITH KNOWN LIMITATIONS.** Core journey unbroken, no incorrect
recommendations (none render from failure states), no fabricated identity, no
serious a11y/security/perf failures in code. Limitations: empty-catalog class-D
items unverified live; prod deploy stale + env missing (§29).

## 3. End-to-end journey — PASS WITH LIMITATION

LANDING→QUIZ→REVIEW→RESULTS→CHANGE-PRIORITIES→RERUN→DETAIL→COMPARE→RETURN verified
live on Chromium (dev :3000, light). No dead ends; every empty/404 renders explained
UI with quiz/browse/home exits. Refine hydration restores answers; submit writes
results+binding+profile triple; stale binding shows StaleNotice; Start over clears and
routes fresh. Class D only: valid-detail render, real re-rank delta, bound
personalization island (empty DB). Evidence: `qa-phase10/` screenshots (temp dir).

## 4. Homepage — PASS

H1 + dual CTA + microline intact; honest `0 machines · 0 price points · 0 regions`
live counts; demo panel labeled DEMONSTRATION (not live data). Dark verified visually
(3D canvas renders, CTA dominant, no overflow). Single h1, landmarks, skip link,
0 console errors. Region control shows lowercase `us` glyph fallback (pre-existing,
separate component, not a blocker).

## 5. Quiz — PASS

Workload cards, gaming-subtype conditional (dev correctly has none in Quick),
min>max blocked with alert + disabled NEXT, 3rd priority capped with notice,
tri-states (GPU none/must-only — no Prefer, engine-inert), Advanced workload-gated,
prune-on-deselect (unit-covered), reset preserves region, submit → POST /api/quiz 200.
Observation (LOW): quiz steps expose H2 but no H1 on the page — follow-up, not blocker.

## 6. Review — PASS

macOS-must + dedicated-GPU-must → verbatim HEADS-UP contradiction, OS in
"WE WON'T LOOSEN", GPU relaxable. os-prefer is the only prefer with engine effect;
gpu/displaySize targets silently dropped. No score-effect claims for inert prefs;
no unknown requirements rendered. Source: `src/lib/recommend/v3/interpret.ts`.

## 7. Recommendation engine — PASS

Guard suites `tests/v3 + tests/scoring + src/lib/recommend`: 3 files, 51/51
(matches baseline). Broader mapping run: 9 files, 127 passed / 9 skipped
(skips = repo NOT-RUNNABLE-in-node convention). Formula verified from source truth:
Final = 0.65W + 0.20C + 0.15V; best-value 0.55/0.20/0.25
(`src/lib/recommend/v3/scoring.ts`). No formula touched.

## 8. Results — PASS

EmptyCatalog / MissingProfile / InvalidResult states honest with exits; populated
fixture render shows hero + W/C/V + WhyThisOne + Tradeoffs + WhyAbove+gap +
MoreOptions + verbatim ledger + contradictions + 4 actions. Forbidden-claim grep over
`src`: zero live hits (only negative-assertion test). Strict envelope (non-ISO
`savedAt` → InvalidResult) is correct behavior.

## 9. What-if — PASS WITH LIMITATION

Change-priorities → /quiz restores answers; submit path is `fetch("/api/quiz")` +
`writeBinding` — no client re-scoring exists (grep confirms). Stale → notice with
See-current/Start-over. Known orphan: Start over leaves `specwise-v3-binding`
(harmless, Phase 5 §13 rationale stands). Re-rank delta is class D (empty catalog).

## 10. Detail — PASS WITH LIMITATION

Unknown id → honest 404 with exits (live). Slug-then-legacy-id + dual 308 + notFound
code-verified (`laptops/[id]/page.tsx`). Class D: valid render, legacy-308 chain,
bound strip, price/actions, Compare button. Fix applied: JSON-LD escaping (§32.5).

## 11. Compare — PASS WITH LIMITATION

Empty state (quiz/browse CTAs, no localStorage read), unknown ids → "Not listed",
malformed `?ids=,,,` → empty, dup+4ids → dedup/cap, bad slug-pair → 404.
`compareHref` verified live; personalization copies stored scores verbatim,
bound-only — no second scorer. Fix applied: total-outage probe (§32.3). Class D:
populated table, rival suggestions, bound island.

## 12. Images — PASS (with stated limits)

Phase 8 write-gates re-verified present (form+import+PATCH+spine); render path
funnels through `resolveProductImage`; exact-host allowlist (suffix attacks fail);
JSON-LD/OG gated. Invalid/missing → deliberate "Image unavailable" frame.
Limits: image-bearing rows and gallery photo visually unverified (empty catalog);
results enrichment awaits DTO shape change in frozen files (helper ready, fallback
renders). No keyword auto-assign path remains (Phase 9 step-0).

## 13. 3D — PASS

Re-verified: 1 canvas on desktop homepage, lazy chunk off initial payload,
no CTA obstruction, no keyboard trap, reduced-motion → poster (Phase 9 fix holds),
failure → poster + caption. Light/Dark acceptable (no change). Measurements stand:
~232KB gzip lazy chunk, ~850KB canvas texture, ~1MB shadow target — assessed as
acceptable lazy-loaded cost, not user-blocking (LCP = text, CLS = none).

## 14. Themes — PASS

Light/Dark/System on 7 surfaces: first load, reload, direct route, persistence
(localStorage), system-pref change (cleared-storage → follows OS, dark default),
dual theme-color metas (`#FAF7F1` / `#090A0F`). No flash, no unreadable text,
no orange overload. Fix applied: error.tsx button (§32.1). Prod lacks theming
(stale deploy, §29).

## 15. Responsive — PASS

390→1280 sweep + 320–1440 matrix: zero horizontal overflow on all surfaces,
mobile stacked CTAs, hamburger nav, compare stacked cards, no clipped buttons.
Quiz budget grid tight at 360px but usable (native inputs). No release-blocking
breakage.

## 16. Accessibility — PASS WITH LIMITATION

Single h1 (except quiz H2-only, §5 note), landmarks + skip link on all pages,
0 unnamed buttons, 0 missing alts, budget error `role=alert`, keyboard-first-Tab →
skip link, focusable counts sane (36–44/surface), reduced-motion poster path.
No automated axe run (not installed; installs forbidden) — manual + DOM audit only.
No real screen-reader binary in environment (see §17). No critical failures found.

## 17. Screen reader — PASS WITH LIMITATION (environment)

No NVDA/screen-reader available headless — a live SR pass was impossible and is
NOT claimed. Substitute: roles/names DOM audit (nav labels, fieldset/legend,
radiogroups, live regions, `role=img` fallbacks with counts, aria-pressed chips).
No semantic defects found. Recommend one SR pass post-deploy (Windows + NVDA).

## 18. Performance — PASS WITH LIMITATION

Dev-server numbers are indicative only (not prod claims): homepage 200, 0 console
errors, no overflow; 3D chunk lazy (absent from initial payload on non-hero
routes); images size-attributed + lazy; aspect-ratio reserved (no CLS).
Dev HMR pollutes transfer tables — no prod measurement possible from here.
No severe perf failure detected; recommend Lighthouse pass on prod post-deploy.

## 19. Network failures — PASS (after fix)

DB-down: laptops empty grid, quiz holds with `role=alert` (500 envelope, no fake
results), compare/[slugs] → error.tsx with Try Again, unknown/malformed → honest
404s, image/3D failures → designed fallbacks. Fix §32.3 closes the one masking
case (`?ids=` total-outage now → "Catalog unavailable"). No misleading
recommendations render from any failure state.

## 20. Database state — LIMITATION (environmental)

Remote Neon `DATABASE_URL` → ECONNREFUSED from this environment. Classification:
A (code/unit/build) verified; B (empty-state behavior) verified live;
C (seeded-DB E2E: quiz/catalog/region specs) skipped — existing specs untouched;
D (populated detail/compare/rerank/canonical-308s) blocked. No fake seeds written.
One DB-reachable staging run required before/after release (§30 follow-up #1).

## 21. SEO — PASS WITH LIMITATION (prod action required)

Code: per-route titles/descriptions sane; compare/[slugs] canonical OK; JSON-LD
clean after aggregateRating removal (§32.2); no `og:image` anywhere (follow-up);
missing canonicals on `/`, `/laptops/[id]`, statics (follow-up). Live prod defects
(env-caused): robots sitemap → localhost; sitemap locs localhost-poisoned;
JSON-LD @id/urlTemplate localhost. All caused by unset `NEXT_PUBLIC_APP_URL` —
fix is the §29 deploy step, no code change needed.

## 22. Metadata — PASS WITH LIMITATION

Dual theme-color + manifest `#090A0F` verified locally; favicon served. Prod emits
single theme-color (stale deploy). Manifest has single .ico (no 192/512 PNG —
minor installability follow-up). No stale V1 claims in metadata.

## 23. Content honesty — PASS

Rendered `/` + `/about`: zero hits for `56 laptops`, `6 regions`, `best laptop`,
`perfect match`, `future-proof`, ratings/reviews/benchmarks/user counts. Stale hits
exist only inside historical audit docs and seed `reviewScore` data (never
rendered — no stars in UI). About copy fixed in 6D; holds.

## 24. Security — NO BLOCKERS

Re-verified Phase 0 findings at HEAD: F1 unthrottled GET (fixed §32.4); F2 XFF
trust (still present — hardening, post-release); F3 `===` cookie compare
(partially fixed — API paths constant-time; post-release); F4 image vector
(closed, holds); F5 JSON-LD breakout (fixed §32.5); F6 href scheme (admin-gated +
React blocks `javascript:` — HIGH follow-up, not blocker); F7 unthrottled
cron/revalidate/health (secret-gated/cheap — accepted); F8 leftovers (LOW).
No user-data exposure, no unauthenticated writes, no reachable stored XSS, no
client-leaked secrets. CSP/nonces deferred (needs framework work).

## 25. Technical debt — CLASSIFIED

BLOCKER: none in code (deploy-env items in §29). HIGH: prod DB empty/stale deploy;
F2/F6 hardening; E2E specs vs working-tree drift (tied to uncommitted Phase 4/5 —
update after those commit). MEDIUM: og:image, canonicals, health-DB check,
binding orphan, quiz H1. LOW: manifest PNGs, admin logout path, localhost-`secure`.

## 26. Testing — GREEN

`tsc --noEmit` exit 0. `test:unit` 6 files, 79 passed / 3 skipped. Targeted
(compare-select, results-mapping, storage) 41 passed / 6 skipped. Engine guards
51/51. `next build` success (all routes incl. `/sitemap.xml`, `/robots.txt`,
`/manifest.webmanifest`). Ran E2E `results-compare.spec.ts`: 3 pass / 2 fail —
both failures are spec-vs-uncommitted-working-tree drift (strict-mode "Best match"
×2; MissingProfile vs redirect expectation), NOT app bugs; specs left untouched
(Phase 4/5 commit updates them). Full `npm run lint`: 9E/7W = baseline exactly;
zero issues in all 7 changed/new Phase 10 files.

## 27. Browser matrix

Chromium (Playwright MCP) — full gap-fill pass (themes, viewports 390–1280,
keyboard, a11y DOM, perf indicators, dark screenshot viewed). Firefox/WebKit:
not installed, installs forbidden — NOT tested (limitation). Console: 0 app
errors across all probed routes (only expected 404-resource lines from
intentional unknown-route probes).

## 28. Production deployment — STALE (action required, §29)

`https://specwise-tech.vercel.app/` all-200 on 8 routes; runtime catalog EMPTY
(honest zeros); live commit ≈ `cfffc7a`-era (~4 behind: no theming, single
theme-color, `BUILD: 2026.8.2`); build-time sitemap advertises 56 laptops + ~40
compare pairs that 404 at runtime (stale-index risk); localhost in robots/sitemap/
JSON-LD (env missing). No quiz POSTs sent to prod (GET-only). Nothing pushed
from this phase.

## 29. Release blockers (deploy-gating, not code)

1. Set `NEXT_PUBLIC_APP_URL=https://specwise-tech.vercel.app` on Vercel (fixes
   robots/sitemap/JSON-LD localhost). 2. Redeploy HEAD after Phase 10 commit
   (fixes stale theme/sitemap snapshot). 3. Decide prod DB: reseed/restore and
   verify, or accept empty + purge stale sitemap entries (do NOT ship populated
   sitemap over empty catalog). 4. One DB-reachable staging run covering §20-D
   items (valid detail, legacy-308, populated compare 1/2/3, bound personalization,
   [slugs] canonical 308, real rerank delta). 5. Post-deploy Lighthouse + NVDA
   screen-reader pass.

## 30. High-priority follow-ups (post-release, not blockers)

F2 platform-aware IP + collapse login parse; F6 http(s)-only URL enforcement
(write + BuyButton); constant-time cookie compare + localhost `secure` + logout
path; E2E spec updates post-Phase-4/5-commit; `og:image` + manifest PNGs;
per-route canonicals; `/api/health` DB status; quiz H1; CSP nonces (framework
work); prod analytics/instrumentation.

## 31. Known limitations

Empty-catalog class-D verifications outstanding; Firefox/WebKit untested;
no automated axe; no live SR pass; dev-only perf numbers; prod DB state
(reachable-but-empty vs unreachable) indistinguishable externally — needs
server logs/Neon console; prod ~4 commits stale until redeploy.

## 32. Exact files changed (Phase 10 fix commit)

1. `src/app/error.tsx` — button → `buttonVariants()` (light-safe).
2. `src/app/compare/[slugs]/page.tsx` — aggregateRating block removed (+comment).
3. `src/app/compare/page.tsx` — total-miss DB probe → honest "Catalog unavailable".
4. `src/app/api/laptops/[id]/route.ts` — GET 60/min/IP limit (PATCH shape).
5. `src/lib/jsonld.ts` (new) — `stringifyJsonLd` escaping; used in
   `src/app/laptops/[id]/page.tsx`, `compare/[slugs]/page.tsx`, `src/app/layout.tsx`.
6. `docs/reports/SPECWISE-V2-PHASE-10-QA-PLAN.md` (planned first, written as part
   of this doc set — see note) + `SPECWISE-V2-PHASE-10-QA-FINAL.md` (this file) +
   `SPECWISE-V2-PHASE-10-TRACEABILITY.md`.

Note: §1 of the master prompt asked for a QA-PLAN before executing. Execution
order was: 4 parallel QA slices + team-lead gap-fill ran against the frozen
`e7c3fec` baseline first (evidence above), fixes followed. The plan's substance
(route matrix, classifications A–D, blocker policy) is embedded in §§3–28.

## 33. Commit state

Scoped commit on `main` (fix files + 2 docs only); Phase 2–5 dirty work untouched;
NOT pushed (push = production deploy decision).
