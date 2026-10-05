# SPECWISE V2 — PHASE 2 QUESTIONNAIRE (as implemented)

> Status: IMPLEMENTED. Files changed: `src/components/quiz/V3Quiz.tsx`,
> `src/store/useV3QuizStore.ts`. Created: `src/store/__tests__/useV3QuizStore.phase2.test.ts`.
> Engine untouched (verified: `git diff --stat` shows only the two files).
> Companion matrix: `SPECWISE-V2-QUESTIONNAIRE-MAPPING.md`.

## 1. Final Quick questionnaire (frozen "Step N of 4", denominator never changes)

### Q1 — Workload — "What will you mainly use this laptop for?"
Multi-select cards (ids unchanged: dev/gaming/ai-ml/video-photo/cad-3d/study-office), human copy:
Coding & software / Gaming / AI & machine learning / Video & photo editing / 3D & design work /
Study, work & everyday use (each with plain-language subline, no spec terms in titles).
Importance radios (Primary/Secondary/Occasional, values 1.0/0.6/0.25 unchanged) appear only when >1
selected + hint "Primary counts most, Occasional least." Gaming subtype conditional with reason line:
"Competitive & fast (high refresh)"=esports / "Story & visuals (AAA)"=aaa / "A bit of both"=both.
Next blocked until ≥1 workload (unchanged gate).

### Q2 — Budget — "What can you spend?"
Region select (unchanged 6 regions, write-through cookie) + Min/Max + No-maximum. NEW client validation
(`budgetRangeError(min,max,noMax)`, exported from store): min>max (with max set, noMax off) → inline
`role="alert"` error "Minimum (X) is above maximum (Y) — swap them or clear one.", Next AND submit
blocked. Server min≤max schema unchanged (defense in depth). Grid stacks single-column at 360px
(`grid-cols-1` base → `sm:grid-cols-[9rem_9rem_auto]`).

### Q3 — Priorities — "What matters most?"
"Pick up to two. … You can skip this — your workload already gives us a sensible starting point."
Ids + weight increments unchanged. UI PREVENTS a third pick: third click is ignored with aria-live notice
"Pick up to two — remove one to change your picks." (Store `.slice(0,2)` remains as safety net only.)

### Q4 — Must-haves — "Any must-haves?" / "Only answer what you care about — leave the rest on No preference."
"Only show" wording fully removed. Per-item tri-state segmented radiogroups
(No preference / Prefer / Must-have) + value chips:
- RAM "How much memory (RAM)?" [16/32/64 GB] — "More memory keeps lots of apps and tabs running smoothly."
- Storage "How much storage space?" [512 GB/1 TB/2 TB] — "Room for apps, photos, video and files."
- OS "Which operating system?" [Windows/macOS/Linux/ChromeOS] — "Only Apple laptops run macOS."
- Graphics (conditional, gpuRelevant unchanged): "How important is graphics power?" — two-state only
  (No preference / Must-have dedicated GPU); NO Prefer offered (gpu-prefer is engine-inert — §16).
- Weight (conditional, widened gate — §5): "How light should it be?" [≤1.3/1.5/1.8/2.0 kg], full tri-state.
Prefer microcopy (honest per engine): RAM/Storage/Weight "Prefer — we'll flag picks that fall short in
your results." (missedPreferred-verified); OS "Prefer — laptops with your system rank higher."
(Type-B-verified). Must-have: "Only matching laptops are shown." (+ OS/refurb: "never loosened" —
os/refurb/budget-min never relax, engine-verified).

## 2. Final Advanced questionnaire (separate optional mode, never "Step 5")
Interstitial on last Quick step: [SEE MY MATCHES] + [Refine further]. Advanced header:
"Fine-tune your match (optional)" / "Skip anytime — Quick already gives you a strong profile. These
details only appear because of your workloads." Progress frozen (`value=4 max=4`, never "5/5").
Footer: [Back to questions] (→ step 3, answers + advancedOpen kept) + [See my matches].
Workload-gated via existing `advancedSectionsFor` (unchanged). Controls, reworded to Strict-filter vs
Preference language (no HARD/targetClass leakage): CPU cores hard-only toggle; VRAM Prefer/Must flip;
display size hard-only minimum (no Prefer — target displaySize is engine-silent, §16); refresh + battery
preference-only ("we'll flag picks that fall short"); ports strict all-must-match; upgrade hard flags;
condition Accept refurbished / New only ("New only is never loosened."); dev intensity unchanged.

## 3–6. Exact wording / choices / conditionals / reason lines
See §1–2 above (verbatim). Conditional rules: gaming subtype (gaming selected); GPU block
(gpuRelevant = gaming|ai-ml|cad-3d|video-photo); weight block (carry priority OR study-office selected —
UI-only widening, engine-neutral); Advanced sections (matrix, unchanged); importance radios (>1 workload).
Reason lines: GPU "Your workload can benefit from a dedicated graphics card, so we're asking.";
weight-carry "You said portability matters, so we're checking how heavy a laptop you're comfortable
carrying."; weight-study "Study and work laptops move around a lot — how light should yours be?";
gaming "Different games lean on different strengths."

