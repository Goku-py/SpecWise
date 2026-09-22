# Phase 2 Recommendation — Read-Only Security Review

Scope: questionnaire validation, Zod boundaries, numeric bounds, oversized payloads, scoring inputs, prototype injection, localStorage trust, API abuse, leakage, region/price. No code changed.

## 1. Unbounded strings at Zod boundaries — VERIFIED
Evidence: `questionnaire.ts:48-49,59-63` (`useCase/region/legacyCpuBrand/legacyOsRaw/legacyGaming: z.string()` no max); `validation.ts:75,95,97` (`region`, `ports/security: z.array(z.string())` element length unbounded).
Impact: oversized strings flow into profile/ledger/DB (`route.ts:50-52` lead upsert) and cache keys; CPU/memory waste, ledger bloat. No SQLi (Prisma parameterized).
Fix: `.max()` on all strings (e.g. region 8, brand/model 64), enum for `useCase` in canonical schema.

## 2. Unbounded numerics in canonical schema — VERIFIED
Evidence: `questionnaire.ts:65-66` (`legacyMinRamExact/legacyMinStorageExact: z.number()` — no min/max/finite); cf. `validation.ts:59` correctly clamps `0..10_000_000`.
Impact: `profile.ts:32-37` `Math.max(band, exact)` trusts huge/negative/NaN floors; NaN propagates to `hardFailures` comparisons (always false) — fail-open filtering, not RCE.
Fix: reuse clamped `nullableNumber()`; add `.finite()`.

## 3. Malformed/oversized payloads, no body limit — VERIFIED
Evidence: `route.ts:22-33` (`request.json()` no size cap; `safeParse` non-strict strips unknown keys, `displayQuality.max(3)` but no per-element cap); `CanonicalAnswersSchema.screen.max(2)` OK.
Impact: large JSON (MBs of `ports`/`security`/unknown keys pre-strip) costs CPU per request; 60/min/IP amplifies. Availability only.
Fix: `export const maxBodySize` / reverse-proxy limit; `.strict()` or key-count cap; per-string `.max()`.

## 4. Spoofable rate-limit identity — VERIFIED
Evidence: `rate-limit.ts:14-19` trusts `x-forwarded-for[0]`; `route.ts:13-14` `60/min/IP`; fallback Map sweep only every 100th insert.
Impact: attacker behind same infra rotates header to bypass limit; email-send path (`route.ts:47-56`) enables lead-spam/cost abuse. DB-backed counter itself is parameterized (`$1,$2`).
Fix: trust proxy IP only from platform (`x-real-ip`/framework `ip`), add email-scoped limit + captcha.

## 5. Region cache-key collision — VERIFIED
Evidence: `catalog-cache.ts:31-38` `unstable_cache(fetchActiveCatalog, ["active-laptops-catalog"])` — static key ignores `region` arg.
Impact: first-region result reused for other regions; wrong-region prices/retailers served. Correctness/integrity, not injection. Also `toScorable:107-126` defaults `price 0/currency USD/region param` when row missing (engine quarantines via `priceMissing` — good).
Fix: include region in cache key (`["active-laptops-catalog", region]`); validate region against allowlist.

## 6. localStorage trusted without schema — VERIFIED
Evidence: `results-view.tsx:53-62,79,87` `JSON.parse` + cast to `QuizAnswers`/`RecommendedLaptop[]`, no Zod check; tampered `region/useCase/matchScore/scoringMeta` reused for `fetchRecommendations` and `weightsForUseCase`.
Impact: self-only: NaN/garbage scores (`decomposition.ts:99-112` `meta.weights[d] ?? 0`, no finite check; `NaN` survives `Math.max/min` clamp), misleading rank/labels. No server trust — refetch revalidates via `QuizAnswersSchema`.
Fix: `safeParse` stored answers; ignore/validate `scoringMeta` numerics (`Number.isFinite`, clamp), fallback to refetch on failure.

## 7. Slider overlay inputs unvalidated — RISK
Evidence: `decomposition.ts:150-159` (`slider[d] ?? 0`, `valueWeight=0.12` caller-controlled); `engine.ts:373-375` (`sum || 1`, no finite/negative check); `results-view.tsx:111-116` guards `wTotal===0` only.
Impact: client-only ranking distortion (negative/NaN weights); score stays clamped `0..1`. No server effect. Hypothetical only — sliders are UI-bounded.
Fix: clamp each weight `0..N`, reject non-finite, keep "Adjusted view" label (already present).

## 8. Prototype/object injection — NOT APPLICABLE
Evidence: spreads/casts of parsed JSON (`results-view.tsx:68,79`; `decomposition.ts:108`) create own props, never assign `__proto__`; `Object.keys(weights/caps)` (`profile.ts:50-51`, `scoring.ts:72`, `engine.ts:181`) iterate fixed `Dim9` maps; `Object.fromEntries(DIMS_9.map(...))` fixed keys.
Impact: none found. Do not add bespoke sanitizers.
Watch: only if future code does `obj[userKey]=` or deep-merge — use `Map`/allowlist then.

## 9. Explanation/ledger leakage — VERIFIED (low)
Evidence: `route.ts:59` returns full `results` incl. `scoringMeta{cap,weights,penalties,bonuses}`, `explanation{why/strengths/whyAbove}`, `relaxationLedger` (`scoring.ts:111-127`).
Impact: exposes tuning internals (weights, thresholds, versions) aiding gaming of rank; no PII/secrets observed. Acceptable for transparency; note in threat model.
Fix: keep as-is or add `?debug=` gate for `scoringMeta`; never include emails/internal notes (currently clean).

## 10. XSS/CSRF/SSRF/secrets — NOT APPLICABLE
Evidence: no `dangerouslySetInnerHTML` in reviewed view; brand/model flow through React escaping; quiz POST has no auth/cookies → CSRF N/A; no server-side fetch of user URLs (retailer URLs from DB only); no secret values in files.
Impact: none found. Email path logs errors server-side only (`route.ts:52-56`).

## 11. Region/price unsafe assumptions — RISK
Evidence: `profile.ts:64`/`engine.ts:57-61` `osMatch`/region are plain string compares; `os: linux` maps to linux|windows legacy-compat; unknown regions yield empty price rows → `priceMissing` lane (max 3, never top-3 — `engine.ts:350-352`).
Impact: typo'd region degrades to price-unknown lane, not crash. Region allowlist still recommended (see §5).
Unknown: multi-currency normalization not reviewed (out of scope files).
