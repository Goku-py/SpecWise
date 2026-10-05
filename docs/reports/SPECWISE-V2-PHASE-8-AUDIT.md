# SPECWISE V2 — PHASE 8 AUDIT: PRODUCT-IMAGE EXPERIENCE (READ-ONLY)

> Status: AUDIT ONLY. No source modified. Prime principle for Phase 8: IMAGE CORRECTNESS > QUANTITY — never attach uncertain images.
> Baseline: Phase 7 frozen at commit `048846d` (per task brief; commit not re-verified here).
> Baseline docs read: `SPECWISE-V2-PHASE-0-AUDIT.md` (§18 images), `SPECWISE-V2-DATA-AUDIT.md`, `SPECWISE-V2-PHASE-4-RESULTS.md` (§16, §19), `SPECWISE-V2-PHASE-7-DETAIL-COMPARE.md`, `SPECWISE-V2-PHASE-6C-VISUAL-DIRECTION.md` (§22–24), `SPECWISE-V2-PHASE-6D-PRE-SHIP.md`.
> Evidence standard: every claim cites `FILE:LINE`. Labels: UNKNOWN = cannot verify from repo · PARTIAL = exists but incomplete · INFERENCE explicitly marked.
> Prior claims verified (not assumed): single `imageUrl` per laptop — CONFIRMED; Unsplash-only `remotePatterns` — CONFIRMED; `ProductImage` + Monitor fallback — CONFIRMED; v3 results carry NO image — CONFIRMED; `LaptopImage` model — ABSENT from schema (see §1); admin free-text `imageUrl` — CONFIRMED; seed Unsplash fill script — CONFIRMED.

---

## 1. Schema: every image-related field (`prisma/schema.prisma`, 559 lines)

### 1a. `Laptop.imageUrl` — the ONLY live product-image column

- `prisma/schema.prisma:68` — `imageUrl String?` (nullable, no `@default`, no `@unique`, no FK, no comment).
- Field nullability: OPTIONAL (null = no image; every consumer null-checks — see §2).
- Relations: NONE (scalar only). No relation to any image/asset/file model.
- Indexes: NONE covering `imageUrl`. Sole `Laptop` index is `prisma/schema.prisma:84` `@@index([status, createdAt(sort: Desc)])`.
- Sibling visual columns on the same model (for context, not images): `reviewScore Float?` (`:69`), `notes String?` (`:70`). No `imageAlt`, `imageSource`, `imageCredit`, `imageUpdatedAt`, `imageStatus`, `imagePosition`, or ordering column anywhere on `Laptop`.

### 1b. `LaptopImage` model — DOES NOT EXIST in this schema

- Full-schema read (`prisma/schema.prisma:1-559`): models present are `Laptop, SlugRedirect, LaptopPrice, RateLimit, Lead, Brand, Retailer, PriceSnapshot, Product, SpineSlugRedirect, ProductPrice, SpinePriceSnapshot, LaptopSpec, LaptopPort, LaptopWireless, LaptopSecurity, CpuSpec, GpuSpec, MotherboardSpec, RamSpec, PsuSpec`. There is NO `model LaptopImage`.
- Repo-wide grep for `LaptopImage` returns ZERO `src/` or `prisma/` hits — only three doc mentions: `docs/PRODUCTION-AUDIT.md:215` (a *proposed* `model LaptopImage { id, laptopId, url, position, isPrimary }` that was never implemented), `docs/reports/SPECWISE-V2-PHASE-0-AUDIT.md:216` ("`LaptopImage` model unused by flows"), `docs/reports/SPECWISE-V2-DATA-AUDIT.md:83` (`LaptopImage` usage listed as UNKNOWN). Correction to the Phase 0 wording: the model is not "unused" — it is **absent**. No migration creates it: the only image-related migration DDL found is `prisma/migrations/20260707071011_init/migration.sql:47` (`"imageUrl" TEXT`) and `prisma/migrations/20260802_phase2_schema_v2/migration.sql:33` (`"logoUrl" TEXT` on Brand). No gallery/alt/source/attribution/ordering/status support exists at the DB layer.

### 1c. `Product.imageUrl` (spine, NOT live)

