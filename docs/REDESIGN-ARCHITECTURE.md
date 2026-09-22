# SpecWise Front-End Redesign — Architecture & Engineering Contracts

**Status:** Approved baseline for implementation lanes · **Date:** 2026-08-09
**Scope:** Front-end product redesign. **No changes** to `lib/scoring.ts`, `prisma/`, `src/app/api/**`, `src/app/admin/**`, `src/middleware.ts`, `src/app/actions.ts`, or any server route. The contracts below are the single source of truth engineers build from.

**Stack verified:** Next.js 16.2.10 (App Router), React 19.2.4, Tailwind v4 (CSS-first tokens in `globals.css`), TS strict. R3F v9 notes: use `ThreeElements` (no global JSX namespace), `gl` prop signature changed, disposal is deferred (`disposeOnIdle`), `invalidate()` no-ops under `frameloop="never"`.

**Design tokens:** already live in `src/app/globals.css` — both legacy names (`bg-card`, `bg-card-hover`, `border-border`, `border-border-strong`, `text-muted`, `text-text-tertiary`, `text-accent`, `text-accent-success`, `text-accent-warning`, `text-accent-danger`, `bg-secondary`, `bg-secondary-soft`, `text-foreground`, `text-background`, `bg-background`) **and** new names (`bg-surface`, `bg-elevated`, `bg-interactive`, `border-subtle`, `border-strong`, `text-secondary`, `text-tertiary`) MUST resolve. New components use the new names; old components keep legacy names until rewritten. No lane renames tokens in `globals.css` except the dark-only cleanup in the landing lane (§1.5).

---

## 0. Global invariants (all lanes)

1. **API contract unchanged.** `POST /api/quiz` accepts `QuizAnswers` (+ optional `email`) and returns `{ results: RecommendedLaptop[], total: number }` (`RecommendationsResponse` in `src/lib/api.ts`). `lib/scoring.ts` is the source of truth — never imported by UI directly, never modified.
2. **Storage keys unchanged:** `specwise-quiz-answers`, `specwise-quiz-step`, `specwise-results`, `specwise-answers`. `specwise-theme` is abandoned (design is dark-only); existing values ignored. New key: `specwise-booted` (sessionStorage, boot gate).
3. **Region flow untouched:** middleware cookie + `setRegion` action; `QuizFlow({ region })`, `ResultsView({ initialRegion })`, `CatalogView({ initialLaptops, initialRegion, initialQuery })` props unchanged.
4. **No fake functionality:** every button navigates, posts, or is removed. Ghost `[RAW BENCHMARK DATA]` button is dropped (no endpoint exists). Retailer links use `affiliateUrl ?? url`.
5. **A11y floor:** semantic HTML, keyboard nav, 2px accent focus ring, `prefers-reduced-motion` respected everywhere, a text alternative for every 3D surface, zero console errors (e2e asserts this), mechanical easing `cubic-bezier(0.2,0,0,1)`, durations 100–300ms.
6. **Bundle discipline:** `three`/`@react-three/fiber`/`@react-three/drei` may only be imported from files under `src/components/hero/**` or `src/components/three/**`, and those files are only loaded via `next/dynamic(..., { ssr: false })`. Never imported from a server component or from shared layout/ui files.

---

## 1. Target file tree + disposition

Legend: **NEW** = create · **RW** = rewrite in place · **DEL** = delete · **KEEP** = untouched · ownership lane in `[ ]`.

### src/components

```
src/components/
├── boot/
│   └── boot-sequence.tsx              [landing] NEW  — overlay, sessionStorage gate (§2.3)
├── hero/
│   ├── hero-section.tsx               [landing] NEW  — 60/40 editorial + canvas slot, SSR-safe
│   ├── hero-topology-scene.tsx        [landing] NEW  — dynamic ssr:false, Canvas mount (§2.4, §4)
│   ├── hero-static-topology.tsx       [landing] NEW  — SVG node map (reduced-motion / noscript)
│   ├── stage-pipeline.tsx             [landing] NEW  — demo panel, static HTML (text alt for 3D)
│   └── topology-scene/
│       ├── particles.tsx              [landing] NEW  — instancedMesh particle field
│       ├── nodes.tsx                  [landing] NEW  — hardware parameter nodes (CPU…SCORE)
│       ├── links.tsx                  [landing] NEW  — LineSegments connection geometry
│       └── scroll-bridge.ts           [landing] NEW  — motion useScroll → imperative store (§4.5)
├── three/
│   ├── use-scene-lane.ts              [landing] NEW  — IntersectionObserver → frameloop toggle (§4.3)
│   ├── use-reduced-motion.ts          [landing] NEW  — SSR-safe matchMedia hook
│   ├── scene-store.ts                 [landing] NEW  — mutable ref store read by useFrame
│   └── exploded-laptop.tsx            [catalog] NEW  — dynamic ssr:false procedural schematic (§2.10)
├── quiz/
│   ├── quiz-flow.tsx                  [quiz]    RW   — unified 4-step machine UI (no mode selector)
│   ├── quiz-machine.ts                [quiz]    NEW  — steps, validation, persistence, submit (§2.5)
│   ├── progress-rail.tsx              [quiz]    NEW  — "01 WORKLOAD / 02 …" rail
│   └── steps/
│       ├── step-workload.tsx          [quiz]    NEW  — 4 preset cards + "other workloads" picker
│       ├── step-constraints.tsx       [quiz]    NEW  — budget/weight/OS/RAM/SSD/Display/Battery
│       ├── step-requirements.tsx      [quiz]    NEW  — GPU/ports/security/display quality multi-selects
│       └── step-results.tsx           [quiz]    NEW  — profile summary + email + submit
├── results/
│   ├── results-grid.tsx               [results] RW   — becomes the 25/75 workspace container
│   ├── filter-panel.tsx               [results] NEW  — re-score sliders (pool-local recompute, §3.4)
│   ├── laptop-result-card.tsx         [results] NEW  — full spec rows + retailer strip + IN STOCK
│   ├── delta-breakdown.tsx            [results] NEW  — "WHY IT RANKED #1" panel (§2.9)
│   └── evidence-flow.tsx              [landing] NEW  — animated pipeline comparison (§2.11)
├── charts/                            [results] NEW  — results lane owns; others consume read-only
│   ├── radar-chart.tsx                [results] NEW  — 8-axis SVG radar, hover contribution (§2.7)
│   ├── f-score-meter.tsx              [results] NEW  — radial progress + count-up (§2.8)
│   ├── bar-list.tsx                   [results] NEW  — horizontal bars (F-score decomposition)
│   ├── price-performance.tsx          [results] NEW  — price vs matchScore curve, pool-derived (§3.5)
│   └── radial-progress.tsx            [results] NEW  — low-level circle primitive
├── filter/
│   └── slider-range.tsx               [results] RW   — dual-thumb spec (§2.6); consumes ui/range-slider
├── laptop/
│   └── exploded-panel.tsx             [catalog] NEW  — layer → spec panel (LayerFieldRow)
├── layout/
│   ├── header.tsx                     [landing] KEEP — server shell, prop wiring unchanged
│   ├── header-client.tsx              [landing] RW   — ThemeToggle out, scroll compaction, NavItem (§2.12)
│   ├── region-picker.tsx              [landing] KEEP — aria-label "Select region" stable
│   └── footer.tsx                     [landing] RW   — remove links to non-existent API routes
├── catalog/
│   ├── catalog-view.tsx               [catalog] KEEP — logic/props unchanged, cosmetic only
│   └── laptop-card.tsx                [catalog] RW   — restyle to new card system
├── product/
│   ├── detail-pricing.tsx             [catalog] RW   — cosmetic only (DetailPriceLine/PricingTable)
│   └── buy-button.tsx                 [catalog] KEEP
├── ui/
│   ├── button.tsx / card.tsx / progress.tsx / product-image.tsx / spec-card.tsx   KEEP
│   ├── terminal-box.tsx               [landing] RW   — REPURPOSED: shared terminal frame; add
│   │                                        `typeable?: boolean` (CLI-type lines). Consumers: boot,
│   │                                        hero demo panel, evidence flow. Status dots kept.
│   ├── status-badge.tsx               DEL     — unused; delete as first commit of landing lane
│   ├── weight-slider.tsx              DEL     — superseded by filter/slider-range.tsx
│   └── range-slider.tsx               [results] RW  — rewritten to SliderRangeProps; path kept for
│                                        import stability; keeps per-thumb editable number inputs
└── theme/theme-toggle.tsx             DEL     — see §1.5 removal order
```

