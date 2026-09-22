# SpecWise 2.0 — User Model & Journey

## User model (intent-based, no invented demographics)
Axes: intent · workload · budget · priorities · constraints · trade-offs · tech familiarity · purchasing context.

| Intent | Workload | Budget | Priorities | Constraints | Trade-offs |
|---|---|---|---|---|---|
| Study | docs/web/classes/meet | low–mid, hard ceiling | battery, portability, value | <2kg, 6–8h | perf/gpu/color for price |
| Office | docs/sheets/meet/multitask | mid, employer-bounded | battery, portability, build, RAM≥16 | quiet, keyboard, security | dgpu/refresh for reliability |
| Code | compile/VM/containers | mid–high | cpu, ram, storage | RAM≥16, SSD≥512 | battery/weight for build speed |
| Gaming | AAA/esports | mid–high flexible | dedicated gpu+VRAM, cpu, ≥120Hz | thermals/TGP (MISSING field) | battery/thinness for fps |
| Creative | edit/render/CAD | mid–high | cpu, gpu, color display, ram | P3/gamut, 16GB+ | battery/weight for render |
| Travel | field work | mid | battery 10h+, portability, build | <1.5kg, 10h | power for endurance |

`useCase` sets the weight profile + preset defaults; HARD = budget/os/ram/storage floors; SOFT = portability/battery/display/build.

## Journey (per stage: user goal / system goal / collect / present / confusion / exit / trust / mobile)
- **DISCOVERY:** find trustworthy start / rankable promise + live counts / — / proof-first hero / 3D weight, dead `#api` / bounce / dated counts / lightweight, no stagger-LCP.
- **LANDING:** orient / single H1 + 5 use-case cards → `/category` / click / counts + methodology sample / Database-vs-Catalog naming drift / pick card / non-affiliate note / stacked ≥44px cards.
- **INTENT:** describe work in my words / capture only `useCase` / mode + workload card / preset preview / preset opacity / choose mode / preset honesty / one-card-per-view.
- **QUESTIONNAIRE:** set limits w/o homework / HARD-vs-SOFT split, zero dead asks / budget-localized, os, ram/storage-via-plain-language / hints + skippable / F-score/TGP/P3 jargon / save+resume localStorage / progress + skippable / one-q-per-view, 44px.
- **REFINEMENT:** correct w/o restart / review-before-submit / edits + region / summary + feasibility hint / null-all→pure-fit surprise / back (confirm before step-0 wipe) / show what changes rank / sticky CTA.
- **RECOMMENDATIONS:** get buyable list / one ranker top-12, price-unknown quarantined / answers+region / cards + meter + 1-line why / slider-vs-server confusion / empty→relax-trace / "adjusted view" label / stacked + `aria-live`.
- **EXPLANATION:** why-this-not-that / reasons+tradeoffs+deltas / — / top-3 deltas + relaxed notes / stale slider scores / share URL / single-score source / list equivalent for radar.
- **COMPARISON:** decide among finalists / server-resolved table / ids / 12-row sticky table / missing-ids error / back to results / same scores as results / horizontal scroll + sticky col.
- **DETAIL:** verify + price / region-consistent facts + Product JSON-LD / region / SpecRow + validity-stamped prices + related / region mismatch / buy outbound / real availability / related links.
- **PURCHASE:** buy externally / affiliate-disclosed outbound + `rel=sponsored noopener` / click / price drift / new tab / disclosure at click / retailer name visible.