- `prisma/schema.prisma:303` — `imageUrl String?` on `Product` (same shape: nullable scalar, no relation, no index; `Product` indexes at `:326-329` cover status/brand/category/popularity only).
- Spine has NO read path (per `SPECWISE-V2-DATA-AUDIT.md` §1; `src/app/sitemap.ts:41-43` confirms the router still resolves legacy `Laptop.slug`). `Product.imageUrl` is write-only via backfill: `prisma/scripts/backfill-spine.ts:309` copies `imageUrl: laptop.imageUrl` verbatim (pass-through, no validation, no provenance stamping); mock rows use `imageUrl: null` (`backfill-spine.ts:376,443`). Spine validation is `src/lib/validation/product.ts:188` (`z.string().url().max(2048).nullable().optional()` — URL-shaped but host-unrestricted; see §2f).

### 1d. `Brand.logoUrl` (declared, UNUSED)

- `prisma/schema.prisma:159` — `logoUrl String?` on `Brand`. Migration DDL exists (`20260802_phase2_schema_v2/migration.sql:33`).
- Repo-wide grep for `logoUrl` in `src/`: exactly ONE hit — the Zod mirror `src/lib/validation/product.ts:152`. Zero component, page, API, or seed consumer renders or writes it. Status: DEAD column (schema + validation only).

### 1e. What the schema does NOT support (explicit)

No per-product: image ordering/position, primary flag, alt text, source/attribution/photographer, license, fetch status (`pending/verified/rejected`), `sourceUpdatedAt` for images (the `Laptop.sourceUpdatedAt` at `schema.prisma:74` tracks the *row source*, not the image), dimensions, or multi-row gallery. Any truthful gallery or deterministic-primary work requires additive schema work (listed as a gap in §10, no plan proposed per instructions).

---

## 2. Every consumer of `imageUrl` across `src/` (+ scripts)

Grep `imageUrl|ProductImage|resultImageSrc|logoUrl|LaptopImage` over `src/` = 53 matches. Exhaustive per-surface inventory:

### 2a. Catalog card (live)

- `src/components/catalog/laptop-card.tsx:7` imports `ProductImage`; `:22-29` renders `<ProductImage src={laptop.imageUrl} alt={brand+model} width={200} height={112} priority={priority} className="max-h-28 object-contain …">` inside an `h-32` framed container (`:21`).
- Data: `src/app/laptops/(catalog)/page.tsx:17-44` (`toCardDto` maps `imageUrl: l.imageUrl`, price from `prices[0]`); type `CatalogLaptop.imageUrl: string | null` (`src/lib/types.ts:104`).

### 2b. Detail page (live, LCP)

- `src/app/laptops/[id]/page.tsx:17` imports `ProductImage`; `:405-412` renders `<ProductImage src={laptop.imageUrl} alt={brand+model} width={400} height={256} priority className="max-h-64 object-contain">` with comment `:403` "Image — LCP element, so mark priority (never lazy)". Always `priority`, never lazy.
- Structured data: `:165` `...(laptop.imageUrl ? { image: laptop.imageUrl } : {})` — image emitted into `Product` JSON-LD only when non-null (honest omission otherwise).

### 2c. Compare (live, both routes share one table)

- `src/components/compare/compare-table.tsx:6` imports `ProductImage`; TWO call sites for the same column image: mobile stacked card `:70-76` (`src={col.imageUrl} alt={brand+model} width={240} height={150}`) and desktop table header `:141-147` (`src={col.imageUrl} alt="" width={160} height={100}` — empty alt, see §8).
- Column type `CompareTableColumn.imageUrl: string | null` (`compare-table.tsx:23`); builders `src/app/compare/page.tsx:64-77` (`toColumn`: `imageUrl: l.imageUrl`) and `src/app/compare/[slugs]/page.tsx:283-296` (same mapping).
- Structured data + social: `[slugs]/page.tsx:189` (JSON-LD `image` when non-null, per node), `:230` (`const image = a.imageUrl ?? b.imageUrl` — first-available wins), `:242` OG `images: [{ url: image, alt: "A vs B" }]`, `:248` twitter `images: [image]`, both spread-conditionally (omitted when both null).

### 2d. Results v3 (live — deliberately imageless)