### src/hooks

```
src/hooks/
├── use-count-up.ts        [results] NEW — rAF monotonic count-up; reduced-motion → instant
└── use-in-view.ts         [landing] NEW — IntersectionObserver wrapper (used by scene lane)
```

### src/lib additions

```
src/lib/
├── view-models.ts         [results] NEW — shared client DTOs: DimName, ResultDecomposition,
│                                        WeightedDim, RankedBreakdown, DeltaBreakdown (§2.1)
├── decomposition.ts       [results] NEW — mirrored per-dim score functions + weights (§3)
├── rescore.ts             [results] NEW — pool-local re-rank under user weights (§3.4)
├── workloads.ts           [quiz]    NEW — WorkloadPreset × 4 + workloadToAnswers (§2.2)
├── question-options.ts    [quiz]    NEW — option registries moved out of questions.ts
└── layer-specs.ts         [catalog] NEW — buildLayerSpecs(laptop) → LayerSpec[] (§2.10)
```

### Existing-file dispositions (decisions)

| File | FATE | Notes |
|---|---|---|
| `src/components/ui/status-badge.tsx` | **DEL** | unused; first commit, landing lane |
| `src/components/ui/terminal-box.tsx` | **RW** (repurpose) | keep path/name; add `typeable`; shared terminal frame |
| `src/components/ui/weight-slider.tsx` | **DEL** | replaced by `filter/slider-range.tsx` |
| `src/components/ui/range-slider.tsx` | **RW** | rewritten to SliderRangeProps (dual-thumb + live mono values + editable thumbs) |
| `src/components/theme/theme-toggle.tsx` | **DEL** | after §1.5 order, landing lane |
| `src/components/quiz/quiz-flow.tsx` | **RW** | unified 4-step flow; mode selector and per-question renderer removed |
| `src/lib/questions.ts` | **RW** | keep file. Remove `simpleQuestions`/`advancedQuestions`/`QuestionMode`/`QuizQuestion` exports; move option data to `question-options.ts`; keep `USE_CASE_LABELS` (feeds the "other workloads" picker). `QuizAnswers` field keys (`types.ts`) untouched. |
| `src/components/results/results-grid.tsx` | **RW** | 25/75 workspace container; internals replaced |
| `src/app/results/results-view.tsx` | **RW** | cosmetic alignment to §5; redirect-on-empty + region re-fetch logic untouched |
| `src/components/layout/header-client.tsx` | **RW** | ThemeToggle removal, nav compaction, NavItem-driven |
| `src/components/layout/footer.tsx` | **RW** | drop dead API-route links |
| `src/components/layout/region-picker.tsx`, `header.tsx` | **KEEP** | cosmetic only |
| `src/app/page.tsx` | **RW** | hero section + anti-affiliate evidence flow + boot |
| `src/app/layout.tsx` | **RW** | mount `<BootSequence/>`; remove `<ThemeScript/>` (§1.5); viewport → dark only |
| `src/app/category/[useCase]/**`, `admin/**`, `api/**`, `src/lib/scoring.ts`, `prisma/**` | **KEEP** | zero changes |
| `src/app/laptops/[id]/page.tsx` | **RW** | add exploded 3D island + redesigned spec sheet (server shell + lazy client island) |
| `src/app/compare/compare-content.tsx` | **RW** | cosmetic only; §5 labels stable |
| `src/components/catalog/catalog-view.tsx` | **KEEP** | cosmetic only via laptop-card |

### 1.5 Theme → dark-only removal order (landing lane, single lane, no conflicts)

Order matters so no commit breaks imports:

1. Remove `ThemeToggle` usage in `header-client.tsx` (desktop cluster + mobile "Theme" row; the row block is removed too).
2. Remove `ThemeScript` import + usage from `src/app/layout.tsx`.
3. Delete `src/components/theme/theme-toggle.tsx`.
4. CSS: delete the `:root:not(.dark)` light override block in `globals.css`; drop the light `themeColor` entry in `layout.tsx` viewport. Keep `@custom-variant dark` (harmless); no UI path can set light anymore.
5. `specwise-theme` is ignored thereafter; `tests/e2e/helpers.ts` may keep clearing it (harmless).

---

## 2. TypeScript contracts (exact signatures)

Shared DTOs live in `src/lib/view-models.ts` (results lane owns; quiz/catalog lanes import read-only). All other types are declared in the file that owns them.

### 2.1 `src/lib/view-models.ts`

```ts
export type DimName =
  | "cpu" | "gpu" | "display" | "ram" | "storage"
  | "battery" | "portability" | "build"

/** Radar axis order is contract (spec order: CPU GPU Display RAM Storage Battery Portability Build). */
export const RADAR_DIMS: readonly DimName[] = [
  "cpu", "gpu", "display", "ram", "storage", "battery", "portability", "build",
] as const

/** Per-dimension quality score, 0..1 (mirrors lib/scoring.ts semantics — see §3). */
export type ResultDecomposition = Record<DimName, number>

export interface WeightedDim {
  dim: DimName
  score: number        // 0..1, from decomposition
  weight: number       // 0..1, from weightsForUseCase
  contribution: number // score * weight (radar hover shows this)
  deltaVsPool: number  // (score − poolMean) * 100, percentage points
}

export interface RankedBreakdown {
  laptopId: string
  rank: number
  dimensions: WeightedDim[]
  poolMean: ResultDecomposition
}

export interface DeltaBreakdown {
  laptopId: string
  rank: number
  headlineDelta: number
  baseline: "next-best" | "pool-mean"
  topDrivers: Array<{ dim: DimName; label: string; delta: number }> // top-3 positive deltas
}
```

