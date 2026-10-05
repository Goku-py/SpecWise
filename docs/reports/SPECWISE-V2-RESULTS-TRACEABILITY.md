# SPECWISE V2 — RESULTS TRACEABILITY (Phase 4)

> For every visible result statement: USER-FACING ELEMENT → DTO FIELD →
> TRANSFORMATION → ALLOWED CLAIM → FORBIDDEN CLAIM.
> Helpers live in `src/lib/results-presentation.ts`. Evidence strings are never paraphrased.

| Element | DTO field | Transformation | Allowed claim | Forbidden claim |
|---|---|---|---|---|
| Hero eyebrow | `items.length` | `Best match · #1 of N` | Rank position | "Top-rated laptop" |
| Hero H2 | `brand, model` | concatenation | Model identity | Any superlative |
| Verdict sentence | `confidence` tier | `verdictFor()` tier map | "closest match / strong alternative / closest available option, with caveats" | "Best laptop", "Perfect match", "Guaranteed", "Best for everyone" |
| Donut number | `scores.overall` | `FScoreMeter` verbatim | The score | Any meaning beyond fit score |
| W bar | `scores.W` | 0–100 bar + numeral, label "Workload" | "Workload 96" | Explaining the formula |
| C bar | `scores.C` | bar + numeral, label "Fit" | "Fit 88" | "88% compatible" |
| V bar | `scores.V` | bar + numeral, or OMITTED + footnote when null | "Value 91" / "Value omitted — no price data" | V as zero; "zero value"; "poor value" from null |
| Confidence badge | `confidence, confidenceFactors[0:4], dataCompleteness` | `tierLabel()` + verbatim factors | "Best fit / Strong alternative / Partial fit" + factors | "Will definitely work", "Guaranteed" |
| Price line | `price, currency, priceStale` | `formatPriceShort()` + " (stale)" tag | Price or "Price unavailable" | Phantom precision; hiding staleness |
| Strength row | `strengths[i].{dim,evidence}` | dim→`DIM_LABELS`, evidence VERBATIM | Sentence supported by evidence | "Exceptional thermals" or any adjective beyond data |
| Compromise row | `compromises[i]` (dim id) | dim→label | "Gives up: {label}" | Omitting because score is high |
| Missed-preference row | `missedPreferred[i].{id,required,actual}` | "You wanted {required}. This laptop has {actual}." | Only rows present in payload | Inventing a missing value |
| Why-above won row | `whyAbove.won[0:2].{dim,delta}` | dim→label, `+delta.toFixed(2)` | Victory ONLY on listed dims | Wins outside won list |
| Why-above lost row | `whyAbove.lost[0:2]` | dim→label + delta | "Trails on {label}" (honesty) | Hiding losses |
| Overall gap | `top.scores.overall − second.scores.overall` | `overallGap()`, "Net +{gap}" | The arithmetic gap | "Far superior" language |
| Relaxation row | `relaxationLedger[i]` | VERBATIM `{requirement}: {from} → {to} — {reason}` | What engine reports | Predicting, rewording, inventing |
| Contradiction line | `contradictions[i]` | verbatim | What engine reports | New detection; error framing |
| More-options card | `items[n]` brand/model/overall + first strength evidence | rank + score + 1 evidence line | "Alternative #{n}" | Full-spec card; popularity ordering |
| Detail link | `laptopId` | `/laptops/${laptopId}` | "View details" | Any claim about destination content |
| Header count line | `items.length, region, currency` | "{n} laptops · {region} · {currency}" | Catalog scope of ranking | Market-wide claims |
| Empty/exhausted | `exhausted, awaitingUser, items` | kept copy, region-drift notice from profile comparison | Honest state | Manufactured recommendations |
| Share link | stored profile (NOT DTO) | `buildV3SharePath(profile)` absolute URL | "Copy answers link — recipient re-runs" | "Shareable results link" implying identical scores |

Global rules: images never rank (no image field exists) · engine order never re-sorted ·
no LLM text · every adjective traces to a DTO field (asserted in `results-mapping.test.ts`).