- `src/lib/recommend/v3/types.ts:125-148` (`RankedItemDTO`): fields are `laptopId/brand/model/variant/price…/scores/confidence…/specs` — NO `imageUrl`, NO `slug`. Verified absence (not oversight).
- `src/lib/recommend/v3/engine.ts:266-315`: the `ordered.map` builds each DTO field-by-field (`laptopId: l.id` at `:291`, specs projection at `:308-313`) and never copies `l.imageUrl` even though `ScorableLaptop.imageUrl` exists (`src/lib/types.ts:289`, populated by `toScorable` at `src/lib/catalog-cache.ts:204`). The drop happens at DTO construction — image data reaches the engine but is excluded from the wire/display contract.
- `src/lib/results-presentation.ts:109-112` — `resultImageSrc(_item: unknown): null` (always null; comment `:104-108` documents the DTO carries no image).
- `src/components/results/ResultsHero.tsx:41-47` — `<ProductImage src={resultImageSrc(item)} alt={brand+model} width={120} height={90}>` → permanent neutral fallback slot (see §4). `OptionCard.tsx:1-44` renders NO image at all (no `ProductImage` import). `MoreOptions.tsx:1-21` passes items through without images.
- Tests lock this in: `src/lib/__tests__/results-presentation.test.ts:163-166` (`resultImageSrc` null), `src/components/results/__tests__/results-mapping.test.ts:133-136` (`"imageUrl" in item === false`, `resultImageSrc === null`).

### 2e. Dormant legacy results grid (unmounted, still image-wired)

- `src/components/results/results-grid.tsx:109-116` (top match `src={top.imageUrl} width={224} height={144} priority`) and `:216-223` (alternatives `src={laptop.imageUrl} width={96} height={64} loading="lazy"`). Type `RecommendedLaptop.imageUrl: string | null` (`src/lib/types.ts:201`). Per Phase 7 §11 the only live `matchScore%` language survives in this same dead file — the whole module (images included) is dormant. Its test fixture `tests/e2e/fixtures/results.ts:47-48,92-93,137-138` hardcodes three Unsplash `imageUrl`s (captured 2026-08-03 live responses — historical evidence that image-bearing payloads once flowed through the legacy path; see §6).

### 2f. Admin form + write layer + validation (live)

- Form surface: `src/lib/laptop-fields.ts:65` — `{ name: "imageUrl", label: "Image URL", type: "string", help: "https://images.unsplash.com/…" }` (free-text `type="text"` input via `src/app/admin/laptops/laptop-form.tsx:73-82` default branch; no `type="url"`, no preview, no host check, no thumbnail).
- Form validation: `src/lib/laptop-fields.ts:101` (`optionalString` = trim, max-1000, nullable) reused at `:146` (`imageUrl: optionalString`) — NO `.url()`, NO host allowlist. Any string ≤1000 chars (including `not-a-url`, `http://evil/x.jpg`) passes the admin form.
- API PATCH validation is even weaker: `src/lib/db/catalog.ts:62-64` — `imageUrl` sits in the `string` whitelist, `validateLaptopPatch` (`:51-90`) checks only `typeof value === "string"`.
- Spine validation is stricter on shape but not host: `src/lib/validation/product.ts:188` (`z.string().url().max(2048)`) — rejects non-URLs, still allows any host.
- Persistence: `src/lib/db/catalog.ts:272` (`toLaptopData` passes `imageUrl` through), `:28` (whitelisted editable), create/update/upsert paths all carry it (`:301-309, :356-361, :444-459, :506-521`). `resolveBrandId`/slug logic untouched by images.

### 2g. Search API + category page + landing projection (live)

- `src/app/api/laptops/search/route.ts:111` — `imageUrl: l.imageUrl` in the public search payload (no transformation, no host filter).
- `src/app/category/[useCase]/page.tsx:97` — `imageUrl: s.imageUrl` projected onto the legacy `RecommendedLaptop` shape for category rendering (PARTIAL: category template rendering of the image was not traced — whether the category page actually mounts `ProductImage` or `results-grid` is UNVERIFIED; the data flows, the render is UNKNOWN).
- `src/components/landing/illustrative-machine.ts:14,41` — `IllustrativeMachine.imageUrl` projected from `scorable.imageUrl` (`toIllustrativeMachine`). PARTIAL: downstream render of `IllustrativeMachine.imageUrl` (whether any landing card mounts an `<img>`/`ProductImage` with it) was not traced — UNKNOWN.

### 2h. Seed + scripts (provenance — see §6)