### 2.2 `src/lib/workloads.ts` (quiz lane) — WorkloadProfile presets

```ts
export type WorkloadPresetId =
  | "sw-dev-llm" | "3d-cad" | "competitive-gaming" | "portability-field"

export interface WorkloadPreset {
  id: WorkloadPresetId
  label: string          // canonical card heading: "SW Dev & LLMs", "3D Motion & CAD",
                         // "Competitive Gaming", "Portability & Field Work"
  tagline: string
  badges: string[]       // parameter badges, e.g. ["32GB+ RAM", "Dedicated GPU", "1TB SSD"]
  accent: string         // scene/node highlight color, token-sourced (--color-accent family)
}

export const WORKLOAD_PRESETS: readonly WorkloadPreset[]

/** Maps a preset onto QuizAnswers field overrides; returns partial — merged over defaults. */
export function workloadToAnswers(id: WorkloadPresetId): Partial<QuizAnswers>
```

Preset → field mapping (contract; `QuizAnswers` keys unchanged):

| Preset | useCase | Core overrides |
|---|---|---|
| SW Dev & LLMs | `ai-ml` | minRam 32, minStorage 1024, gpu `dedicated`, cpuBrand `no-preference` |
| 3D Motion & CAD | `graphic-design` | gpu `dedicated`, displayQuality `["color-accurate"]`, minRam 32, minStorage 1024 |
| Competitive Gaming | `gaming` | gpu `dedicated`, displayQuality `["high-refresh"]`, gaming `esports`, upgradeability `nice-to-have`, battery `low` |
| Portability & Field Work | `travel` | battery `top`, portability `light`, displayQuality `["bright"]`, displaySize `"13-14"`, minStorage 512 |

All other fields stay `null`/`false`; steps 02–03 refine them; defaults flow through unchanged. Presets are **starting points**, editable downstream.

### 2.3 Boot (`boot-sequence.tsx`, landing lane)

```ts
export interface BootLine {
  text: string                 // e.g. "> mounting workload graph…"
  delayMs: number              // offset from sequence start
  variant?: "ok" | "warn" | "accent"   // → success / amber / accent text tokens
}

export interface BootSequenceProps {
  lines?: readonly BootLine[]           // default catalog provided by component
  durationMs?: number                   // hard cap 1500; default 1400
  onComplete?: () => void
}
```

Behavior contract: mounted in `layout.tsx` as a client component that renders `null` pre-hydration (mounted-gate prevents hydration mismatch). `sessionStorage["specwise-booted"]` set → render nothing. Otherwise fixed-position overlay, `role="status"` + `aria-live="polite"`, typewriter lines, aria-label `"Boot sequence. Press Escape to skip."`, Escape + focusable "Skip" button dismiss, auto-dismiss at `durationMs` with a 200ms fade then unmount (`pointer-events-none` while fading; never locks body scroll; page renders/interacts behind it immediately). `prefers-reduced-motion` → no overlay at all (instant pass). After dismiss: set `specwise-booted`.

### 2.4 Hero (hero/, landing lane)

```ts
// stage-pipeline.tsx — demo panel. Static HTML always rendered (text alt for 3D). (§3.2)
export interface StagePipelineProps {
  input: string                                        // e.g. "Editing 4K ProRes + Blender"
  weights: readonly { label: string; value: number }[] // e.g. { label: "CPU", value: 0.91 }
  fScore: number                                       // 0..100
  stageLabel: string                                   // e.g. "STAGE 03 — HARDWARE MAPPING"
}

// hero-section.tsx — SSR-safe section; no three import.
export interface HeroSectionProps { liveCount: number; regionCount: number; priceCount: number }

// hero-topology-scene.tsx — via next/dynamic(..., { ssr: false }) (§4).
export interface HeroTopologySceneProps {
  quality?: "high" | "low"        // default from use-reduced-motion + pointer media; low = reduced budget
  stages?: readonly TopologyStage[]
}
export interface TopologyStage {
  id: string                      // "requirements" | "weights" | "hardware-mapping" |
                                  // "thermals" | "f-score" | "ranking"
  label: string
  progressEnd: number             // 0..1, cumulative end of stage in the scroll range
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  highlightedNode?: NodeKind      // optional rewire emphasis
}
export type NodeKind = "CPU" | "GPU" | "RAM" | "DISPLAY" | "THERMAL" | "BATTERY" | "STORAGE" | "SCORE"

// hero-static-topology.tsx — reduced-motion / noscript fallback (SVG node map).
export interface HeroStaticTopologyProps {
  nodes: readonly { kind: NodeKind; label: string; x: number; y: number }[]
  links: readonly [number, number][]          // node indices
  weights: readonly { label: string; value: number }[]
}
```

### 2.5 Quiz state machine (`quiz-machine.ts`, quiz lane)

```ts
export type QuizStepId = "workload" | "constraints" | "requirements" | "results"

export const QUIZ_STEPS: readonly { id: QuizStepId; index: number; label: string }[] = [
  { id: "workload",     index: 0, label: "01 WORKLOAD" },
  { id: "constraints",  index: 1, label: "02 CONSTRAINTS" },
  { id: "requirements", index: 2, label: "03 REQUIREMENTS" },
  { id: "results",      index: 3, label: "04 RESULTS" },
]

export interface ValidationResult { valid: boolean; missing: readonly string[] }

export interface QuizStateSnapshot { answers: QuizAnswers; stepIndex: number; email: string }

export interface QuizMachine {
  readonly snapshot: QuizStateSnapshot
  validate(step: QuizStepId, a: QuizAnswers): ValidationResult
  setAnswers(patch: Partial<QuizAnswers>): void         // optimistic; persisted on transition
  setEmail(v: string): void
  goNext(): { ok: boolean; missing: readonly string[] } // validates current step first
  goBack(): void                                        // no validation; clamps ≥ 0
  persist(): void              // write-through: specwise-quiz-answers + specwise-quiz-step
  restore(): QuizStateSnapshot // migration-safe read (§7.3)
  complete(): Promise<RecommendationsResponse> // fetchRecommendations → write results keys → push /results
}
```

Step → field ownership (contract):

