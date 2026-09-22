# SpecWise 2.0 — Decisions (resolved Phase 1)

1. One authoritative ranker; slider re-rank becomes labeled "Adjusted view", never overwrites stored score.
2. Single 9-question bank (Quick Q1–Q5, Advanced +Q6–Q9); only `useCase` required; dead inputs (`displaySize, webcam, security, gaming-value, upgradeability-value, cpuBrand`) killed or merged.
3. priceUnknown quarantined (max-3 lane, labeled), never top-ranked; `value` dim scores 0 for unknown.
4. Deterministic tie-break: score desc → price asc → weight asc → createdAt asc → id asc.
5. Relaxation ordered + ledgered + consented; budget/os protected; max 3 steps; no-result card after.
6. Preference/capability dims fixed at 9 (cpu,gpu,ram,storage,battery,portability,display,build,value); unsupported dims excluded from vector.
7. Weights versioned (`weights.vX.json`, AHP + golden-fixture fit); rubric bands versioned; fixture-diff review required.
8. Explanations derived from C-scores + ledger only; fixed schema (why/strengths/compromises/satisfied/missed/whyAbove).
9. Shareable `/r/[id]` + `/compare/[id]` (CSPRNG, no PII); localStorage keys preserved as compat fallback.
10. `/results`, `/compare`, `?q=`, `?ids=` noindex + out of sitemap; canonical + OG images required.
11. Region-consistent offers (UI region = JSON-LD region); real availability; visible dates.
12. Dark-only design; 44px targets; labeled inputs; `role=alert`/`aria-live`; motion-safe.
13. No LLM ranking. No light mode in Phase 1.
