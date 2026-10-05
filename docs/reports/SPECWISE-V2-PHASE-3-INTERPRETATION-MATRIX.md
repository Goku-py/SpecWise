# SPECWISE V2 — PHASE 3 INTERPRETATION MATRIX

> Every displayed item: User-facing statement → Source profile field → Transformation/helper →
> Engine field → Verified meaning → Allowed wording → Forbidden wording.
> Impl: `src/lib/recommend/v3/interpret.ts`; UI: `src/components/quiz/ReviewSummary.tsx`.

## Workload
| Displayed | Source | Helper | Engine | Meaning | Allowed | Forbidden |
|---|---|---|---|---|---|---|
| "Coding & software — Primary" (+ subtype lines) | `workloads[]` | `interpretProfile` workload map; labels mirror quiz cards | `weightsForProfile` blend; `workloadProposals` seeds | Sets scoring balance + proposal seeds | "Your workload sets the balance." | Any per-component claim ("CPU matters most for you"); "Type-A", importance numbers |

## Must-haves (hards → filters)
| Displayed | Source | Helper | Engine | Meaning | Allowed | Forbidden |
|---|---|---|---|---|---|---|
| "Windows" / "macOS" … | `requirements[os]` hard | id text map | `hardFailures` os; NEVER relaxed | Strict permanent filter | "Only matching laptops are shown." + "never loosened" (os) | "Best OS for you" |
| "16 GB RAM or more" | `requirements[ram]` hard | min/target number | `hardFailures` minRam; relax bands 32/24/16/8 | Filter, relaxable down | "Only matching laptops are shown." | Score-boost claims |
| "1 TB storage or more" | `requirements[storage]` hard | 1024→"1 TB" format | `hardFailures` minStorage; bands 1024/512/256 | Filter, relaxable down | same as RAM | same |
| "Dedicated graphics" | `requirements[gpu]` hard | — | `hardFailures` gpuDedicated; relax→preferred | Filter, relaxable | "Only matching laptops are shown." | "Will run every game" |
| "No heavier than X kg" | `requirements[weight]` hard | max kg | `hardFailures` maxWeight (null fails); relax→dropped | Filter, relaxable | "Only matching laptops are shown." | — |
| "X or more CPU cores" | `requirements[cpu-cores]` hard | target number | `hardFailures` minCores; relax→dropped | Strict filter | "Only matching laptops are shown." | — |
| "X GB or more graphics memory" | `requirements[vram]` hard | target number | `hardFailures` minVRAM (unlisted fails); relax→dropped | Strict filter | "Only matching laptops are shown." | "Future-proof" |
| "X Hz or faster display" | `requirements[refresh]` hard (share-link only; UI emits target) | target number | `hardFailures` minRefresh; relax→dropped | Filter if present | "Only matching laptops are shown." | — |
| "X hours or more battery" | `requirements[battery]` hard (share-link only) | target number | `hardFailures` minBattery (null fails); relax→dropped | Filter if present | "Only matching laptops are shown." | Battery-life predictions |
| "13-inch or larger display" | `requirements[displaySize]` hard | target number | `hardFailures` minSize; relax→dropped | Strict filter, relaxable | "Only matching laptops are shown." | — |
| "Ports: HDMI, USB-C…" | `requirements[ports]` hard | split "+" join ", " | `hardFailures` subset; relax shrinks one | All-must-match filter | "Laptops must have all of these." | — |
| "RAM upgradable / Storage expandable" | `requirements[upgrade]` hard | includes ram/storage | `hardFailures` bools; relax→both false | Strict filter | "Only matching laptops are shown." | — |
| "New laptops only" | `requirements[refurb]` hard | target "new-only" | `hardFailures` newOnly; NEVER relaxed | Strict permanent filter | "Only matching laptops are shown." + "never loosened" | — |
| Budget "₹80,000–₹1,20,000" | `requirements[budget]` hard + `budget` | Intl by currency | `hardFailures` min/max (missing fails both); max relax +10%/+25%; min NEVER | Min permanent, max relaxable | Exact range; "minimum never loosened" | Altered currency/range |

## Preferences (targets → honest notes)
| Displayed | Source | Helper | Engine | Meaning | Allowed | Forbidden |
|---|---|---|---|---|---|---|
| "{OS} — Prefer" | `requirements[os-prefer]` target-B | — | `targetFit` os-prefer (genuine C effect) | Ranks matches higher | "Laptops with {OS} rank higher." | "Only {OS} shown" |
| "16 GB RAM — Prefer" (+storage/weight/vram/refresh/battery) | corresponding target-A reqs | — | `missedPreferredFor` only (flag, zero score change) | Explanation-only flag | "We'll flag picks that fall short." | "boost", "rank higher", "score higher" |
| gpu-target / displaySize-target | present in profile | DROPPED (cited triple-ignore) | NO reader (hard/targetFit/missedPreferred all skip) | Fully inert | (not shown) | Any display implying effect |

## Fixed vs relaxable
| Displayed | Source | Rule (mirrors `intentHardBlocks` engine.ts:367-378) |
|---|---|---|
| "We won't loosen": os hard, refurb hard, budget-with-numeric-min | profile hards | exact predicate mirror; informational only |
| "May be adjusted": remaining hards in RELAX_OPS order (engine.ts:101-143) | profile hards | only present ids; budget steps +10%/+25% stated (verified); generic honest framing |

## Contradictions / notes
| Displayed | Source | Engine |
|---|---|---|
| macOS string verbatim | `buildRequirements().contradictions[macOS]` (requirements.ts:116-128) | OS kept, GPU preferred — helpful, never "impossible" |
| "X from your workload is treated as a preference…" | demotion case (requirements.ts:108-111) | workloads never harden |
| All-Occasional plain note | `notes` occasional case (:85-87) | treated as Secondary |
| Proposal-override notes | SKIPPED (internal mechanics) | — |