| Step | QuizAnswers fields edited | Validation |
|---|---|---|
| 01 WORKLOAD | `useCase` (+ preset override map) | **required** `useCase != null` |
| 02 CONSTRAINTS | `budgetMin`, `budgetMax`, `portability`, `os`, `minRam`, `minStorage`, `battery`, `displaySize` | none (defaults flow) |
| 03 REQUIREMENTS | `gpu`, `displayQuality`, `ports`, `security`, `cpuBrand`, `gaming`, `upgradeability`, `buildQuality`, `webcam`, `refurbished` | none |
| 04 RESULTS | email (component state, not QuizAnswers) | email format if non-empty; submit → `POST /api/quiz` |

Persistence: quiz keys written on every transition (not per keystroke; slider persists on pointer-up commit). `complete()` writes `specwise-results` + `specwise-answers` (with `region`), clears quiz keys, `router.push("/results")` — identical post-condition to today.

### 2.6 `SliderRange` (`filter/slider-range.tsx`, results lane owns file; quiz lane consumes)

```ts
export interface SliderRangeProps {
  min: number
  max: number
  step: number
  valueMin: number
  valueMax: number
  onChange: (min: number, max: number) => void
  onCommit?: (min: number, max: number) => void  // pointer-up / Enter; quiz persists here
  formatLabel?: (v: number) => string
  ariaLabels?: { min: string; max: string }      // canonical default: "Minimum budget"/"Maximum budget"
  liveValue?: boolean                             // mono live read-out between thumbs
}
```

Backwards-compat: each thumb keeps its editable number input (e2e fills `getByLabel("Minimum budget")` — labels persist, §5).

### 2.7 Radar (`charts/radar-chart.tsx`, results lane)

```ts
export interface RadarSeries {
  id: string
  label: string            // laptop model, or "POOL AVG" reference series
  values: number[]         // length === RADAR_DIMS.length, order === RADAR_DIMS
  color?: string
}
export interface RadarChartProps {
  dims: readonly DimName[]
  series: readonly RadarSeries[]
  width?: number            // default 420
  height?: number           // default 420
  onHover?: (series: RadarSeries | null, dim: DimName | null) => void
  emphasizedId?: string | null
}
```

Hover contract: highlights the pointed vertex and reports `(series, dim)`; the adjacent HTML read-out renders `{dim}: {score} × {weight} = {contribution}` (from `WeightedDim`). Pure SVG function; `role="img"` + `<title>`; focusable with arrow-key vertex cycling. Isomorphic peak-usage: interactive only; reduced-motion renders static polygons (no sweep animation).

### 2.8 F-score meter (`charts/f-score-meter.tsx`, results lane)

```ts
export interface FScoreMeterProps {
  score: number            // 0..100 (server matchScore of the top match)
  label?: string           // "F-SCORE"
  size?: number            // default 132
  animate?: boolean        // count-up + stroke sweep; false under reduced-motion
}
```

SVG circle + `stroke-dashoffset` radial progress + `use-count-up` number.

### 2.9 Laptop result card + DeltaBreakdown (`results/`, results lane)

```ts
export interface LaptopResultCardProps {
  laptop: RecommendedLaptop
  rank: number
  breakdown?: RankedBreakdown
  topMatch: boolean
  compared: boolean
  onToggleCompare: (id: string) => void
}
```

Card content contract: full spec rows (CPU/GPU/DISPLAY/RAM/STORAGE/BATTERY/WEIGHT), price, retailer strip (`retailers[]` — first 3, `${retailer} · ${formatPrice}` links to `affiliateUrl ?? url`), IN STOCK indicator = any retailer with a live price row (`retailers.length > 0` → `IN STOCK`; label is honest, not an inventory promise), "WHY IT RANKED #1" delta panel for `rank === 1`.

**DeltaBreakdown computation** — `computeRankedBreakdown(laptops, answers): RankedBreakdown[]` in `decomposition.ts` (data source: **the results payload only**; formula documented in §3.3):

```ts
export function computeRankedBreakdown(
  laptops: RecommendedLaptop[],
  answers: QuizAnswers
): RankedBreakdown[]
```

### 2.10 Exploded laptop (`three/exploded-laptop.tsx` + `laptop/exploded-panel.tsx` + `lib/layer-specs.ts`, catalog lane)

```ts
export type ExplodeLayerId =
  | "display" | "heatsink" | "gpu" | "cpu" | "ram" | "ssd" | "battery" | "motherboard"

export interface LayerFieldRow { label: string; value: string | null; source: string }
// source = honest DB field path, e.g. "laptop.gpuVRAM"; null value renders "—" only via UI,
// never invented data.

export interface LayerSpec {
  id: ExplodeLayerId
  label: string                    // canonical: "DISPLAY", "HEATSINK", "GPU", …
  fieldRows: LayerFieldRow[]
  explodedOffset: number           // units along the explode axis (z)
  color: string                    // token-sourced
}

export function buildLayerSpecs(laptop: LaptopDetail): LayerSpec[]

export interface ExplodedLaptopProps {
  laptop: LaptopDetail
  activeLayer: ExplodeLayerId | null
  onSelectLayer: (id: ExplodeLayerId) => void
  reducedMotion?: boolean          // static exploded view (no spring animation)
}
```

Honest DB mapping per layer: DISPLAY → `displaySize`/`displayResolution`/`displayRefreshRate`/`displayPanelType`/`displayBrightness`/`displayColorGamut`; HEATSINK → **no thermal DB field exists** → rows `{ label: "Thermal design", value: null, source: "n/a" }` rendered "—" with a UI note "thermal data not tracked — see batteryLife/reviewScore proxies"; GPU → `gpuModel`/`gpuVRAM`/`gpuType` (VRAM/TGP/CUDA/ARCH only where the field exists: `gpuVRAM`, `gpuType`; TGP/CUDA/ARCH are absent from the DB → "—"); CPU → `cpuFamily`/`cpuGeneration`/`cpuCores`; RAM → `ramAmount`/`ramType`/`ramUpgradeable`; SSD → `storageAmount`/`storageType`/`storageExpandable`; BATTERY → `batteryCapacity`(Wh)/`batteryLife`; MOTHERBOARD → `ports`/`wireless`/`securityFeatures`. `explodedOffset` per layer, procedural `boxGeometry` layers — **no external GLTF**.

### 2.11 Evidence flow (`results/evidence-flow.tsx`, landing lane)

```ts
export interface EvidencePipeline {
  id: string
  label: string                         // "TRADITIONAL REVIEW" | "SPECWISE"
  tone: "danger" | "success"
  steps: readonly string[]              // e.g. ["REVIEW", "SPONSORSHIP", "AFFILIATE COMMISSION", "RANKING"]
}
export interface EvidenceFlowProps {
  pipelines: readonly EvidencePipeline[]   // exactly 2: danger vs success
  animated?: boolean                       // false under reduced-motion (static SVG + table)
  className?: string
}
```

Renders animated SVG flow lines (dots traverse the path; reduced-motion → static arrows) + the static comparison table below (existing `methodologyRows` extended). TerminalBox frame optional.

### 2.12 Nav (`layout/header-client.tsx`, landing lane)