- `scripts/fetch-images.ts:1-53` (one-shot Unsplash null-fill; `prisma.laptop.findMany({ where: { imageUrl: null } })` at `:21`, query `` `${brand} ${model} laptop` `` at `:27`, `urls.small` stored at `:40-42`, 1.5s delay at `:26`).
- `prisma/seed.ts:226` writes `imageUrl: lap.imageUrl || null` on CREATE only (update path at `:175-182` touches slug/brandId/isPopular/notes/dataSource — re-seed PRESERVES image edits; INFERENCE from Phase 0, code-consistent). Opt-in Unsplash step `seed.ts:275-305` gated on `SEED_FETCH_IMAGES=1` + `UNSPLASH_ACCESS_KEY` (default: SKIP, rows complete with null — `:276-277`).
- `scripts/fetch-laptops.ts:62` declares `imageUrl?: string` on the merge type but NEVER assigns it: `mapTechSpecsV5` (`:223-327`) maps specs only, `fetchPricesFor` (`:374-409`) maps prices only, merge (`:486-490`) spreads entry+specs+prices — no image key touched. TechSpecs/PricesAPI contribute ZERO image data. `scripts/generate-laptops.ts`: no `imageUrl|image|unsplash` hits at all.
- `data/laptops.json`: grep for `imageUrl` across the whole file = ZERO matches — no seed row carries an image key (sampled rows `data/laptops.json:1-80` confirm: price/os/specs/notes present, no image field).

### 2i. Cache / types plumbing (pass-through, no filtering)

- `src/lib/catalog-cache.ts:204` (`toScorable`: `imageUrl: l.imageUrl`), `src/lib/types.ts:104` (`CatalogLaptop`), `:165` (`LaptopDetail`), `:201` (`RecommendedLaptop`), `:289` (`ScorableLaptop`) — all `string | null`, all verbatim copies. No host validation, normalization, or fallback selection anywhere in the read path.

---

## 3. `next.config.ts` images config + CSP alignment (exact values)

File: `next.config.ts:1-53`.

- `images.remotePatterns` (`:7-11`): EXACTLY one entry — `{ protocol: "https", hostname: "images.unsplash.com" }`. No `port`, no `pathname` restriction (any path on that host allowed).
- `images.domains`: ABSENT (not set — correct; `remotePatterns` is the mechanism).
- `images.loader`: ABSENT (default Next optimizer).
- `images.qualities`: ABSENT (defaults).
- Any other `images.*` keys (`formats`, `deviceSizes`, `imageSizes`, `minimumCacheTTL`, `unoptimized`): ABSENT.
- CSP `img-src` (`next.config.ts:29`): `"img-src 'self' https://images.unsplash.com data:;"` — host set MATCHES `remotePatterns` exactly (same single host; `data:` additionally allowed for inline/SVG but irrelevant to `next/image` optimization). `connect-src 'self'` (`:30`), no image-CDN connect needs. Alignment: CONSISTENT — but both enforce Unsplash-only, so any non-Unsplash `imageUrl` (which admin validation permits — §2f) will fail optimization at render (see §9).
- HSTS prod-only (`:37-42`); `poweredByHeader: false` (`:6`). No redirects/rewrites affecting images.

---

## 4. `ProductImage` implementation + per-call-site behavior

File: `src/components/ui/product-image.tsx:1-49` (client component, `useState`, `next/image`, `Monitor` icon, `cn` util).

- Props (`:8-23`): `src: string | null`, `alt: string` (REQUIRED, no default), `width: number`, `height: number` (both REQUIRED — every call site passes literals), `className?: string`, `priority?: boolean`, `loading?: "lazy" | "eager"`. NO `sizes`, NO `fill`, NO `placeholder`/`blurDataURL`, NO `quality`, NO `onError` passthrough, NO fallback-src prop.
- Fallback (`:27-35`): `if (!src || error)` → `<div class="flex shrink-0 items-center justify-center rounded-lg bg-card text-muted …"><Monitor className="h-8 w-8" /></div>`. No text, no alt rendering, no retry, no broken-image icon — a neutral tile. `useState(false)` error latch (`:25`) set by `onError` (`:44`); once errored, stays fallback for the component lifetime (no reset on `src` change — PARTIAL edge: if `src` prop changes after an error, the latch persists; INFERENCE from code, no remount key at call sites).
- Success path (`:37-47`): `<Image src width height className={h-auto w-auto shrink-0 + className} onError priority loading>`. No `sizes` → responsive behavior UNKNOWN beyond the fixed width/height + CSS `max-h-* object-contain` overrides at call sites (all call sites add `object-contain` + max-height; intrinsic ratio comes from width/height props).

Per-call-site matrix:

| Call site | src | alt | WxH | priority/loading | Renders on null | Renders on error |
|---|---|---|---|---|---|---|
| Catalog card `laptop-card.tsx:22-29` | `laptop.imageUrl` | `brand+model` | 200x112 | `priority` only for above-fold (`priority?` prop) | Monitor tile in `h-32` frame | Monitor tile (latch) |
| Detail `[id]/page.tsx:405-412` | `laptop.imageUrl` | `brand+model` | 400x256 | ALWAYS `priority` | Monitor tile in bordered `p-8` panel | Monitor tile (latch) |
| Compare mobile `compare-table.tsx:70-76` | `col.imageUrl` | `brand+model` | 240x150 | neither (default) | Monitor tile | Monitor tile |
| Compare desktop `compare-table.tsx:141-147` | `col.imageUrl` | `""` (empty) | 160x100 | neither (default) | Monitor tile | Monitor tile |
| Results hero `ResultsHero.tsx:41-47` | ALWAYS `null` (`resultImageSrc`) | `brand+model` | 120x90 | neither | ALWAYS Monitor tile (`h-[90px] w-[120px]`) | n/a (never loads) |
| Legacy grid top `results-grid.tsx:109-116` (dormant) | `top.imageUrl` | `brand+model` | 224x144 | `priority` | Monitor tile | Monitor tile |
| Legacy grid alt `results-grid.tsx:216-223` (dormant) | `laptop.imageUrl` | `brand+model` | 96x64 | `loading="lazy"` | Monitor tile | Monitor tile |

- `placeholder`/`blur`: NONE anywhere (no `blurDataURL`, no `placeholder="blur|empty"`, no shimmer/Skeleton wrapping any `ProductImage`; `SkeletonCard` in `laptop-card.tsx:83-102` is a static pulse block for loading state, unrelated to images).
- `sizes`/`fill`: NONE anywhere. Priority usage: detail always; catalog conditional; legacy-top always; everything else default (lazy-by-Next-default is INFERENCE — Next `Image` without `priority` lazy-loads by default; not explicitly set except legacy-alt `loading="lazy"`).

---

## 5. `public/` asset inventory (product images? OG images?)

`public/` glob (14 entries):

- `public/window.svg`, `vercel.svg`, `next.svg`, `hero.svg`, `globe.svg`, `file.svg` — stock/illustration SVGs (Next template leftovers + hero art). No product photography.
- `public/screenshots/{quiz,laptop-detail,home,compare,category,catalog}.png` — UI SCREENSHOTS of app pages (docs/marketing), not per-product images. Not referenced by any product surface (no `ProductImage` src points at `/screenshots`).
- NO `/public/products/`, `/public/laptops/`, `/public/images/`, `/public/og/` directories. NO per-product JPG/PNG/WebP. NO `opengraph-image.*` / `twitter-image.*` route files (metadata OG images are remote Unsplash URLs or absent — `layout.tsx:29-44` root metadata sets NO `images`; only `compare/[slugs]` sets OG images from `imageUrl`).
- `src/app/manifest.ts:15-22` icons: only `/favicon.ico` (comment `:15` "Only real icon asset on the site"). No maskable/purpose icons.
- Verdict: ZERO local product images; ZERO pre-rendered OG images. Every product visual is either a remote Unsplash URL or the Monitor fallback.

---

## 6. Source / provenance reality (where today's `imageUrl` values come from)

Verified chain (strongest-evidence-first):

