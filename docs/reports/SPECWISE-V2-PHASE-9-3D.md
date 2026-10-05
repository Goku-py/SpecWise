# SPECWISE V2 — PHASE 9 3D HERO (incremental verification + one fix)

> Visual direction FROZEN per 6C §§8/15 + 6D pre-ship Light verdict (ACCEPTABLE).
> Default posture throughout: no visual change. One functional fix shipped (§12);
> everything else is measure-verify-document.

## 1. Scope & frozen direction

R3F hero laptop is brand context: procedural model, lazy (`ssr:false`), IO-gated,
DPR-clamped, reduced-motion aware, poster fallback, caption honesty line intact.
Phase 9 touched exactly one source file (`scene-shell.tsx`, one guard) plus docs.
Untouched by design: engine, quiz, results, homepage copy, themes, images, prisma, API.

## 2. Files re-verified (claim-by-claim vs PHASE-9-AUDIT)

- `hero-laptop-wrapper.tsx` (214 lines): quality detection, wrapper IO, 6 s cycle,
  rAF scroll caption, pointer source, `HeroPoster`. All claims hold, except low-quality
  "animation off" (see §3).
- `hero-scene-bundle.tsx` (33): DOM-outside-Canvas boundary. Holds.
- `hero-laptop-scene.tsx` (150): lights/grid/shadows/env/Rig/YawGroup/explode values
  all match audit. `inView` prop arrives as dead `_inView` (see §3).
- `hero-laptop.tsx` (334): 48 + 3 instanced keys, trackpad, lid/bezel/webcam sphere,
  7 PartSlabs (ram ×2), 512×320 canvas screen, sRGB, aniso-4, zero GLTF/HDR/image
  textures. Holds exactly.
- `scene-shell.tsx` (85→87): Canvas wrapper. One guard added (§12).
- `workload-highlights.ts`: pure vocab, no rendering imports. Holds.
- Out of scope, unread-changed: `hero-topology.tsx`, `exploded-laptop.tsx`,
  `hero-wrapper.tsx`, `workload-demo.tsx`.

## 3. Audit corrections made (PHASE-9-AUDIT, 4 factual deltas)

1. §2: scene-level `inView` prop is dead (`_inView`); gating is the shell's own IO.
   "Double IO" still true (wrapper IO → cycling, shell IO → frameloop).
2. §§4–5: low quality does NOT stop frameloop/Rig/Yaw/glow-lerps — only explode→0
   + DPR clamp. "Animation off" overstated; corrected to explode-off + DPR clamp.
3. §5: caption "always ends 'Illustrative, not a recommendation'" — true only when a
   workload is highlighted; no-selection fallback is "Assembled view · Illustrative
   preview." (poster/loading/reduced caption).
4. §§2/4/6: "static-first one frame" was FALSE — frameloop "never" renders zero frames
   (blank canvas observed, §12). Fixed; doc now states poster-when-reduced.

## 4. Canvas configuration & gating

`frameloop = !inView || reduced ? "never" : "always"` (shell IO, threshold 0).
DPR low `[1,1.25]` / high `[1,1.75]`. `antialias + alpha + high-performance`,
fov 40 @ `[3.5,1.8,4.8]`, transparent. `onCreated` context probe → poster;
`CanvasErrorBoundary` → poster. Container `aria-hidden`.

## 5. Lighting / materials / environment

Ambient 0.35; warm key 1.6 `#FFF4E8`; cool rim 0.35 `#9DB8FF`; cyan `#38E1FF` 0.4 +
orange `#FF5500` 0.3 points (brand-matched, no bloom). PMREM `RoomEnvironment`,
zero external assets, disposed on unmount, `environmentIntensity 0.45`.
`ContactShadows` 0.7. `gridHelper [14,28]` hardcoded dark `#1A1E29/#11141C` @ 0.35
over theme-aware `--hero-grid` container background. Untouched — no breakage found.

## 6. Model & texture inventory (external assets: ZERO)

- External model/texture/HDR requests at runtime: **0** (resource-timing scan +
  network log; no `.gltf/.glb/.hdr/.exr/.ktx2/.bin`).
- Textures: one runtime 512×320 RGBA `CanvasTexture` (~640 KB GPU + mipmaps ≈ 850 KB),
  drawn once, disposed on unmount; one 512² ContactShadow render target (~1 MB).
- Meshes: ~20 + 2 InstancedMeshes (48 + 3). PMREM generated once per mount.

