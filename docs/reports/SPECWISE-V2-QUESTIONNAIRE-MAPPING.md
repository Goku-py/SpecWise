# SPECWISE V2 — QUESTIONNAIRE MAPPING MATRIX (Phase 2, as implemented)

> Columns: Question → Answer → Store field → Transformation → Requirement →
> Hard/Target (+class, importance) → Engine consumer → Verified effect.
> File refs: `src/components/quiz/V3Quiz.tsx` (V3), `src/store/useV3QuizStore.ts` (S),
> `src/lib/recommend/v3/{requirements,scoring,engine}.ts` (R/E).

| Question | Answer | Store field | Transformation (S) | Requirement | Hard/Target | Engine consumer | Verified effect |
|---|---|---|---|---|---|---|---|
| Q1 workload card | dev/gaming/ai-ml/video-photo/cad-3d/study-office toggle | `workloads[] {id,importance,subprofile}` | first=primary, rest=secondary; gaming→both, dev→standard; deselect prunes dependents (NEW) | — (weights + proposals server-side) | — | E:`weightsForProfile`/`blendWorkloadWeights`; R:`workloadProposals` | W blend (inf 1.0/0.6/0.25) + Type-A proposal seeds |
| Q1 importance | Primary/Secondary/Occasional | `workloads[].importance` | `setImportance` | — | — | E:blend via INFLUENCE | Changes W vector |
| Q1 gaming subtype | esports/aaa/both | `workloads[gaming].subprofile` | `setGamingSubtype` | — | — | R:`workloadKeyFor` → vector row + proposals | gaming-esports/-aaa/-both weights; refresh/vram targets |
| Q2 region | US/IN/GB/DE/CA/AU | `region/currency/budget.currency` | `setRegion` + cookie write-through | — (catalog scope) | — | `getActiveCatalog(region)`; sticky incl. reset (NEW) | Region pool + currency; unknown→400 |
| Q2 budget | min/max/noMax | `budget.*` + `requirements[budget]` | `setBudget`; NEW `budgetRangeError` blocks min>max | budget | hard, imp2 | E:`hardFailures` budgetMin/Max; RELAX max-only | Filter; missing price fails both |
| Q3 priority | ≤2 of speed/battery/carry/screen/build/value | `priorities[]` | `togglePriority`; UI prevents 3rd (NEW notice) | — | — | E:`applyPriorities`; `capsContextFor`; Final blend flag (value) | W shifts + renormalize; carry/screen caps; carry→weight gate |
| Q4 RAM value+kind | 16/32/64 + NoPref/Prefer/Must | `requirements[ram]` | `setRam` (unchanged) | ram | target-A imp2 / hard min+target imp2 | E:`missedPreferred` (Prefer) / `hardFailures` minRam + lowerRam relax (Must) | Prefer = flag only, zero score change; Must = filter |
| Q4 storage value+kind | 512/1024/2048 + tri-state | `requirements[storage]` | `setStorage` | storage | target-A imp2 / hard imp2 | same pattern (lowerStorage bands) | same as RAM |
| Q4 OS value+kind | win/mac/linux/chrome + tri-state | `requirements[os\|os-prefer]` | `setOs` | os / os-prefer | hard imp2 / target-B imp2 | E:`hardFailures` (Must, NEVER relaxed) / E:`targetFit` os-prefer (Prefer) | Must = strict permanent filter; Prefer = genuine C effect |
| Q4 GPU | No pref / Must dedicated (NO Prefer offered) | `requirements[gpu]` | `setGpu` (prefer path retained, no button) | gpu | hard imp2 | E:`hardFailures` gpuDedicated + relax→preferred | Must = filter (relaxable); Prefer = INERT (CANNOT REPRESENT, §16) |
| Q4 weight | ≤1.3/1.5/1.8/2.0 + tri-state | `requirements[weight]` | `setWeight` | weight | target-A imp2 / hard imp2 | E:`missedPreferred` / `hardFailures` maxWeight + relax | Prefer = flag only; Must = filter |
| Adv dev intensity | Standard / VMs-containers-builds | `workloads[dev].subprofile` | `setDevHeavy` | — | — | R: dev-standard vs dev-heavy row + proposals | W + ram/storage proposal seeds |
| Adv CPU cores | 4/6/8/12/16 (toggle) | `requirements[cpu-cores]` | `upsert` hard / remove | cpu-cores | hard imp2 | E:`hardFailures` minCores + relax | Strict filter |
| Adv VRAM + kind | 6/8/12/16 + Prefer/Must | `requirements[vram]` | `upsert` target-A imp3 / hard imp2 | vram | target-A imp3 / hard imp2 | E:`missedPreferred` / `hardFailures` minVRAM + relax | Prefer = flag only; Must = filter |
| Adv display size | 13–17 (toggle, NO Prefer) | `requirements[displaySize]` | `upsert` hard / remove | displaySize | hard imp2 | E:`hardFailures` minSize + RELAX_OPS | Strict filter (relaxable); target path SILENT (not offered) |
| Adv refresh | 60/120/144/240 (toggle) | `requirements[refresh]` | `upsert` target-A imp2 / remove | refresh | target-A imp2 | E:`missedPreferred` | Flag only; no filter from UI |
| Adv battery | 6/8/10/12h (toggle) | `requirements[battery]` | `numTarget` target-A imp2 / remove | battery | target-A imp2 | E:`missedPreferred` | Flag only; no filter from UI |
| Adv ports | multi of 7 | `requirements[ports]` | `setPorts` (always hard) | ports | hard imp2 | E:`hardFailures` subset + relax (drop-last) | Strict all-must-match filter |
| Adv upgrade | ram/storage flags | `requirements[upgrade]` | `upsert` hard / remove | upgrade | hard imp2 | E:`hardFailures` bools + relax | Strict filter |
| Adv condition | Accept refurb / New only | `requirements[refurb]` | `setRefurbNewOnly` | refurb | hard imp2 | E:`hardFailures` newOnly, NEVER relaxed | Strict permanent filter |

Gates (UI-only, engine-neutral): gpuRelevant = gaming∨ai-ml∨cad-3d∨video-photo (unchanged);
weightRelevant = carry∨study-office (WIDENED, Phase 1 direction). Pruning on deselect: gpu/vram/refresh/
displaySize/battery/cpu-cores/ports/upgrade/weight dropped when gate/section lost; never
ram/storage/os/os-prefer/budget/refurb. No new ids/kinds/classes/importance. Engine files: zero diff.
