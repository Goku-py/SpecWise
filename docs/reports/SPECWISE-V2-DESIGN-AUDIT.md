# SPECWISE V2 — DESIGN AUDIT (Phase 0 satellite)

> Read-only; `ui-ux-pro-max` + `impeccable` used as observation lenses (no redesign).
> Observation vs recommendation separated; no fixes.

## 1. Journey (as coded)

LANDING `/` (`HomePage`→`LandingPage`: Hero→WorkloadExperience→HardwareStrip→MatchingEngine→CatalogProof→Trust→
FinalCta in `WorkloadProvider`; empty-DB degrade, no crash) — hero H1 + CTAs `/quiz` + `#methodology`; trust bullets
"Zero affiliate bias / Real catalog prices / Quick match · No account". Workload cards: "Preview here" (ephemeral 3D
glow, no nav/state) vs "Start match →" (prefill `?s=`). `CatalogProof` labeled illustrative, not ranking. FinalCta
quiz-only (no browse on-ramp; header/footer only). Confusions: dual-action equal weight; browse-first dead end.
QUIZ `/quiz?s=` (`QuizPage`→dynamic `V3Quiz`, `QuizLoading` skeleton; legacy `?workload=`→empty fail-safe) — 4+1
steps, Zustand draft, submit→localStorage→`/results`, `role="alert"` errors, `canNext` step-0-only. "Only show"
prefer→hard chips noisy (8 chips/4 OSes); progress denominator shifts 4→5. RESULTS (`ResultsPage`→`ResultsViewV3`,
`void initialRegion`) — client localStorage-gated, `null` flash then bounce if absent; "Your Matches" + region line
+ exhausted(red)/relaxed-ledger(amber)/contradictions blocks + Best-match (`FScoreMeter`, W/C/V, `ConfidenceBadge`,
`WhyBlock`) + "More options" grid, no pagination. **No detail links, no compare handoff, no share; region changes
don't re-render.** DETAIL entry via catalog/compare/legacy-grid (never v3 results). COMPARE = two disjoint systems,
no cross-link from results. Transitions: prefill URL · Zustand memory · POST DTO → localStorage · refine rehydrate ·
region cookie+store.

## 2. Detail (`/laptops/[id]`, server force-dynamic + US static params + 308s)

Order: JSON-LD → Back → H1 `brand model (variant)` + OS + Popular/reviewScore + `DetailPriceLine` (min–max) +
refurb note → LCP `ProductImage 400×256 priority` → `ExplorerWrapper` (ssr:false) → 8-section spec grid (local
`Section`/`SpecRow`) → `DetailPricingTable` (client region filter) → 3 canonical rivals (`pickRivals`: same gpuType,
closest size, slug-only). Sources: `getLaptopBySlug/ById` (cached 3600) · `slugRedirect` 308s · `generateMetadata`
(`specSummary`) · `buildProductJsonLd` (cheapest current regional offer; none→offers omitted; region cookie→US
fallback) · `prisma.retailer` + `buildAffiliateUrl` (null→no button) · `priceRows` all-regions→client filter ·
`buildLayerSpecs` (DB-only, "—" gaps; heatsink placeholder). Hybrid: shell/hero/specs/rivals server; pricing islands
(`useClientRegion(US)` SSR snapshot → cookie post-mount) + explorer + ProductImage client. Stale comment: "ISR/static".

## 3. Compare (two systems, share `canonicalComparisonPath` only)

A `/compare?ids=` (client, `CompareContent`): URL ids × localStorage **legacy `specwise-results` only** (v3 users→
"No results found" dead end); 12 fixed rows (Price/OS/CPU/Cores/GPU/RAM/Storage/Display/Panel/Battery/Weight/Match
Score; dead boolean branch); legacy score display, no v3 W/C/V, no charts/3D, no winners, no max count
(`min-w-[600px]` scroll), no on-page add/remove (upstream legacy `ResultsGrid` bar), URL unshareable without snapshot.
B `/compare/[slugs]` (server force-dynamic, `resolvePair` on every `-vs-`, canonical α-sorted + metadata,
sitemap-bounded via `buildComparisonPairs`): catalog data + region prices + JSON-LD `@graph` (+AggregateRating only
if reviewed) + GEO summary; 19 rows + product cards (image/price/score/BuyButton); no scores/quiz context; none
visuals/winners; exactly 2; URL-shareable+SEO. Footer→A; detail→B; results→neither.

## 4. Images

