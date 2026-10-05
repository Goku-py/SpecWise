# SPECWISE V2 — QUIZ AUDIT (Phase 0 satellite)

> Read-only. Files: `app/quiz/page.tsx` (`QuizPage`), `components/quiz/V3Quiz.tsx` (`V3Quiz`, `MustPreferBlock`,
> `AdvancedPanel`, `Chip`), `store/useV3QuizStore.ts` (`useV3QuizStore`, `QUICK_STEPS`, `emptyProfile`),
> `lib/recommend/v3/quiz.ts` (`QuickAnswers`, `ADVANCED_MATRIX`, `advancedSectionsFor`, `quickToProfile`),
> `lib/recommend/v3/validate.ts` (`CanonicalProfileSchema`), `lib/recommend/v3/types.ts`
> (`CanonicalProfile`, `Q3Pick`, `Requirement`), `lib/storage.ts`, `lib/share.ts`, `lib/regions.ts`.

## 1. Structure

`QUICK_STEPS = ["Workload","Budget","Priorities","Must-haves"]` — 4 Quick + 1 conditional Advanced (index 4, only
when `advancedOpen`; `totalSteps` 4→5 mid-flow). Progress: `nav[aria-label="Quiz progress"]` + `Progress value max`
+ `AnimatePresence` slide ±24px/0.22s. Entry: `Advanced refine` (last Quick step) / `Skip to Advanced` (any step when
open). Submit: `POST /api/quiz {schemaVersion:"v3",profile}` → writes `specwise-v3-results` + `specwise-v3-profile`
(v2 envelopes) → `router.push("/results")`; error → `p[role="alert"]`; loading `SCORING…`. Mount: `?s=` share-profile
else revalidated stored profile. `reset()` (Back on step 0 = "Start over") drops region to US. `submitted` flag set,
never read (PARTIAL).

## 2. Questions (exact)

### Q0 — "What will you mainly use this laptop for?" / "Select all that apply. If more than one, mark each as Primary, Secondary, or Occasional."
- INPUT: multi card toggle (`aria-pressed`), 6: dev "Software development / Code, builds, dev servers. CPU + RAM
  heavy." · gaming "Gaming / Esports or AAA. GPU + refresh first." · ai-ml "AI / machine learning / Local models,
  training. GPU + VRAM." · video-photo "Video / photo / Editing, color, exports. Display + storage." ·
  cad-3d "3D / CAD / Modeling, viewports. GPU + VRAM." · study-office "Study / office / Docs, browsing, calls.
  Battery + portability."
- CONDITIONAL: importance radios only if >1 selected; gaming fieldset "Which describes your gaming?"
  (esports "Competitive high-refresh" / aaa "Story-driven AAA" / both "Both") only if gaming selected.
  Dev-intensity (Standard vs "VMs / containers / large builds") in Advanced only → Quick path always `standard`.
- STATE: `workloads[] {id,importance,subprofile}`. DEFAULT: first pick primary + subprofile gaming→both/dev→standard;
  empty `[]`. REQUIRED (only gated step: `canNext = workloads>0`). NEXT: step 1.
- AFFECTS: weights blend + workload target proposals + `ADVANCED_MATRIX` + `gpuRelevant` + category mapping.

### Q1 — "What's your budget?" / "Prices shown in your region's currency."
- INPUT: Region `<select aria-label="Region">` (US/IN/GB/DE/CA/AUD; write-through cookie + `router.refresh()`) +
  Min + Max `type=number` + No-maximum checkbox. DEFAULT: US/USD, null/null/false. OPTIONAL.
- VALIDATION: none client-side (INFERENCE: inverted min/max submits then 400s). Server: min/max 0–10M nullable +
  min≤max refine; unsupported region 400.
- STATE: `region/currency/budget.*` + derived `requirements[budget]` hard (iff min set or max set & !noMax).
- AFFECTS: hard min/max filter + catalog region scope + currency display. NEXT: step 2.