1. **Seed file contributes NOTHING.** `data/laptops.json` contains ZERO `imageUrl` keys (repo grep: no matches; first-row sample `:2-41` shows the full key set — brand/model/specs/prices/notes, no image). `validateSeedRow` (`prisma/seed.ts:116-131`) never checks images. So a fresh `seed.ts` run writes `imageUrl: null` for every row (`seed.ts:226` `lap.imageUrl || null` → null), and re-seed never backfills images on the update path (`:175-182` omits `imageUrl`).
2. **The ONLY automated populator is the Unsplash keyword search** (`scripts/fetch-images.ts:20-47`, mirrored opt-in inside seed at `prisma/seed.ts:275-305`). Query = `` `${brand} ${model} laptop` `` (`fetch-images.ts:27`), `per_page=1&orientation=landscape` (`:28`), stores `results[0].urls.small` (`:40-42`) — the FIRST search hit, sight-unseen. No human review, no model-match check, no exact-product verification, no photographer/attribution stored, no query/result logged to the DB.
3. **TechSpecs + PricesAPI contribute zero image signal** (`scripts/fetch-laptops.ts` — `imageUrl` appears once at `:62` as an optional merge-type field, never assigned; both API mappers return specs/prices only; §2h).
4. **Admin manual entry is the only other writer** (free-text URL, no host guard — §2f). No bulk-image import path (`importLaptops` carries whatever `imageUrl` the row has, same weak validation).
5. **Deterministic product-ID→image identity: NONE.** There is no mapping table, no filename convention (`{id}.jpg`), no content hash, no per-model curated URL list, no `isPrimary`/verified flag. Identity is `Laptop.imageUrl` (a single opaque string) OR null. The Unsplash path is keyword-decorative by construction: `per_page=1` + first-hit means the stored photo is "whatever Unsplash ranked first for '<brand> <model> laptop'", which for niche SKUs typically resolves to a GENERIC laptop/desk photo, and for ambiguous model names (e.g. "Envy 16", "IdeaPad 1", "Modern 15") may resolve to an unrelated machine entirely.
6. **Evidence of mismatched/generic images: INDIRECT, not row-level.** (a) Historical fixture `tests/e2e/fixtures/results.ts:47-93` shows the mechanism's output shape: Unsplash `photo-*` IDs with `ixid` search-context tokens embedding queries like `MSI Stealth 14 Studio laptop`, `Acer Predator Helios 16 laptop` — i.e. search-derived URLs, and the `ixid` timestamps (`1785650435`, `1785650434`, `1785640419`) cluster within one fetch session, consistent with bulk first-hit fill. Whether the underlying `photo-1617294864710` etc. depict the NAMED model cannot be verified from the repo (no photo-content metadata; would require fetching each URL — OUT OF SCOPE for this audit, and live prod DB state is UNKNOWN per Phase 6C §22: DB unreachable `ECONNREFUSED`, vs Phase 0's "live prod DB is empty" observation — current row contents unverifiable either way). (b) Structural guarantee of NON-determinism: same query at different times can return different first hits (Unsplash ranking is not pinned; `fetch-images.ts` stores no photo ID, only the CDN URL, and never re-validates). Marking "mismatched rows exist in prod": UNKNOWN (cannot query the DB from here). Marking "the pipeline CAN attach a wrong/generic photo with no tripwire": CONFIRMED by code (`fetch-images.ts:38-42` — no check between `results[0]` and the named product).
7. **Attribution**: NONE stored or rendered. Unsplash URLs used are `images.unsplash.com/photo-*` CDN links (no `utm`/photographer params in the stored shape); no credit line in any component; no license field. (Legal-display compliance is a gap — §10.)

---

## 7. Gallery support (multiple images per product?)

NONE at any layer — verified at all three:

- **Schema**: no array-of-images column, no child image table, no `LaptopImage` model (§1b). Single nullable `imageUrl` is the entire model on both `Laptop` (`schema.prisma:68`) and `Product` (`schema.prisma:303`).
- **Component**: `ProductImage` takes a single `src: string | null` (`product-image.tsx:17`) — no `srcs`/`images`/`index`/`carousel`/`lightbox` props; no gallery component exists in `src/components/` (glob `src/components/product/*` = only `buy-button.tsx`, `detail-pricing.tsx`; no `*gallery*`, `*carousel*`, `*lightbox*` files repo-wide — INFERENCE from glob+grep, no `gallery` hit in `src/` outside prose comments).
- **UI**: every surface renders at most ONE image per product (catalog 1, detail 1, compare 1-per-column-per-breakpoint but same `src`, results 0-or-fallback, OG 1). No thumbnail strip, no image picker, no second-slot markup anywhere.
- Status: gallery = NOT SUPPORTED (not PARTIAL — wholly absent).

---

## 8. Alt-text practice per call site