Single `imageUrl` per laptop (all DTOs passthrough; `z.url().max(2048).nullable` validation; admin help points at
Unsplash; **`LaptopImage` model unused by flows**). `ProductImage` ("use client", `next/image`, Monitor-icon fallback,
no blur/sizes/loader; detail 400×256 priority LCP, cards 280×180/200×112 first-priority, legacy 224×144 + 96×64 lazy;
**v3 results: no image**). `remotePatterns`: exactly `images.unsplash.com` (+CSP match) — other hosts fail
optimization; admin free-text has no domain guard. Alt always `brand+model`; hero poster `aria-hidden`+sr-only.
Skeletons only in catalog/quiz; no blur-up. No CDN beyond optimizer. No gallery/carousel.

## 5. Three.js (procedural viz, NOT physical)

Hero (`HeroLaptopWrapper`→`HeroSceneBundle`→`HeroLaptopScene+Rig+YawGroup`→`HeroLaptop`: chassis box, instanced 48+3
keys, PartSlabs, 512×320 canvas screen sRGB/aniso-4, PMREM RoomEnvironment, no HDR/GLTF) · Topology (8 node spheres
CPU/GPU/RAM/DISPLAY/THERMAL/BATTERY/STORAGE/SCORE + links + 80–200 particles; **mount PARTIAL**) · Shell (`SceneShell`,
`CanvasErrorBoundary`, IO-gated, DPR ≤1.75/≤1.5/≤1.25, disposal, ~20 meshes) · Explorer (`ExplorerWrapper`→
`ExplorerSection`→`ExplodedLaptop`: 8 mini-model layers, click-select, `[4.8,3.6,5.8]` fov42). Textures: canvas +
procedural only. Controls: pointer-parallax (±0.12 yaw damp), scroll explode (rAF, `stageForProgress`
Assembled/Structure/Internal/Explanation + figcaption), raycast hover, topology tap. Cameras/lighting per scene;
`useFrame` damped lerps; reduced-motion static. All entries `dynamic ssr:false` + DOM poster fallbacks (HeroPoster
SVG, pulses). Canvas `aria-hidden` + DOM equivalents (buttons/captions). Copy exception: explorer "inspect its real
specs" beside generic fins + all-"—" heatsink rows (`buildLayerSpecs`) overpromises physicality.

## 6. Design system (`globals.css`, Tailwind v4, no config file)

Dark-only `:root` (`#090A0F/#F3F4F6/#12141C/#1A1D28/#1F2430/#343B4D/#9CA3AF/#6B7280`, `--accent #FF5500`,
`--electric #38E1FF`, `--violet #7C6CFF`); radius 8/12/16/20; `--shadow-elev-1/2`, `--glow-electric`; `@theme inline`
legacy aliases (warn `text-text-secondary`); `@utility hairline/glow-accent`; keyframes
fade/slide/float/glow-pulse. Typography: Geist Sans + JetBrains Mono (`display:swap`); `.hero-h1` (800,
clamp 2.5→4.25rem, −0.03em, 1.05), `.lede`, `.eyebrow` (mono 12 upper); mono pervasive for specs/prices.
Usage mostly token-consistent; raw hex isolated to 3D; dangling `accent-soft` (detail badge, PARTIAL dead).
Rhythm `py-8 sm:py-12` pages / `py-16 lg:py-24` landing; containers 7xl/6xl/5xl(results+slugs)/4xl(detail)/3xl(quiz)/
2xl(empty); gaps 3–4, padding 5–6. Cards `rounded`→`rounded-xl` mix vs `Card` primitive (`rounded border bg-card
p-6`); v3/detail/compare hand-roll same look (duplication); `Badge` 4 variants mono-upper; `Progress` h-1.5 accent;
`MatchBadge` thresholds. `buttonVariants` primary/secondary/outline/ghost/danger, sm/md/lg (h-8/10/12), focus rings;
quiz lg + mono spans; `BuyButton` reuse + `p-3.5 -m-3.5` hit-area. Inputs: number (hidden spinners) + native
select/checkbox + `Chip`/`RangeSlider` (dual-range; **quiz-flow consumer not found**, PARTIAL legacy/admin) +
`WeightSlider` (legacy `ResultsGrid` only). No dialog/drawer/toast primitives. Nav: server `Header`→`HeaderClient`
(sticky compact 4rem→3rem, anchors Workloads/Method/Machines/Trust, `RegionPicker` listbox dual-instance, mobile menu
focus-restore + Escape + `inert`) + `Footer` (engine meta/scoring version, links, affiliate disclosure) + skip link.
Breakpoints Tailwind defaults only; no container queries. Motion: quiz `motion/react` only + `useCountUp` (rAF,
instant on reduced) + `animate-fade-in` + global reduced-motion collapse. Icons lucide (+2 inline footer SVGs).
Verdict: token-core coherent dark-terminal voice; component-layer duplication (Card/divs, two Sections, SpecRow/
SpecCard, scroll-region a11y compare-only); 3 heading idioms; 2 stale comments.

