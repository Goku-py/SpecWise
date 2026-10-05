# SPECWISE V2 — PHASE 9 AUDIT (3D baseline, read-only)

> Phase 8 §0 correction already applied (fetch-images.ts + seed.ts report-only). This doc audits
> the existing 3D system before incremental Phase 9 work. Prior findings incorporated from
> Phase-0 DESIGN-AUDIT §§5/17 and 6C direction §§8/15 (cited, not re-derived).

## 1. Files

- `src/components/hero/hero-laptop-wrapper.tsx` (214 lines, "use client") — quality detection,
  in-view gating, workload highlight cycling, scroll-stage caption, pointer parallax source, poster.
- `src/components/three/hero-scene-bundle.tsx` (33) — dynamic bundle boundary (DOM poster outside Canvas).
- `src/components/three/hero-laptop-scene.tsx` (150+) — lights, grid, shadows, env, Rig, YawGroup, explode.
- `src/components/three/hero-laptop.tsx` — procedural model (per Phase-0: chassis box, instanced 48+3 keys,
  trackpad boxes, lid/bezel/webcam sphere, PartSlab boxes cpu/gpu/vram/ram×2/storage/battery, 512×320
  canvas screen sRGB/aniso-4; no GLTF/HDR/image textures).
- `src/components/three/scene-shell.tsx` (85) — shared Canvas wrapper (below).
- `src/components/three/hero-topology.tsx` — node/link/particle field (mount PARTIAL per Phase-0; out of scope).
- `src/components/three/exploded-laptop.tsx` — detail-page explorer (out of scope for Phase 9 homepage work).
- `src/components/three/workload-highlights.ts` — pure vocab (`HARDWARE_VOCAB`, `WORKLOAD_HIGHLIGHTS`, `PartId`).
- `src/components/hero/hero-wrapper.tsx` + `workload-demo.tsx` — topology mount path (PARTIAL; untouched).

## 2. Canvas configuration (scene-shell.tsx:65-79)

`frameloop: inView && !reduced ? "always" : "never"` (shell's OWN IO state, threshold 0 —
NOTE Phase-9 correction: the wrapper's `inView` prop arrives at the scene as dead `_inView`
(hero-laptop-scene.tsx:75) and `quality` does NOT gate the frameloop; low-quality
frameloop behavior was overstated in §§4–5, see correction note at end of this doc).
DPR clamped `low [1,1.25]` / `high [1,1.75]`. `gl antialias + alpha + high-performance`.
Camera fov 40 at `[3.5,1.8,4.8]`, transparent background. WebGL context probe in `onCreated`
→ poster fallback; `CanvasErrorBoundary` → poster on render error.
Phase-9 fix: `reduced` now also renders the poster (frameloop "never" produced zero
frames — a blank canvas, not a static frame; see §6 correction). Container `aria-hidden="true"`
(canvas decorative; caption + DOM carry meaning).

## 3. Lighting / materials / environment (hero-laptop-scene.tsx:110-127)

Ambient 0.35; warm key 1.6 (`#FFF4E8`); cool rim 0.35 (`#9DB8FF`); cyan + orange point accents
(`#38E1FF` 0.4, `#FF5500` 0.3 — brand-matched, low intensity, no bloom/post-processing).
PMREM `RoomEnvironment` (zero external assets, disposed on unmount), `environmentIntensity 0.45`.
`ContactShadows` black 0.7. Ground: `gridHelper [14,28]` dark (`#1A1E29/#11141C`, opacity 0.35) with
theme-aware `--hero-grid` container background (6C/6D: Light verdict = acceptable blueprint grid).

## 4. Controls / animation / interaction

- Pointer parallax: wrapper `onPointerMove` writes normalized `pointerRef`; `Rig` damps camera x/y
  (±0.5/±0.3), `YawGroup` damps model yaw ±0.12. Subtle, CTA-safe.
- Scroll explode: `explodeTarget = scrollY/vh × 0.85`, rAF-throttled; caption mirrors stage
  (`stageForProgress`: Assembled/Structure/Internal/Explanation).