## 7. Interaction restraint audit (vs CTA中文 — verdict: NO COMPETITION, no change)

- Pointer parallax ±0.5 x / ±0.3 y with damp 4 + yaw ±0.12: sub-degree drift on a
  right-column visual; CTA ("Find My Laptop", orange, left column) dominates all 4
  themed screenshots. No dampening applied — could not demonstrate competition.
- 6 s highlight cycle: caption-only + emissive pulse, pauses on explicit selection
  and reduced-motion, freezes out of view (wrapper IO). Restrained; unchanged.
- Scroll explode (progress × 0.85, 4 stages): hero-only, rAF-throttled, bucketed
  caption updates. Does not follow the user or fight content. Unchanged.

## 8. Scroll explode behavior (observed)

Desktop: caption tracks Assembled → Hardware explanation across 1 vh of scroll.
Mobile-dark capture showed "· STRUCTURE REVEAL." after scroll-restore — explode path
live. Known nuance (documented, not fixed): on low quality the DOM caption still names
stages while the model stays assembled (caption effect checks `reduced` only).

## 9. Lazy boundary & quality gating

`next/dynamic ssr:false`; loading poster in DOM (never inside Canvas). Prod chunk
`2bvhrbiexp-1_.js` confirmed to contain three/RoomEnvironment/hero-scene code.
Quality: `pointer:coarse || width<1024 → low`. Low = DPR ≤1.25 + explode 0
(NOT full animation-off — §3 correction). 390 px capture: canvas mounted, laptop
rendered, no breakage.

## 10. Light-mode intentionality (verdict: ACCEPTABLE, no change — with evidence)

Desktop-Light screenshot: dark chassis reads as deliberate product-render contrast on
warm paper (`#FAF7F1`), theme-aware `--hero-grid: rgb(27 29 36 / 0.06)` blueprint
backdrop coherent, orange/cyan accents legible. Matches 6D verdict pixel-for-pixel in
intent. Materials/lighting/grid untouched.

## 11. Dark-mode posture

Unchanged brand surface; laptop, grid, caption all coherent. No separate 3D theme
architecture (correct — inherits via CSS tokens).

## 12. Reduced motion (browser-verified with real `prefers-reduced-motion: reduce`)

- Verified: cycle off, stage reset, caption "Assembled view · Illustrative preview.",
  parallax/explode inert — via actual media emulation, not source claims.
- FAILURE FOUND: pre-fix, the figure rendered a BLANK canvas (grid + caption, no
  laptop) — "one static frame" never happens under frameloop "never".
- FIX (only source change this phase, `scene-shell.tsx`): `if (webglFailed || reduced)`
  renders the designed `HeroPoster`. Re-verified: no canvas, poster SVG present,
  honest caption. Reduced-motion users additionally skip all WebGL cost.
- Known residual: SSR snapshot is animated (`getServerSnapshot → false`), so a
  reduced-motion first paint may flash canvas→poster. Pre-existing class (same as the
  documented SSR flash); not introduced here.

## 13. Failure paths

| Path | Mechanism | Verification |
|---|---|---|
| WebGL unavailable | `onCreated` context probe → poster div | code-complete; probe pattern sound (try/catch → state) |
| Render error | `CanvasErrorBoundary` → poster | code-complete |
| Chunk-load failure | `next/dynamic` loading poster persists | LIVE-SIMULATED (route-abort): poster + caption, page fully usable, no crash |
| Low power (coarse/small) | low quality: DPR ≤1.25 + explode 0 | live at 390 px: renders, no breakage |
| Reduced motion | poster (post-fix) | LIVE-VERIFIED with real media query |

## 14. Accessibility

Canvas container `aria-hidden="true"`; figure/figcaption + sr-only poster text carry
meaning in the DOM. No keyboard traps (no OrbitControls, no focusable 3D).
Reduced-motion path is now the most legible state (static line-art + caption).
No a11y regression introduced (single guard swaps canvas→poster, both hidden/labelled).

## 15. Security

No remote assets added; no asset URLs of any kind in 3D code (only dependency imports
`three`, `@react-three/fiber`, `@react-three/drei` — pre-existing). No user input
reaches the scene (workload ids from a closed vocab). `powerPreference` unchanged.

## 16. Copy honesty

No product names, scores, rankings, or prices in any 3D copy. Workload blurbs are
plain-language hardware descriptions from a closed vocab. Highlighted caption always
ends "Illustrative, not a recommendation."; fallback "Assembled view · Illustrative
preview." claims nothing. 6D honesty posture preserved.

