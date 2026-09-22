# SpecWise 2.0 — Product Definition

Source: `docs/specwise-2/CURRENT-STATE.md`. Spec-only; no code changed.

## 1. Problem
Buyers choose by workload ("code, game, study, travel") but the market sells by 40+ jargon specs. Current pipeline (`QuizFlow → POST /api/quiz → filter+relax → F-score → top 12`) proves the concept but leaks jargon, collects dead inputs, and runs three disagreeing rankers.

**Exact problem:** given my work + max budget + hard nos, give me 3–12 buyable laptops in my region with why-this-not-that — no spec homework.

## 2. Users
- **Primary:** workload buyer (student / office / coder / gamer / creative / traveler) overwhelmed by spec sheets. Modeled by intent, not demographics.
- **Secondary:** (a) validators comparing 2–3 finalists; (b) browsers via `/laptops`, `/category`, detail; (c) admin/catalog ops.

## 3. Job-to-be-done
Decide confidently with minimum steps: describe work → set budget ceiling + hard nos → get ranked, priced, explained shortlist → verify → buy externally.

## 4. Why shopping is hard
40-col schema; uncalibrated heuristic weights (α=0.5, PRIORITIES unevidenced); silent relaxations (macOS+dgpu); price=0 passing budget; unlabeled FX estimates; missing TGP/thermals/measured-nits/keyboard/serviceability/availability; ±4% seed variance × 6 regions.

## 5. Know vs don't-know
**Know:** workload in plain words; max budget (local currency); OS lock; carry/battery pain; size/weight feel.
**Don't know:** RAM/SSD floors, cores vs benchmark, iGPU vs VRAM, P3/Delta-E/OLED/120Hz/400nit, TGP/F-score, ports/security/upgradeability implications.
**Translate automatically:** Q4 carry→weight bands; Q5 battery-vs-power→gates+weights; Q6 tabs→RAM floor; Q7 storage→GB floor; Q8 screen picks→panel/refresh/gamut/touch.
**Never force:** cpuBrand, raw GB numbers, OLED/refresh/nits/P3/TGP, upgradeability, security, webcam, displaySize-inches, gaming-value, email. Only `useCase` required (preserves current Zod contract).

## 6. Trust
Open versioned methodology; live DB counts + `pricesCapturedAt` (kill hardcoded BUILD/56); honest monetisation (fix zero-bias vs affiliate dissonance, keep disclosure); region-filtered prices + validity + estimate labels; ONE deterministic ranker + tie-break; price-unknown quarantined, never top-ranked; relaxation ledger shown; contradiction warnings; slug-308 + canonical + noindex shells.

## 7. Differentiation
- vs catalogs/retailer filters: workload-first, not spec filters.
- vs review/benchmark sites/listicles: personalized ranked shortlist with per-user why-not-that, not static picks.
- vs AI chatbots: deterministic, reproducible, region-priced, sourced to catalog snapshot — LLM never ranks.

## Core principle
**Workload-first, jargon-never-required.** Every asked input must change rank, filter, or explanation — else removed. Every score explainable in one line.