```ts
export interface NavItem {
  href: string
  label: string        // "Find a Laptop" | "Catalog" | "Compare" (unchanged canonical)
  icon: React.ElementType
  ariaLabel?: string
}
export const NAV_ITEMS: readonly NavItem[]
```

Scroll compaction: scrollY > 24 → `h-14` → `h-12`, smaller type; uses motion `useScroll`/plain listener, CSS transition 150ms `cubic-bezier(0.2,0,0,1)`; reduced-motion → no compaction animation (instant). `aria-label` "Menu"/"Mobile navigation" + `#mobile-menu` unchanged.

---

## 3. Radar dims decision + per-dimension decomposition source

**Decision: the quiz API response stays unchanged (zero backend change).** Per-dimension values are recomputed **client-side** from the stored `specwise-results` (`RecommendedLaptop[]` — contains every hardware field needed) plus `specwise-answers` (the `QuizAnswers` used to score), via a **pure mirrored scoring module**.

### 3.1 The 8 radar dimensions and the substitutions

`RADAR_DIMS` = **CPU · GPU · Display · RAM · Storage · Battery · Portability · Build**.

- Maps 1:1 onto `scoring.ts` dims `cpu, gpu, ram, storage, battery, portability, display, build` — the same formulas serve the radar, delta breakdown, demo weights and F-score decomposition. `budget` and `upgradeability` are excluded from the radar on purpose (budget is shown as price; upgradeability lives in the filter panel + spec rows).
- **Thermals are NOT in the DB** (`LaptopDetail`/`RecommendedLaptop` have no thermal field — verified). Substitution policy: the **Battery** axis is the honest proxy for sustained-load endurance (`batteryLife`); the detail page **HEATSINK** layer renders "—" with a source note. No thermal axis, no invented thermal data.
- `display`/`build` in `computeScores` read fields NOT transported in the quiz response (`displayColorGamut`, `displayTouch`, `buildMaterial`). Decomposition degrades honestly: absent field → the neutral branch the scoring formula already defines (`basic` display path → 1.0; build → 0.5). The detail page has `LaptopDetail` and runs full-fidelity variants — documented as "display/build are pool-approximations on /results, exact on /laptops/[id]".

### 3.2 `src/lib/decomposition.ts` (results lane, NEW)

Mirror, **not** export-from `scoring.ts` — scoring.ts is frozen. Header comment MUST state: *"Per-dimension formulas mirror `src/lib/scoring.ts` `computeScores` (source of truth). Do not diverge; parity test §7.6."*

```ts
export interface DecomposeInput {
  laptop: RecommendedLaptop | ScorableLaptop | LaptopDetail
  answers: Pick<QuizAnswers, "battery" | "portability" | "displayQuality" | "useCase">
}

/** 8-axis decomposition, 0..1 per dim. Pure, memoizable. */
export function decomposeScores(input: DecomposeInput): ResultDecomposition

/** Mirrors PRIORITIES[useCase] from scoring.ts (raw profile weights for the 8 radar dims). */
export function weightsForUseCase(useCase: UseCase | null | undefined): Record<DimName, number>

/** Ranked per-dim breakdown + pool deltas + topDrivers. Data source: results payload only (§3.3). */
export function computeRankedBreakdown(
  laptops: readonly RecommendedLaptop[],
  answers: QuizAnswers
): RankedBreakdown[]
```

Internal mirror helpers (small, pure, exported for unit tests):

```ts
function scoreCpu(l: { cpuCores: number | null }): number               // 0.4 + cores/24, cap 1
function scoreGpu(l: { gpuType: string; gpuVRAM: number | null }): number  // dedicated: 0.6 + vram/32, cap 1; else 0.3
function scoreRam(l: { ramAmount: number }): number                     // 32→1.0, 16→0.85, 8→0.6, else 0.3
function scoreStorage(l: { storageAmount: number }): number             // 1024→1.0, 512→0.85, 256→0.6, else 0.4
function scoreBattery(l: { batteryLife: number | null }, priority: BatteryPriority | null): number
function scorePortability(l: { weight: number | null }, pref: PortabilityPref | null): number
function scoreDisplay(l: DisplayFields, q: string | string[] | null): number  // degrades per §3.1
function scoreBuild(l: { buildMaterial: string | null }): number         // aluminum/magnesium/carbon → 1.0, else 0.5
type DisplayFields = Pick<ScorableLaptop, "displayBrightness" | "displayColorGamut"
  | "displayPanelType" | "displayRefreshRate" | "isTouchscreen">
```

### 3.3 Delta breakdown formula (documented, honest)

Population = the returned pool (n ≤ 12) — the **only** data the client has; UI must say "vs. pool average", never "vs. catalog".

1. `poolMean[i] = Σ decomposeScores(l).dim_i / n`
2. `deltaVsPool(l, i) = (score_i(l) − poolMean[i]) × 100` (percentage points)
3. `headlineDelta`: rank-1 → `matchScore − rank-2.matchScore`; other ranks → `matchScore − poolMeanMatchScore`
4. `topDrivers` = top-3 dims by positive `deltaVsPool` → "WHY IT RANKED #1" rows (e.g. `CPU +14 pts vs pool avg`), rendered by `delta-breakdown.tsx` with `baseline: "next-best" | "pool-mean"` exposed for labeling.

Rationale: catalog-wide averages would require an API change (out of scope); pool-relative deltas stay meaningful within the ranked set and are exactly reproducible from transport data.

### 3.4 Filter panel re-score (client-side, `lib/rescore.ts`)

```ts
export const RESCORE_DIMS: readonly DimName[] = [...RADAR_DIMS, "upgradeability"]
export interface RescoreInput {
  laptops: readonly RecommendedLaptop[]
  answers: QuizAnswers
  weights: Record<typeof RESCORE_DIMS[number], number>
}
export function rescorePool(input: RescoreInput): RecommendedLaptop[]
```