- Catalog `laptop-card.tsx:24`: `alt={brand+model}` (e.g. "Dell XPS 13"). Informative, correct pattern.
- Detail `[id]/page.tsx:407`: `alt={brand+model}`. Same. (LCP image, no `fetchpriority` beyond `priority`.)
- Compare mobile `compare-table.tsx:72`: `alt={brand+model}`. Same.
- Compare desktop `compare-table.tsx:143`: `alt=""` — EMPTY (decorative treatment). INCONSISTENT with the mobile rendering of the SAME image (same `src`, same column): screen readers get the name on mobile markup and silence on desktop markup. Flagged as inconsistency, not crash.
- Results hero `ResultsHero.tsx:43`: `alt={brand+model}` on a PERMANENT fallback tile (the `Monitor` div renders no `<img>`, so alt is never exposed; harmless but misleading in code — suggests an image where none loads).
- Legacy grid `results-grid.tsx:111,218` (dormant): `alt={brand+model}`. Same pattern.
- OG/Twitter `compare/[slugs]/page.tsx:242`: `alt: "A vs B"` (`${nameOf(a)} vs ${nameOf(b)}`) — names only, no "photo of" claim (appropriately non-committal given §6).
- JSON-LD: no alt concept (URL only, conditional).
- Missing everywhere: variant in alt (all sites use brand+model, dropping `variant` — "MacBook Air M4" 13" vs 15" share alt text), no `role`/caption/photographer credit, no long-description. Fallback tile has no accessible label at all (the `Monitor` div at `product-image.tsx:29-33` carries no `role="img"`/`aria-label` — screen readers skip the tile silently; whether that is correct-decorative or missing-information is a Phase 10 a11y call, recorded here as OBSERVED).

---

## 9. Failure modes per surface (404 / timeout / invalid-host / malformed URL)

`ProductImage` itself NEVER crashes: `!src` → fallback (`product-image.tsx:27`), `onError` → latch → fallback (`:44,27-35`). No throw path in the component. But the COMPONENT is not the whole story:

- **Null/empty** (the common case — seed default): every surface degrades to the Monitor tile. No layout break (containers have fixed heights: `h-32`, `p-8` panel, `max-h-*`). Detail page renders its bordered panel with a lone icon — honest but sparse. Results hero ALWAYS this state (by design).
- **404 / timeout / unreachable file on `images.unsplash.com`**: `next/image` fires `onError` → fallback tile. No crash, no broken-image glyph. PARTIAL: loading-state UX — while the fetch is in flight there is no skeleton/shimmer (empty frame until resolve); on slow networks the tile pops in late. No retry.
- **Invalid host (e.g. admin pastes `https://example.com/x.jpg` or `https://mfr.com/img.png`)**: Next 16 `next/image` with `remotePatterns` REJECTS non-allowlisted hosts at optimization time. Expected behavior (framework-documented, NOT executed here — no dev server render performed): the `<Image>` throws/errors ("Invalid src prop … hostname is not configured") and, because `ProductImage` has NO error boundary of its own, the error propagates to the nearest boundary — `src/app/*/error.tsx` if present, else a route-segment crash. `onError` does NOT catch config-time validation failures (INFERENCE from Next semantics + code shape: `onError` handles runtime load failure, not prop validation). CONSEQUENCE: a single non-Unsplash `imageUrl` — which admin validation PERMITS (§2f) — can break the ENTIRE route segment (catalog card grid, detail page, compare table) rather than degrading to the fallback tile. This is the highest-severity image finding: **allowlist enforcement exists only at render, while writes accept anything**. Mark: CONFIRMED mismatch (write-accepts vs render-rejects), crash mechanics INFERENCE (not executed).
- **Malformed URL** (`"not-a-url"`, `""`, whitespace): `""`/whitespace-only is truthy-falsy edge — `!src` catches `""` → fallback (safe). Non-empty garbage (`"foobar"`, `"//x"`, `"javascript:…"`) reaches `<Image src>` → same invalid-src path as above (likely segment error, not fallback). Admin CAN store these today (`optionalString` has no format check). CSP `img-src` would additionally block non-allowlisted schemes at the browser layer for plain `<img>`, but `next/image` optimization fails first.
- **Oversized/huge file on allowlisted host**: no `imageSizes`/`minimumCacheTTL` tuning; `next/image` resizes server-side per `width` — no page crash expected (INFERENCE), possible slow LCP on detail (400x256 requested, source `urls.small` is w=400 class — roughly matched, PARTIAL alignment).
- **JSON-LD/OG with bad URL**: inert strings — no fetch, no crash. Worst case is invalid structured data / broken social preview (silent, SEO-only). `...(image ? … : {})` guards null but NOT malformed (a garbage non-null string IS emitted into JSON-LD/OG — PARTIAL honesty gap).
- **Anything that can crash a page?** YES (conditional): one non-Unsplash or malformed non-empty `imageUrl` on a rendered row risks a route-segment error on every surface that row appears (catalog grid, detail, both compares, search-driven views, category). Nulls and Unsplash-404s are safe (fallback). The blast radius is bounded only by the fact that TODAY most rows are presumably null (seed default) — actual prod row contents UNKNOWN (§6).

