# SPECWISE V2 — PHASE 10 QA PLAN

Executed against frozen `e7c3fec`. This plan defined the slice structure before
execution; results are in `SPECWISE-V2-PHASE-10-QA-FINAL.md`.

## Slices (4 parallel agents + team-lead gap-fill)

| Slice | Owner | Coverage |
|---|---|---|
| A. Journey + surfaces + engine + honesty | fullstack-dev | §§4,6–12 master; E2E journey, quiz, review, results, what-if, detail, compare, engine guards (51-test baseline), forbidden-claim grep |
| B. Themes/responsive/a11y/perf/matrix | qa-perf-tester → FAILED (free-tier limit) → team-lead gap-fill via Playwright MCP | §§14–18 master; 7 surfaces × Light/Dark, 390–1280 overflow sweep, keyboard/roles/names audit, dark screenshot viewed, dev perf indicators |
| C. Security release-safety | appsec-engineer | §26 master; re-verified all Phase 0 findings at HEAD + Phase 7–9 touchpoints |
| D. Baselines/SEO/failures/prod/consistency | devops-sre | §§21,23,24,28,29,31 master; tsc/lint/unit/build/E2E, SEO table, failure matrix, live prod GET-only check, one-product verdict |

## Classification (DB unreachable — Neon ECONNREFUSED)

- A: DB-independent (code/tests/build/SEO-audit) — must verify.
- B: empty-state behavior live — must verify.
- C: seeded-DB E2E — skip, specs untouched.
- D: populated behavior — blocked, documented per item, no fabrication.

## Blocker policy (master §32)

Blocker iff: breaks core journey, incorrect recommendations/identity, fabricated
info, broken major route, serious a11y/security/perf failure, stale/broken deploy.
Cosmetic/minor-copy ≠ blocker. Fixes: only blockers/severe/incorrect-data
(§33); each fix justified by a finding (§32 of FINAL doc). No new features,
no engine changes, no redesign.

## Fix gate

Agent rule: report findings, DO NOT implement. Team-lead selected 5 (all
one-line-class, verified safe): error.tsx button, aggregateRating removal,
compare outage probe, GET rate limit, JSON-LD escaping. E2E spec drift and
hardening items deferred with reasons (FINAL §§25–26, §30).

## Deliverables

`SPECWISE-V2-PHASE-10-QA-FINAL.md` (33 sections) +
`SPECWISE-V2-PHASE-10-TRACEABILITY.md` + scoped commit, no push.