- Formula: `localScore = 100 × Σ(w_i · score_i) / Σ w_i`, where `score_upgradeability = ramUpgradeable ? 1.0 : 0.3` (mirrors scoring).
- Cheaper than re-POST by design: pure client-side re-rank of the stored pool, **no network**. UI label `ADJUSTED SCORE (LOCAL RE-RANK)` — never confused with the server F-score (server blends precision/recall over the full catalog; local rescore is pool-constrained — difference is documented in the panel's tooltip).
- Slider defaults come from `weightsForUseCase(answers.useCase)`.

### 3.5 Price/performance curve (`charts/price-performance.tsx`)

Derived from the results payload only: x = `price`, y = `matchScore`. Requires ≥3 points, else falls back to `bar-list.tsx` (per-dim chart). Hover shows model + both values. Honest caption: "pool ranking, not market pricing".

---

## 4. Three.js scene architecture

### 4.1 Component tree (hero; exploded laptop on /laptops/[id] follows the same pattern)

```
HeroSection (server)                    // 60/40 grid: editorial copy + <StagePipeline/> demo panel
└── <Suspense fallback={<SceneSkeleton/>}>
    └── <HeroTopologyScene/>            // next/dynamic(..., { ssr: false, loading: <SceneSkeleton/> })
        ├── use-scene-lane(wrapper)     // IntersectionObserver → { inView }
        └── <Canvas frameloop={inView ? "always" : "never"} dpr={dprByQuality}
                    gl={{ antialias: true, powerPreference: "high-performance" }}>
            ├── <SceneContent/>         // useFrame loop reads sceneStore (§4.5)
            │   ├── <ParticleField/>    // instancedMesh, count by quality
            │   ├── <ConnectionLinks/>  // lineSegments, one BufferGeometry
            │   ├── <HardwareNodes/>    // instanced per NodeKind, hover/click via instanceId
            │   └── <CameraRig/>        // damped lerp toward stage targets
            └── <StagePipeline/>        // DOM overlay sibling (<div> over the canvas), cheap HTML
```

### 4.2 Instancing plan (one draw call per system)

- **Particles:** one `<instancedMesh>`; `Float32Array` positions memoized in `useMemo` (`quality: "low"` → 40% of `high` count); `instanceMatrix` updated in `useFrame` for drift only (no per-frame allocations); `instanceColor` for the accent tint.
- **Links:** one `<lineSegments>` (avoid drei `Line` — heavier). Geometry positions recomputed only when the active node set changes (stage boundary), with `needsUpdate = true` on that event — never per frame.
- **Nodes:** one `instancedMesh` (shared geometry per node kind), per-node `instanceColor`; raycast/hover via `instanceId` (throttled under `quality: "low"`).
- **Disposal (R3F v9):** disposal is deferred (`disposeOnIdle`) — never call `dispose()` on transient meshes, never remount the Canvas subtree, keep geometries memoized at module level. Unmount cleanup is automatic.

### 4.3 DPR + IO pause wiring

- `dpr={[1, 1.75]}`; `quality: "low"` (mobile / `(pointer: coarse)`) caps `dpr={[1, 1.5]}` and cuts particle count.
- **Pause:** `use-scene-lane.ts` — IntersectionObserver on the wrapper → `inView` state → `frameloop` prop toggle. Do **not** use `invalidate()` (no-ops under `"never"`). Toggling `frameloop` does not remount the Canvas (R3F), so scene state survives re-entry. Initial value `"never"` gates the first mount; hero is at top of page so observation fires immediately.

### 4.4 Reduced-motion / noscript fallback

`use-reduced-motion.ts` returns `false` until mounted (SSR-safe). Under `prefers-reduced-motion: reduce` → render `HeroStaticTopology` (pure 2D SVG node map, same nodes/links/weights, no animation) and never mount the Canvas. noscript users get server-rendered editorial + `<StagePipeline/>` (the text alternative — every 3D surface has one). The Canvas↔SVG swap is a one-time rare transition; deferred disposal covers the unmount; never key the Canvas by anything frame-hot.

### 4.5 Scroll-driven storytelling without re-render storms

- `scroll-bridge.ts`: `useScroll({ target: sectionRef, offset: ["start start", "end end"] })` + `useMotionValueEvent(scrollYProgress, "change", v => …)` — three jobs, **outside React state**:
  1. find active `TopologyStage` from cumulative `progressEnd` thresholds,
  2. write `{ stageIndex, blend }` into `sceneStore.current` (a plain mutable object — module-level ref),
  3. only when `stageIndex` changes: `setPanelStage(i)` — one React state write per stage boundary (rare, cheap) → demo panel copy/weights swap (`StagePipeline`).
- `useFrame` in `CameraRig`/`SceneContent` lerps `camera.position` / `lookAt` toward `sceneStore.current` targets with damping — **zero React renders during scroll**. Canonical pattern: motion values → refs → useFrame; React state only at stage boundaries.
- Stages (exact scroll directives): `requirements → weights → hardware mapping → thermals/constraints → f-score → ranking`, each with its own `cameraPosition`/`cameraTarget`/`highlightedNode`.
- Reduced motion: bridge disabled; render static final composition.

### 4.6 R3F v9 typing notes (MUST)

- No global JSX namespace: type instanced/lines via `ThreeElements["instancedMesh"]` / `ThreeElements["lineSegments"]` etc. (`import type { ThreeElements } from "@react-three/fiber"`); extend prop types with `ThreeElement<typeof mesh>` when custom props are needed.
- `gl` prop: new signature — pass a props object (`gl={{ antialias: true, ... }}`), not a function.
- `invalidate()` no-op under `frameloop="never"` — all scene mutation lives in `useFrame`, which only runs under `"always"`.

---

## 5. Canonical UI strings + aria-labels (new e2e test contract)

This table is the contract qa-tester adopts to update `tests/e2e/*`. **KEEP** = string stays identical to today (tests keep passing); **NEW** = replacement/exact string the tests must assert.

### Quiz (`tests/e2e/quiz-flow.spec.ts` rewrites)

| Context | Old (asserted) | New canonical | FATE |
|---|---|---|---|
| Quiz page h1 | "How experienced are you with laptops?" | "Build your machine profile" | NEW |
| Mode selector cards | "Quick & Simple" / "Advanced" | removed (no mode selector) | GONE |
| Step 01 h2 | "What will you mainly use the laptop for?" | "What is your primary workload?" | NEW |
| Step 01 preset cards | — | "SW Dev & LLMs", "3D Motion & CAD", "Competitive Gaming", "Portability & Field Work" | NEW |
| "Other workloads" picker | (useCase option labels) | labels from `USE_CASE_LABELS` ("Coding & Development", "Gaming", …) — unchanged strings | KEEP |
| Step 02 h2 | "What's your budget range?" | "Set your constraints" | NEW |
| Budget thumb inputs | aria-label "Minimum budget" / "Maximum budget" | **unchanged** (SliderRange default) | KEEP |
| Step 02 controls | — | aria-labels: "Operating system", "RAM", "Storage", "Display size", "Battery", "Connectivity", "Weight tolerance" | NEW |
| Step 03 h2 | (multiple question h2s) | "Refine your requirements" | NEW |
| Step 03 groups | — | legends: "Graphics", "Ports", "Security", "Display quality" | NEW |
| Step 04 h2 | (portability h2) | "Review your profile" | NEW |
| Email field label | "Get these results by email (optional)" | **unchanged** | KEEP |
| Submit button | "See My Matches" | **unchanged** | KEEP |
| Next / Back | "Next" (exact) / "Back" | **unchanged** | KEEP |
| Skip | "Skip" | **removed** (optional steps advance via Next) | GONE |
| Progress rail | "STEP X OF N" | "01 WORKLOAD" · "02 CONSTRAINTS" · "03 REQUIREMENTS" · "04 RESULTS" with `aria-current="step"` on active | NEW |
| Landing h1 after submit | — | "Your Matches" (unchanged, below) | — |

### Experience gate addendum (2026-08-15 — approved quiz optimization, quiz scope only)

| Context | Shipped string | FATE |
|---|---|---|
| Quiz page h1 | "Let's find your laptop" (gate screen) | NEW |
| Gate sub | "How experienced are you with laptops?" | NEW |
| Gate cards | "Quick & Simple" / "Advanced" | NEW (mode selector returns as an experience gate) |
| Quick & Simple card | "Just a few essential questions. No technical specs needed." + badge "~2 MIN" | NEW |
| Advanced card | "Full control over CPU, GPU, RAM, display, ports, security, and more." | NEW |
| Quick path rail | "01 WORKLOAD · 02 BUDGET · 03 REVIEW" | NEW |
| Quick step 02 h2 | "Set your budget" (+ "All optional — we'll use smart defaults. Use Next to continue.") | NEW |
| Advanced path | 01 WORKLOAD · 02 CONSTRAINTS · 03 REQUIREMENTS · 04 RESULTS (unchanged) | KEEP |
| New storage key | `specwise-quiz-mode` ("quick" \| "advanced") | NEW |

Restore rules (contract): valid stored mode → restore that mode; mode absent/invalid **but a finite, non-empty `specwise-quiz-step`** → `advanced` (legacy pre-gate migration); otherwise gate. Step values are sanitized (`Number.isFinite` + `Math.floor` + clamp); corrupt answers JSON falls back to defaults. Back at step 0 returns to the gate and resets answers/step storage (true restart). Workload NEXT is disabled until `useCase != null` (workload is required). Restore is hydration-safe: storage is read post-mount only (mounted-gate), never in SSR/lazy initializers.

### Results + compare (mostly stable)

| Context | String | FATE |
|---|---|---|
| Results h1 | "Your Matches" | KEEP |
| Top match badge | "Best Match" | KEEP |
| Alternatives heading | "More Options" | KEEP |
| Compare toggle button | "Compare" (exact) / "Added" | KEEP |
| Compare CTA | "COMPARE NOW" | KEEP (cosmetic restyle) |
| Filter panel heading | — | "ADJUST WEIGHTS" (NEW) + caption "Adjusted score — local re-rank of this pool" |
| Top-match delta panel | — | "WHY IT RANKED #1" (NEW) |
| IN STOCK strip | — | "IN STOCK" rendered when `retailers.length > 0` (NEW, honest) |
| Compare h1 | "Compare Laptops" | KEEP |
| Compare table region | role "region" name "Laptop comparison table, horizontally scrollable" + `tabindex="0"` | KEEP |
| Compare empty state | h2 "No results found" + link "Find Laptops" | KEEP |

### Header / global

| Context | String | FATE |
|---|---|---|
| Nav links | "Find a Laptop" / "Catalog" / "Compare" | KEEP |
| Region trigger | aria-label "Select region" | KEEP |
| Mobile toggle / menu | aria-label "Menu", aria-label "Mobile navigation", `#mobile-menu` | KEEP |
| CTA | "Get Started" | KEEP |
| Boot overlay | role="status" aria-live="polite", aria-label "Boot sequence. Press Escape to skip.", skip button "Skip intro" | NEW |
| Theme toggle | aria-label "Switch to light/dark mode" | GONE (removed with ThemeToggle) |

### Landing

| Context | String | FATE |
|---|---|---|
| Hero h1 | "Match your workload to exact laptop hardware." | KEEP |
| Demo panel title | "specwise-engine --translate --live" | KEEP |
| Anti-affiliate h2 | "Anti-Affiliate Methodology" + table | KEEP (extended) |
| Evidence flow heading | — | "Why rankings differ" (NEW) |
| Footer API links | non-existent routes | REMOVED (see §1) |

---

## 6. Lane plan (ordered implementation, file ownership)

Four lanes, run sequentially per the order below (each lane's files are disjoint — no two lanes ever write the same path). A lane's "MUST NOT touch" list applies to the **whole redesign**: `prisma/**`, `src/lib/scoring.ts`, `src/lib/types.ts`, `src/app/api/**`, `src/app/admin/**`, `src/middleware.ts`, `src/app/actions.ts`, `src/lib/region*.ts`, `src/lib/api.ts`, `tests/**` (qa-tester owns test edits, driven by §5).

### (a) Landing lane — "hero, boot, anti-affiliate, shell"
Owns: `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/boot/**`, `src/components/hero/**`, `src/components/three/{use-scene-lane,use-reduced-motion,scene-store}.ts`, `src/hooks/use-in-view.ts`, `src/components/layout/{header-client,footer}.tsx`, `src/components/ui/{terminal-box}.tsx` (repurpose), `src/components/results/evidence-flow.tsx`, `src/lib/evidence.ts` (data), `globals.css` (dark-only cleanup only, §1.5), deletion of `status-badge.tsx` + `theme/theme-toggle.tsx`.
Order: 1) delete status-badge; 2) terminal-box `typeable`; 3) boot sequence + layout mount; 4) §1.5 theme removal; 5) hero section + lazy topology scene + static fallback; 6) evidence flow + table; 7) header compaction + footer cleanup.
Must NOT touch: quiz/**, results/** (except evidence-flow.tsx which is landing-owned), charts/**, catalog/**, laptop/**, `ui/range-slider.tsx`.

### (b) Quiz lane — "unified 4-step flow"
Owns: `src/components/quiz/**` (incl. rewrite of `quiz-flow.tsx`), `src/lib/workloads.ts`, `src/lib/question-options.ts`, `src/lib/questions.ts` (repurpose per §1), and **reads** `SliderRange` (results-owned `filter/slider-range.tsx` + `ui/range-slider.tsx` — contract §2.6; if the file does not exist yet, quiz lane leaves the existing `ui/range-slider.tsx` alone and builds against the contract, results lane lands it in step (c); to keep the sequence green, results lane ships `slider-range.tsx` first — schedule note).
Must NOT touch: hero/**, results/**, charts/**, catalog/**, `view-models.ts` (read-only import), `decomposition.ts` (may import `DimName` only).

### (c) Results lane — "workspace, decomposition, re-score, charts"
Owns: `src/components/results/**` (results-grid rewrite, filter-panel, laptop-result-card, delta-breakdown), `src/components/charts/**`, `src/components/filter/**` + `ui/range-slider.tsx`, `src/hooks/use-count-up.ts`, `src/lib/{view-models,decomposition,rescore}.ts`, `src/app/results/results-view.tsx` (cosmetic).
Order: 1) view-models.ts; 2) decomposition.ts + rescore.ts; 3) charts (radial-progress → f-score-meter, radar, bar-list, price-performance); 4) slider-range shipped here; 5) filter-panel + rescore wiring; 6) workspace container + cards + delta panel; 7) results-view alignment.
Must NOT touch: quiz/**, hero/**, catalog/**, laptop/**, `types.ts` (DimName lives in view-models, §2.1).

### (d) Catalog/detail/compare lane — "cards, spec sheet, exploded 3D"
Owns: `src/components/catalog/laptop-card.tsx`, `src/components/laptop/**`, `src/components/three/exploded-laptop.tsx`, `src/lib/layer-specs.ts`, `src/app/laptops/**` (detail page islands), `src/app/compare/**` (cosmetic), `src/components/product/detail-pricing.tsx` (cosmetic). Reads charts/** + view-models/** read-only (radar + F-score decomposition on detail page only if data exists; otherwise full spec rows only).
Must NOT touch: quiz/**, results/**, hero/**, landing layout, boot.

### Cross-lane rules
- `src/lib/view-models.ts` written ONLY by results lane (b) may import; all others read-only.
- `src/components/charts/**` written ONLY by results lane; catalog/compare lanes consume read-only (no edits, no forks).
- `src/components/ui/terminal-box.tsx` written ONLY by landing lane; quiz/results lanes consume.
- No lane edits `tests/**`; the qa-tester updates `quiz-flow.spec.ts` per §5 after lane (b) and `results-compare.spec.ts` if any NEW strings surface there (expected: none beyond additions).
- Each lane ends with `npm run lint` + `npm run build` green and the e2e suite run; console-error assertions apply from lane (a) onward.

---

## 7. Risks + mitigations

### 7.1 three.js in the app entry (bundle size)
- **Risk:** `three` (~150KB gz) landing in the main entry by accidental import from a server component or shared layout file (invariant §0.6).
- **Mitigations:** (1) invariant enforced in review: three-importing files live only under `hero/**` + `three/**`; (2) both consumption points (landing hero, detail exploded view) load via `next/dynamic(..., { ssr: false })` → three lands in lazy chunks, never in the initial RSC payload; (3) verify after lane (a): `next build` output + DevTools network — hero chunk must appear only on `/`, exploded chunk only on `/laptops/[id]`; (4) optional (only if two chunks both pull three): webpack `splitChunks.cacheGroups` with a shared `three-vendor` group — evaluate after (d), not before; (5) drei usage is selective (no default barrel imports); `Line` from drei is avoided in favor of raw `lineSegments` (§4.2).

### 7.2 SSR guard for Canvas / WebGL
- **Risk:** `Canvas` rendered server-side → WebGL context errors / hydration crash.
- **Mitigations:** `ssr: false` on both dynamic imports; `HeroTopologyScene` renders `null` pre-mount; `use-reduced-motion` returns `false` on server; zero `window`/`matchMedia` access at module top-level (hooks only). `ExplodedLaptop` same discipline (server page passes serialized `LaptopDetail` as props).

### 7.3 Quiz state migration from old localStorage
- **Risk:** old flow persisted `specwise-quiz-step` as question index up to ~12 and answers without preset fields; new flow reads step 0–3.
- **Mitigations (in `restore()`):** parse defensively (try/catch — corrupt JSON → `defaultQuizAnswers`); clamp: `storedStep > QUIZ_STEPS.length - 1` ⇒ step 0; merge stored answers over `defaultQuizAnswers` (unknown keys dropped, missing keys defaulted — contract-compatible with the unchanged `QuizAnswers`); old `mode` value ignored. `specwise-answers`/`specwise-results` from the old flow remain fully valid on /results (no migration needed there). First `persist()` after restore writes the clamped `stepIndex` back.

### 7.4 Boot overlay vs. e2e
- **Risk:** overlay intercepts Playwright clicks / changes timing of visibility assertions; overlay hydration mismatch.
- **Mitigations:** overlay renders `null` pre-hydration (mounted gate) and is unmounted from the DOM after fade; `durationMs` cap 1500 with 200ms fade; dismissible via Escape/skip; recommended qa change (documented for qa-tester): `helpers.ts` gains `seedBootSkipped(page)` → `sessionStorage.setItem("specwise-booted", "1")` and `clearSpecwiseStorage` keeps clearing it — tests that assert immediately after `goto` call `seedBootSkipped`.

### 7.5 e2e ripple list (qa-tester checklist, from §5)
- `quiz-flow.spec.ts` — **two full test rewrites**: h1 NEW, mode selector gone, step h2s NEW, "Skip" gone (optional steps now advance via Next), "Next"/"Back"/"See My Matches"/budget aria-labels/email label KEEP.
- `results-compare.spec.ts` — mostly KEEP ("Your Matches", "Best Match", "More Options", "Compare", "Compare Laptops", region role, "No results found"); add optional assertions for "WHY IT RANKED #1" + "ADJUST WEIGHTS".
- `region-currency.spec.ts`, `catalog.spec.ts` — expect no changes (catalog strings only restyled; region flow untouched). Verify "Select region" still present.
- `tests/e2e/helpers.ts` — add `seedBootSkipped`; `clearSpecwiseStorage` unchanged.
- Console-error assertions: unchanged policy — zero errors expected on all pages (landing now mounts Canvas; any WebGL console noise must be filtered consciously, not silenced globally — WebGL context-loss warnings from headless GPU-less runs are environment noise, document any filter added).

### 7.6 Decomposition parity drift
- **Risk:** mirrored formulas (§3.2) silently diverge from `scoring.ts`.
- **Mitigations:** (1) header link comment on `decomposition.ts`; (2) parity unit test (results lane, `tests/recompute/decomposition.test.ts`) feeding the same fixtures as `tests/scoring/fixtures/*` and asserting `decomposeScores` dims equal the values `scoring.ts` would produce for matching answers (fixtures copied, not imported — `tests/**` stays outside lane files for write-conflict freedom but lane (c) may add new test files); (3) code review gate: any future change to `scoring.ts` triggers a decomposition.ts review (out of scope here; documented in doc header). None of this modifies scoring.ts.

### 7.7 Performance / interaction risks (non-blocking, tracked)
- frameloop toggling + IO: verified pattern in R3F v9 (no remount); if a first-fold jank occurs on low-end devices, `quality: "low"` tiers (DPR cap + particle cut) are the lever.
- Radar/JSON payload: decomposition is O(n × 8) on ≤12 laptops — trivially cheap; `useMemo` on `[laptops, answers]`.
- localStorage writes: quiz persists on transitions only (not per keystroke) — no write amplification.
- Reduced-motion coverage: boot, hero canvas→SVG swap, count-ups, radar sweep, evidence flow, nav compaction — all gated by `use-reduced-motion` (single hook).

---

### Appendix A — invariants recap (copy-paste into lane PRs)
API and storage keys unchanged · scoring.ts frozen · region flow untouched · no fake functionality · zero console errors · new names + legacy tokens both resolve · three only via lazy client islands · §5 strings are the test contract · admin/API/prisma off-limits.

<!-- END -->