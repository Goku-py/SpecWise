# SPECWISE V2 — PHASE 10 TRACEABILITY

Requirement → test/evidence → result. Evidence classes: A (code/test), B
(empty-state live), C (skipped, needs seeded DB), D (blocked, DB down).

## Acceptance gate mapping

| # | Requirement | Test / evidence | Result |
|---|---|---|---|
| 1 | 3D audited (Phase 9) | `PHASE-9-3D.md` + re-verify: 1 canvas, lazy, poster paths | PASS |
| 2 | 3D improves experience, restrained | Dark screenshot viewed; no new decoration | PASS |
| 3 | Light/Dark/System | 7 surfaces × 3 modes; persistence; system-follow; dual theme-color | PASS |
| 4 | Reduced motion | Poster renders, no blank, no drift (Phase 9 + re-check) | PASS |
| 5 | Mobile strategy intentional | Gate + poster; 390 overflow = 0 | PASS |
| 6 | Lazy loading | 3D chunk absent initial payload non-hero routes | PASS |
| 7 | Failure fallback | WebGL/poster/chunk/image/DB-down states → designed UI | PASS |
| 8 | No a11y regression | Landmarks/skip/focus/names/roles; 0 unnamed btns; 0 missing alts | PASS (quiz-H1 note → follow-up) |
| 9 | No unsafe remote assets | 0 external 3D requests; image allowlist exact-host | PASS |
| 10 | No fake claims | Rendered grep zero hits; demo labeled; zeros honest | PASS |
| 11 | Performance measured | Dev indicators + Phase 9 chunk/texture numbers; no severe failure | PASS WITH LIMITATION (no prod numbers) |
| 12 | tsc | `npx tsc --noEmit` exit 0 (×N agents) | PASS |
| 13 | Tests | unit 79/3; targeted 41/6; engine 51/51; mapping 127/9 | PASS |
| 14 | Build | `npm run build` success, full route table | PASS |
| 15 | Lint | 9E/7W = baseline; 0 in 7 changed/new files | PASS |
| 16 | Screenshots inspected | qa-phase10/* + team-lead dark home viewed | PASS |
| 17 | Image identity trustworthy | Step-0 removal holds; gates present; no auto-assign | PASS |
| 18 | Phase 10 only, no Phase 11 | No feature work; fixes fenced to 7 files | PASS |
| 19 | Phase 2–5 untouched | git status: same 4 modified + untracked set throughout | PASS |
| 20 | Homepage direction kept | 6-section order/copy/H1/CTAs byte-identical intent | PASS |

## Fix traceability

| Fix | Finding → | Change → | Verification |
|---|---|---|---|
| error.tsx button | Light-theme breakage (devops §5, team-lead read :14) | `buttonVariants()` (not-found idiom) | eslint clean; token reasoning (= not-found, renders fine) |
| aggregateRating | Invalid (no reviewCount; devops §2) | Block deleted + comment | tsc 0; JSON-LD valid by construction |
| Compare outage probe | Masking (devops §3: dead `catalogDown`) | Total-miss `SELECT 1` probe → existing unavailable state | 200 + unavailable copy (DB-down env); 200 + not-listed (DB-up env) |
| GET rate limit | F1 HIGH (appsec; Phase 0 H1) | 60/min/IP, PATCH 429 shape | Code + import reuse; no behavior change under limit |
| JSON-LD escaping | F5 MEDIUM (appsec; Phase 0 M4) | `stringifyJsonLd` at 3 sites; `</script>` → `\u003c/script\u003e` live-tested | Unit-style eval check by agent; tsc 0 |

## Deferred with reason

| Item | Reason |
|---|---|
| E2E spec updates (2 assertions) | Drift is vs uncommitted Phase 4/5 behavior; update after those commit |
| F2/F3/F6/F7/F8 hardening | Post-release; none meets blocker bar (all admin-gated or accepted-risk) |
| og:image, canonicals, health-DB, quiz H1, manifest PNGs | Improvements, §30 follow-ups |
| NEXT_PUBLIC_APP_URL | Ops deploy step (§29), not code |
| Firefox/WebKit, axe, live SR, prod Lighthouse | Environment limits; §29 item 5 / §31 |

## Release matrix (master §35)

Homepage PASS · Quiz PASS · Review PASS · Recommendation PASS · Results PASS ·
What-if PASS WITH LIMITATION (D: rerank delta) · Detail PASS WITH LIMITATION
(D: valid render) · Compare PASS WITH LIMITATION (D: populated) · Images PASS ·
3D PASS · Light PASS · Dark PASS · System PASS · Responsive PASS ·
Accessibility PASS WITH LIMITATION (no live SR) · Screen reader LIMITATION
(recorded, not faked) · Performance PASS WITH LIMITATION (dev-only numbers) ·
Network failures PASS · Database LIMITATION (ECONNREFUSED, classified) ·
SEO PASS WITH LIMITATION (prod env action) · Metadata PASS WITH LIMITATION
(prod stale) · Content honesty PASS · Security PASS (no blockers) ·
Build PASS · Tests PASS · Production deployment STALE (action required).