## 7. Component architecture (grouped)

Layout/nav: `RootLayout` (fonts/metadata/JSON-LD/`BootSequenceWrapper`/skip/Header/main/Footer) · `Header(Client)` ·
`RegionPicker` · `Footer` · `BootSequence` (session-gated, Escape, reduced-skip, ssr:false). Forms: `Button`,
`Badge`, quiz-local `Chip`/`MustPreferBlock`/`AdvancedPanel`, `RangeSlider` (dormant?), `WeightSlider` (legacy),
native controls. Quiz: `V3Quiz` + store + `Progress` + share. Results: live `ResultsViewV3`/`ConfidenceBadge`/
`WhyBlock`/`FScoreMeter` (SVG donut 132px, count-up, `role="img"`) vs dormant legacy
(`ResultsGrid`+compare-bar, `EvidenceFlow`, wrapper; no route import). Catalog: server page (`toCardDto`) →
`CatalogView` (debounced search, `/` shortcut, skeleton/empty/error) → `LaptopCard` (memo, whole-card link) +
`SkeletonCard`. Detail: page + `DetailPriceLine/Table` + `BuyButton` (`noopener sponsored`, blank) + `ProductImage` +
explorer. Compare: A/B above + `compare-pairs`. Charts: live `FScoreMeter` vs orphan `RadarChart` (8-axis, mouse-only
hover, no consumer). 3D: `three/*` + `hero/*` + explorer; orphans `TerminalBox`, possibly `hero-visual`,
`illustrative-machine-card` (UNKNOWN depth). Admin: cookie table (unpaginated) + `ToggleStatusButton` + `LoginForm` +
`LaptopForm` (UNKNOWN depth) + actions + `api/admin/*`. Feedback: none (no form/widget/toast; inline `role="alert"`
+ `error/not-found` PARTIAL).

## 8. State

Zustand draft → POST → localStorage DTO (committed, never refetched; stale risk) + profile (refine); legacy
`specwise-results` → compare-A only (v3 miss); `?ids=` selection-only; `?s=` full-profile ≤8192; `region` cookie +
`region-store` mirror; `specwise-boot-seen` session; `unstable_cache` app-wide. No quiz Context (landing-only
`WorkloadProvider`, PARTIAL); no session cookies beyond region/admin_key; no query lib.

## 9. A11y (as coded)

Single H1s, landmarks, `section+aria-labelledby`, `th scope`, `fieldset/legend`, `dl`, `figure/figcaption`; quiz
labels + `aria-label`s + `role="group"`; sliders labeled; picker listbox semantics; scroll regions labeled (compare);
`FScoreMeter role="img"`; boot `role="status"+aria-live`; banners `role="status"`; `aria-pressed/current`;
topology `aria-hidden`. All actions native; quiz sequential-operable; compare Arrow-scroll `tabIndex=0`; no modals;
3D DOM-duplicated. Focus rings everywhere; RangeSlider thumbs PARTIAL. Contrast unmeasured (accent/amber/red small
mono at risk; `text-border` decorative). Reduced-motion exemplary except SSR flash (default animate→correct).

## 10. Responsive (as coded)

`viewport` set; safe-area only mobile menu; quiz `max-w-3xl` (budget 2-col even at 360px — tight); catalog `sm:2
lg:3`, whole-card links, `/` kbd hidden mobile; tables `overflow-x-auto min-w-[600px]` + sticky col (keyboard path
compare-only); FScore 132px fits; Radar 320px fixed (dormant); hero `aspect-4/3 min-h-64 lg:square` + <1024px/coarse
downgrade; explorer `h-80`/`h-64` pulse; nav `md:` switch + `min-h-11` targets; detail `max-w-4xl` stack, `p-8`
`max-h-64` image; admin desktop-first scroll; boot `fixed inset-0 z-[9999] pointer-events-none` (never blocks).
No landscape rules, no container queries. No device rendering executed.

## 11. Top UX issues (observed)

1. Results cul-de-sac (no detail/compare/share; bounce unexplained). 2. Dual compare, zero continuity (footer→A,
detail→B, results→neither). 3. V3 best-match text-only (no image). 4. "Only show" footguns + non-relaxable
budget-min/OS/refurb → red zero-state with no culprit path. 5. Landing dual-action split + no browse on-ramp.
6. Explorer physicality overpromise. 7. Unsplash-only fragility (silent fallback, no authoring signal).
8. Component duplication drift risk.