- Workload highlight cycling: 6s interval over `WORKLOAD_IDS`, paused on reduced-motion or explicit
  workload selection; drives `activeParts` → PartSlab emissive.
- No OrbitControls; no auto-spin; no looping spectacle. Default frame is a composed static laptop.
- CORRECTION (Phase 9, verified against source): low quality does NOT make "all animation
  inert" and does NOT stop the frameloop. Only the scroll explode is forced 0
  (`animated = !reduced && quality === "high"`, hero-laptop-scene.tsx:80) and DPR is
  clamped; `Rig`, `YawGroup`, and all `useGlowLerp` emissive lerps check only `reduced`
  and keep running per-frame on low quality while in view. Likewise the DOM caption
  stage readout checks only `reduced` (wrapper:130), so on low quality the caption may
  name a stage ("Structure reveal") the model does not show — documented nuance, not fixed
  (default no-change: not breakage).
- All animation inert when `reduced` (explode forced 0, Rig/Yaw return early,
  cycling off, frameloop "never", caption reset to "Assembled laptop").

## 5. Lazy boundary / gating / fallback

`next/dynamic ssr:false` bundle; loading poster = `HeroPoster` (static SVG line-art + sr-only caption).
Figure reserves `aspect-[4/3] min-h-64 lg:aspect-square` (no CLS). Double IO gating (wrapper IO
drives cycling; shell IO drives frameloop — the scene-level `inView` prop itself is dead,
see §2 note). Quality: `pointer:coarse || width<1024 → low` (wrapper:84-96; low = DPR ≤1.25
+ explode off — NOT full animation-off, see §4 correction). WebGL fail → poster div;
render error → boundary poster. Caption ends "Illustrative, not a recommendation." whenever a
workload is highlighted; the no-selection fallback reads "Assembled view · Illustrative
preview." (also the poster/loading/reduced caption). No fake product/score/price claims
anywhere in 3D copy.

## 6. Reduced motion

`useReducedMotion` hook at wrapper + shell; cycling/scroll/parallax all early-return;
caption resets to "Assembled laptop". CORRECTION (Phase 9, browser-verified with real
`prefers-reduced-motion: reduce`): the old "static-first (one frame, frameloop never)"
claim was false — frameloop "never" renders zero frames, so reduced-motion users saw a
BLANK canvas (grid + caption, no laptop; screenshots in Phase-9 3D doc §12). Fixed in
Phase 9: `SceneShell` renders the designed `HeroPoster` when `reduced`
(one-line guard, `webglFailed || reduced`), so static-first is now literally true.
SSR default animates then corrects (known flash, Phase-0 PARTIAL — 6C static-first principle applies to new motion; existing flash is
pre-existing behavior, not a Phase 9 requirement).

## 7. Theme behavior

Scene materials are dark-tuned; container background + grid token `--hero-grid` are theme-aware
(6C §12, 6D Light verdict: acceptable — dark chassis reads as product-render contrast on warm paper).
Accent point lights match brand in both themes. No separate 3D theme architecture exists (correct —
System inherits via CSS tokens).

## 8. Performance posture (unmeasured — Phase 9 must measure)

Assets: zero external (no HDR/GLTF/textures; one runtime canvas texture). Meshes ~20 + instanced keys.
Cost centers: PMREM generation once per mount; per-frame damped lerps only when in view + high quality.
No perf instrumentation exists. `powerPreference: high-performance` set. Pre-existing lint:
`set-state-in-effect` in wrapper (lines 110/131 — baseline, untouched).

## 9. Phase 9 direction (incremental, not architectural)

Keep R3F system, model, loader, lazy boundary, gating, reduced-motion handling. Allowed: Light-mode
intentionality tune ONLY if measurement/screenshots show breakage (6D says acceptable — default is
no-change); interaction restraint audit; perf measurement + documentation; failure-path verification.
Forbidden: new engine, new assets pipeline, redesign of hero copy/sections/themes, Phase 10 work.