## 17. Performance measurements (PRIMARY criterion)

| # | Metric | Value | Method |
|---|---|---|---|
| 1 | External model/texture/HDR assets | **0 requests** | resource-timing regex + network log, live |
| 2 | Prod 3D async chunk | **881 KB raw / 232 KB gzip** (`2bvhrbiexp-1_.js`, contains three + RoomEnvironment + scene) | `npm run build` + gzip measure; lazy `ssr:false`, excluded from initial payload |
| 3 | three source reference | 650 KB `three.module.js` / 366 KB min (pre-tree-shake ceiling) | `node_modules` sizes |
| 4 | Runtime canvas texture | ~640 KB GPU + mipmaps ≈ 850 KB (512×320 RGBA, drawn once, disposed) | computed from source constants |
| 5 | Shadow target | ~1 MB (512², transient) | computed from source constants |
| 6 | Draw buffer observed | 481×481 @ DPR 1 (headless); real DPR-2 desktop ≈ 962² capped by DPR 1.75 | live probe |
| 7 | Frameloop in view (high) | damped lerps only (Rig/Yaw/glow), no controls/post-processing | source + live |
| 8 | Frameloop out of view | `"never"` (shell IO) — zero per-frame cost | source (IO threshold 0) |
| 9 | Frameloop reduced | N/A — no Canvas mounted post-fix (was: "never" + blank) | live |
| 10 | JS heap delta (poster vs 3D) | inconclusive in dev (83.9 vs 47.9 MB across reloads — GC noise) | `performance.memory`, reported honestly, not claimed |
| 11 | Before/after fix | no regression possible: fix REMOVES a Canvas mount for reduced users; normal path byte-identical | reasoning (single guard, no geometry/material change) |

Rejected enhancements: none proposed — nothing in §§7/10 warranted change; any
material/lighting "improvement" would add cost against measurement #2 with zero
breakage to fix.

## 18. LCP / CLS posture

Figure reserves `aspect-[4/3] min-h-64 lg:aspect-square` before the bundle resolves
(poster fills it) — layout shift from 3D load: none by construction. Canvas is
lazy/hydration-gated, so LCP is the H1/lede text, never the model. No CLS observed
across 6 captures (poster and canvas states share the identical box).

## 19. Verification runs

- `npx tsc --noEmit`: exit **0** (before and after fix).
- Unit tests: theme (phase6c) + homepage (phase6): **2 files, 17 tests, all pass**.
  No 3D unit tests exist (R3F/WebGL not jsdom-meaningful — live browser used instead).
- `npm run build`: **succeeds** (18/18 static pages, all routes listed).
- `npm run lint`: **9 errors / 7 warnings — identical to baseline**, zero in
  `scene-shell.tsx` (touched file clean). 3D-file hits are pre-existing
  (wrapper 110/131, scene 36/55/60/84 — baseline recorded in audit §8).

## 20. Screenshots viewed (all 6, each actually opened)

Saved OUTSIDE repo: `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-9\`.

| File | Verdict |
|---|---|
| `hero-desktop-light.png` | Laptop renders; intentional dark-on-paper contrast; CTA dominant — ACCEPTABLE, no change |
| `hero-desktop-dark.png` | Coherent brand surface; caption cycling live — ACCEPTABLE, no change |
| `hero-mobile-light.png` | Stacked layout, laptop renders below CTA — no breakage, no change |
| `hero-mobile-dark.png` | Renders; caption stage tracking live ("STRUCTURE REVEAL") — no breakage, no change |
| `hero-reduced-motion.png` | POST-FIX: designed line-art poster + honest caption — PASS (pre-fix: blank canvas — FAIL, fixed) |
| `hero-poster-state.png` | Chunk-failure simulation: poster + caption, page usable, layout held — PASS |

## 21. Deviations, limitations & no-further-work

- Deviations from "no-change default": exactly one — the reduced-motion poster guard
  (functional breakage, not taste). Audit doc corrected in 4 factual spots (§3).
- Limitations: heap attribution inconclusive in dev (reported, not claimed); WebGL-dead
  and render-error paths code-verified only (chunk-failure simulated live as proxy);
  prod-size numbers from build, runtime numbers from dev (stated per-row in §17).
- No Phase 10 started. Nothing staged or committed (team-lead owns staging).