### Q2 — "What matters most?" / "Pick up to two. Skip if you're unsure — your workload already sets sensible defaults."
- INPUT: multi-toggle max 2 (silent `.slice(0,2)`): speed "Raw speed / Fastest CPU/GPU" · battery "Battery life /
  All-day unplugged" · carry "Easy to carry / Light + portable" · screen "Screen quality / Sharp, vivid panel" ·
  build "Build quality / Durable chassis" · value "Best value / Capability per money". DEFAULT `[]`. OPTIONAL.
- STATE: `priorities: Q3Pick[]`. Server: max 2.
- AFFECTS: W shifts (speed +.025 cpu/gpu; battery +.05; carry +.05 portability; screen +.05 display; build +.05;
  value = Final-blend flag only) + renormalize; carry/screen caps context; carry unlocks Q4 weight. NEXT: step 3.

### Q3 — "Any must-haves?" / "Only answer what you care about. Defaults are preferences — "Only show" makes them strict filters."
All optional, default absent = Any.
1. RAM `[16,32,64]` GB (`Any` + value + conditional `Only show`; fallback default 16 on Must-flip).
   STATE `requirements[ram]`; prefer `{target,A,imp2}` / must `{hard,min+target,imp2}`.
2. Storage `[512,1024,2048]` (labels 512 GB/1 TB/2 TB; fallback 512). Same hard/target duality, id `storage`.
3. OS `[windows,macos,linux,chromeos]` ("No requirement" clears; per-OS prefer chip + `Only show` chip; must renders
   `"${os} (must)"`, prefer `"${os} ✓"`). must→`{os,hard}` / prefer→`{os-prefer,target,B}`.
4. Graphics — CONDITIONAL on `gpuRelevant` (gaming|ai-ml|cad-3d|video-photo). Heading "Graphics (your workload can
   use a dedicated GPU)". No-preference/prefer-powerful/Only-dedicated. must→hard dedicated / prefer→target
   dedicated (**no targetClass** — verified C-neutral).
5. Maximum weight — CONDITIONAL on `carry` priority. Chips ≤1.3/1.5/1.8/2.0 kg + `Only show`. prefer `{target,A,max}` /
   must `{hard,max}`. INFERENCE: weight-cap seekers without `carry` never see this; Advanced has no weight editor.
- NEXT: Advanced (if open) else submit.

### Q4 Advanced — "Advanced refinement" / "Your Quick answers are preserved above. Only sections relevant to your workloads are shown. Controls marked HARD filter; others affect ranking."
Visibility: `ADVANCED_MATRIX`: dev→cpu/ram/storage/thermals/ports/upgrade; gaming→gpu/vram/refresh/resolution/
thermals; ai-ml→gpu/vram/ram/storage; video-photo→display/ram/storage/ports; cad-3d→gpu/vram/display-size/ram/ports;
study-office→battery/weight/display-size.
- Dev intensity (dev only): Standard / VMs-containers-builds → subprofile.
- CPU cores (has cpu): `[4,6,8,12,16]` "N+ cores" — hard-only toggle `{cpu-cores,hard,target}`.
- VRAM: `[6,8,12,16]` GB — target(A,imp3) default; `Only show` flips to hard(imp2).
- Display size: `[13,14,15,16,17]` — target-only(A,imp2), no Must UI.
- Refresh: `[60,120,144,240]` Hz — target-only, no Must UI.
- Battery: `[6,8,10,12]h` — target-only(A,imp2), no Must UI.
- Ports: `[usb-c,usb-a,hdmi,sd-card,ethernet,displayport,headphone]` multi → always-hard `target:"a+b+…"`.
- Upgradeability (dev/upgrade): ram/storage chips → hard `target:"ram[+storage]"`.
- Condition (always): "Accept refurbished" / "New only" → hard `refurb:new-only` or absent.
- Dead keys (verified, no UI block): `thermals`, `resolution`, `storage`, `ram`, `gpu`, `weight`, `display`(video-photo
  covered via display-size branch; weight key opens only battery block). `os-prefer/brand/touch/resolution/color/oled`
  ids have no quiz UI generator.

## 3. Validation / branching / persistence

