# SPECWISE V2 — HOMEPAGE TRACEABILITY (Phase 6, as implemented)

> Columns: USER-FACING ELEMENT → SOURCE → REAL / DEMO → DESTINATION → SUPPORTED CLAIM.
> Forbidden claims (best-on-market, guarantees, future-proof, accuracy superlatives) appear nowhere.

| Element | Source | Real/Demo | Destination | Supported claim |
|---|---|---|---|---|
| H1 "Stop shopping by specs…" + lede | New copy (`hero.tsx`) | Positioning (not a data claim) | — | Product promise; no metric asserted |
| [Find My Laptop] (hero + final) | Existing route | Real | `/quiz` | Starts the single quiz→engine path |
| "Browse laptops →" (hero + final) | Existing route | Real | `/laptops` | Stateless browse, subordinate |
| Microline "Quick match · About 2 minutes · No account" | Copy (hedged "About") | Stated expectation | — | No exact-time or account claim |
| Hero 3D visual + "Illustrative, not a recommendation" | Existing `HeroLaptopWrapper` (untouched) | Illustration (labeled) | — | Never implies real model/catalog knowledge |
| DEMO proof card (92, Closest match, 2 strengths + trade-off, 3 bars) | Hardcoded fixture (`sample-proof.tsx`, exported constants) | DEMO (badged + captioned) | — | Shape of output only; no names/prices/regions |
| Bars "Workload fit / Requirements fit / Value" | Static widths 92/88/81, aria-hidden + sr-only | DEMO | — | No W/C/V jargon exposed |
| How-it-works 01/02/03 + 2-min line | New copy (`how-it-works.tsx`) | Process description | — | Matches shipped quiz→interpret→results flow |
| 6 workload cards, one "Start match →" each | `WORKLOAD_PREFILL_META` + `buildWorkloadPrefillPath` | Real (same CanonicalProfile path) | `/quiz?s=…` (validated prefill) | Same engine, no second path (test-verified) |
| Trust: never-sold rankings | Engine fact (no affiliate input in scoring) | Real property | — | "The matcher never sees them" kept as verifiable |
| Trust: explained ranking | Engine payload (strengths/compromises/conflicts) | Real property | — | Visible on results (Phases 3–5) |
| Trust: live counts "{n} machines · {n} price points · {n} regions" | `getCatalogStats` (server, verbatim) | REAL | — | Rendered as-is, including 0-state |
| Trust: zero-state growing-catalog line | `honestLimitsCopy(0)` branch | REAL (count-driven) | — | No fake depth; matching runs on live catalog |
| Nav Recommend / Browse / About | Existing routes | Real | `/quiz`, `/laptops`, `/about` | All destinations verified to exist |
| Footer affiliate disclosure | Existing footer (untouched) | Real | — | One-line commission disclosure retained |