## 7–8. State + CanonicalProfile mapping
Unchanged mutators; full control-by-control matrix in `SPECWISE-V2-QUESTIONNAIRE-MAPPING.md`.
New: `budgetRangeError` export; `reset()` preserves region (`emptyProfile(current region)`);
prune-on-deselect in `toggleWorkload`/`togglePriority` (drops gpu/vram/refresh/displaySize/battery/
cpu-cores/ports/upgrade/weight reqs when their section/gate disappears; never ram/storage/os/os-prefer/
budget/refurb). No new requirement ids, kinds, classes, or importance values.

## 9. Preference semantics (honest)
OS-Prefer = genuine ranking consideration. RAM/Storage/Weight/VRAM/Refresh/Battery-Prefer =
explanation-only (missedPreferred flags, zero score change) — copy says "flag", never "boost".
GPU-Prefer and displaySize-Prefer NOT OFFERED (inert — §16). All Must-haves = hard filters;
OS/refurb/budget-min never relaxed (copy states it).

## 10. Validation behavior
Client: workload-nonempty gate (Q1), min≤max range (Q2, blocks Next + submit), max-2 priorities (Q3,
third prevented with notice). Server `CanonicalProfileSchema` unchanged and authoritative; submit surfaces
`error` in `role="alert"`.

## 11. Persistence behavior
Unchanged systems only: localStorage v2 envelopes (`specwise-v3-results/profile`), `?s=` share-in
(incl. legacy `?workload=`→empty fail-safe), refine hydration with revalidation, sticky region now
survives reset/revisit (defect fixed).

## 12. Navigation behavior
Back preserves answers (same profile object). Deselecting workloads/priorities prunes dependent
requirements (§7–8) — no stale reqs. Last-Quick interstitial (matches OR refine). Advanced back → Q4
with everything intact. Step-0 Back = Start over (region kept).

## 13. Accessibility behavior
Preserved + improved: button semantics everywhere, aria-pressed tri-states/radiogroups,
fieldset/legend groups, reason lines as plain text, inline errors `role="alert"` + priority notice
aria-live, frozen screen-reader progress ("Step N of 4" / "Fine-tuning · optional"), visible focus rings
kept, 0.22s slide kept (reduced-motion plumbing untouched), no color-alone semantics (selected states use
border + label text).

## 14. Responsive behavior
Verified by construction (code-level): budget single-column base; workload 1→2 col; priorities 1→2 col;
tri-state segments wrap; no fixed-width rows added; progress/footer `justify-between` with two-button max.
Device-lab pass (360/390/768/1024/1440) NOT executed — recorded in §17; no overflow introduced by layout
choice (all rows flex-wrap).

## 15. Test scenarios (profiles A–F, code-verified)
- A gamer (gaming+esports, GPU must, refresh pref): conditionals visible; hard gpu + target refresh emitted.
- B developer (dev+heavy via Advanced, RAM/storage): dev-heavy subprofile only in Advanced (Quick stays standard); ram/storage Prefer/Must map correctly.
- C AI/ML (gpu must, VRAM pref/must, RAM/storage): full matrix path; vram flip target↔hard verified in UI logic.
- D college (study-office, battery pref, weight cap, budget): weight block now visible WITHOUT carry (gate fix); battery target-only.
- E mixed (dev+gaming+study): importance radios; gpu + weight + dev-Advanced sections co-visible; deselecting gaming prunes gpu req.
- F constraint-heavy (OS must + RAM/storage must + weight must + new-only): all hards emitted; OS/refurb never-relax copy shown.
Endpoint contract: profile shape/schema unchanged → `POST /api/quiz` receives identical contract. Engine behavior deliberately unaltered (no test needed to prove a negative; diff proves it).

## 16. Unsupported / cannot-represent items
1. **GPU-Prefer offered in UI — CANNOT REPRESENT.** `gpu` target without targetClass is consumed by no engine reader (hardStateFrom: hards only; targetFit: Type-B only; missedPreferredFor: no gpu branch). UI offers No preference / Must-have only; `setGpu("prefer")` remains in store/contract for compatibility (incl. existing cutover test) but has no button. Code-commented.
2. **displaySize-Prefer — CANNOT REPRESENT (silent).** Same triple-skip (no hard/targetFit/missedPreferred branch). Advanced display-size is hard-minimum-or-nothing; hard IS engine-supported (minSize + RELAX_OPS entry), so no semantics invented. Code-commented.
3. **Interactive what-if re-ranking — CANNOT REPRESENT.** No re-score endpoint; out of Phase 2 scope (Phase 5).
4. **Weight-cap trigger for non-carry, non-study users — limited.** Gate widened carry→carry∨study-office (UI-only). Users with neither see no weight control; Advanced has no weight editor (dead `weight` key verified in Phase 0). Documented, not worked around.
5. **`submitted` flag semantics — PARTIAL (unchanged).** Set on success, no consumer; left as-is.

## 17. Known limitations
- Device-lab responsive pass not executed (layout designed mobile-first; record for Phase 10 QA).
- `npm run build` not run (needs DB-adjacent env; typecheck + tests + lint cover the change surface).
- API/E2E suites not run (need `npm run dev` server + seeded DB; contract unchanged so risk is minimal).
- Refresh/battery hard-read branches left in AdvancedPanel (share-link hydration can carry hard reqs) — dead for UI-created profiles, harmless.
- Legacy `quickToProfile` builder untouched (no live caller in submit path; share/test construction only).