---

## 10. What's missing (gaps only — no implementation plan per instructions)

Numbered gaps with file:line anchors for the missing capability:

1. **Deterministic primary image per product** — MISSING. No curated URL list, no filename convention, no mapping table, no verified flag: `Laptop` has one opaque `imageUrl` (`schema.prisma:68`); DTO drops even that (`engine.ts:266-315` builds no image field); the only filler is first-hit search (`fetch-images.ts:40-42`). Nothing binds a photo to a product ID with certainty.
2. **Truthful gallery** — MISSING ENTIRELY (§7). No schema (`LaptopImage` absent — §1b), no component, no UI. Multi-angle/color-accurate views impossible without additive work.
3. **Deliberate fallback** — PARTIAL. The Monitor tile exists (`product-image.tsx:27-35`) and is consistently reached, but it is UNDIFFERENTIATED: "no photo yet" vs "photo failed to load" vs "photo rejected (wrong host)" all render identically, with no accessible label (§8) and no admin signal (no report/missing-image view; admin table `src/app/admin/page.tsx` has zero image references — grep: no matches).
4. **Domain allowlist (write-side)** — MISSING. Render enforces Unsplash-only (`next.config.ts:8-10`); writes accept anything (`laptop-fields.ts:101,146`; `catalog.ts:62-64`; spine `product.ts:188` shape-only). The two sides disagree — this is both a correctness gap (wrong-host URLs storable) and the crash vector (§9).
5. **Validation (format + provenance)** — MISSING/PARTIAL. Form: no `.url()` (`laptop-fields.ts:146`); PATCH: `typeof string` only (`catalog.ts:63`); spine: `.url()` but host-open (`product.ts:188`); seed: no row check (`seed.ts:116-131` ignores images); backfill: verbatim copy (`backfill-spine.ts:309`) through a `.url()`-shaped spine schema that still permits any host. No validation records source/attribution/license anywhere.
6. **Alt-text/attribution model** — MISSING. No `imageAlt` column, no photographer/license columns (§1e); desktop-compare empty alt vs mobile informative alt (`compare-table.tsx:72` vs `:143`); fallback tile unlabeled (`product-image.tsx:29-33`).
7. **Provenance/audit trail** — MISSING. No `imageSource` (search-query vs manual vs curated), no fetched-at timestamp, no Unsplash photo-ID (only the derived CDN URL is kept — the query that produced it is lost), no mismatch-reporting path. `fetch-images.ts` logs to stdout only (`:34,38,41,43-45`).
8. **Results-surface image contract** — DELIBERATELY ABSENT (locked by tests: `results-presentation.test.ts:163-166`, `results-mapping.test.ts:133-136`). Any Phase 8 decision to show product photos in results MUST reckon with `RankedItemDTO` carrying no image/slug (`types.ts:125-148`) and `resultImageSrc` pinned to null — the DTO boundary is the constraint, not the component.
9. **Observability for the crash vector** — MISSING. No validation-time host check, no render-time error boundary around `ProductImage` call sites, no admin surfacing of rows whose `imageUrl` would fail `remotePatterns`. UNKNOWN whether `error.tsx` boundaries exist per route (not inventoried here — PARTIAL).
10. **Local/OG image assets** — ABSENT BY DESIGN SO FAR (§5: zero product files in `public/`, no `opengraph-image` routes, root metadata imageless at `layout.tsx:29-44`). Social previews for catalog/detail rely on remote Unsplash-or-nothing (`[slugs]/page.tsx:230-250`, `[id]/page.tsx:165`).

UNKNOWN/PARTIAL register (explicit): prod DB row contents + current `imageUrl` values (DB unreachable — Phase 6C §22); whether any stored photo depicts its named model (requires per-URL content check, out of scope); category-page image render (data flows at `category/[useCase]/page.tsx:97`, template mount UNKNOWN); landing `IllustrativeMachine.imageUrl` render (projection at `illustrative-machine.ts:41`, downstream mount UNKNOWN); non-Unsplash crash mechanics (INFERENCE, not executed); `error.tsx` per-route coverage (not inventoried); `sizes`/`placeholder` performance posture (absent = UNKNOWN impact, unmeasured); sitemap image extension (not used — `sitemap.ts:45-63` emits URLs only, no `images` entries — OBSERVED, arguably a gap for image SEO, listed without recommendation).