- Client: only step-0 gate. Server (`CanonicalProfileSchema`): workloads 1–6; budget 0–10M + min≤max; priorities ≤2;
  requirements ≤40, closed id enum (21), hard|target, targetClass A|B, importance 1|2|3 (def 2),
  `provenance{workload|quick|advanced + reason 1–300}`.
- Branching (exhaustive): >1 workload→importance · gaming→subtype · gpuRelevant→Q4 GPU · carry→Q4 weight ·
  advancedOpen→5 steps/routes · `advancedSectionsFor`→sections · dev→intensity · step-index→NEXT-vs-submit swap.
  No Q1→Q2/Q3 gating; budget never changes options.
- State: single Zustand `CanonicalProfile` (Quick+Advanced mutate same object; "server engine is the only scorer").
  `quickToProfile` builder (PARTIAL — no live submit caller; test/share-only parity by shape-match).
- Persistence: localStorage v2 on submit; hydrate on mount; `?s=` base64url full-profile share-in
  (`parseV3ShareParams`/`buildV3SharePath`; legacy `?workload=`→null→empty, fail-safe). Answers never in URL
  otherwise. No reducer/context.

## 4. Answer → requirement mapping (22-row matrix)

USER ANSWER → store field (`useV3QuizStore` mutator) → transformation → requirement/weight/filter → scoring input:

| # | Answer | Requirement / weight | Scoring effect |
|---|---|---|---|
| 1 | Workload toggle | weights blend input + Type-A proposals | W + proposals |
| 2 | Importance P/S/O (`INFLUENCE {1.0,0.6,0.25}`; all-occasional→secondary) | weight influence; occasional demotes proposals imp1 | W |
| 3 | Gaming subtype (esports/aaa/both key) | vector row + proposals (esports refresh144/3; aaa vram8/3+refresh120/2; both 144/2+vram8/2) | W + Type-A |
| 4 | Dev intensity (Advanced) | heavy ram16/s512 vs std ram8/s256·1 | W + Type-A (Quick always std) |
| 5 | Region | catalog filter + price scope (unknown→400) | pool + `toScorable` |
| 6 | Budget min/max/noMax | `{budget,hard}` | hard min/max; relax max +10/+25 (2 steps); min NEVER |
| 7 | Priorities 0–2 | W shifts + caps context + value→Final `(.55/.20/.25)` else `(.65/.20/.15)` + carry gating | W/Caps/Final/UI |
| 8–9 | RAM/storage Any+N+Must | prefer Type-A (explanation-only; no C; no cap rescale) / must hard (`lowerRam/lowerStorage` bands) | hard filter OR `missedPreferred` |
| 10 | OS prefer/must | must hard (never relaxed) / os-prefer Type-B | hard OR real C term |
| 11 | GPU prefer/must | must hard (relax→preferred, clears minVRAM) / prefer C-neutral (no class) | hard OR none |
| 12 | Weight cap | must hard (null fails; ceiling→any relax) / prefer Type-A | hard OR `missedPreferred` |
| 13 | Adv CPU cores | always-hard `minCores` | filter; relax→any |
| 14 | Adv VRAM | target(A,3) default; must(hard,2); unlisted VRAM fails hard | target→`missedPreferred`; hard→filter |
| 15–17 | Adv size/refresh/battery | target-only (hard reader exists, no UI emitter) | refresh/battery→`missedPreferred`; size fully silent |
| 18 | Adv ports | always-hard all-match | filter; drop-last relax |
| 19 | Adv upgrade | always-hard bools | filter; relax→false |
| 20 | Adv refurb | hard new-only or absent (never relaxed) | filter |
| 21 | Workload proposals (ai-ml vram8/3+gpu/3+ram16; gaming variants; dev; video s512+`color-prefer`; cad vram6+size15; study batt10) | all Type-A, never hard; user-hard suppresses + notes | explanation seeds only (`color-prefer` short=0 hardcoded) |
| 22 | `quickToProfile` builder fields | same shapes as store path | same (test/share-only) |

Absent/Any/skipped = requirement absent (never null-penalty); no-B-targets → C=1; budget absent = no price filter.
Nothing was untraceable; display-size-prefer is verified no-effect (not "unverified").
