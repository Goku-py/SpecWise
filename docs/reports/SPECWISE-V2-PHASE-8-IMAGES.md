# SPECWISE V2 — PHASE 8: PRODUCT-IMAGE EXPERIENCE (IMPLEMENTATION)

> Prime principle: IMAGE CORRECTNESS > QUANTITY — uncertainty → FALLBACK, never a guessed image.
> Parent audit: `docs/reports/SPECWISE-V2-PHASE-8-AUDIT.md` (§ references below are to that audit).
> Boundaries honored: no changes to `src/lib/recommend/**`, `src/app/api/quiz/**`, quiz semantics,
> result binding, scoring/ranking; no Phase 9/10 work; no new dependencies; no DB seed/migrate/write;
> dirty Phase 2–5 files (`results-view-v3.tsx`, `V3Quiz.tsx`, `storage.ts`, `useV3QuizStore.ts`) untouched.

---

## 1. Direction

One validated image per laptop or a deliberate "Image unavailable" frame — never a guessed,
wrong-host, or broken image. The audit's highest-severity finding (audit §9: a single
non-Unsplash `imageUrl`, which admin validation permitted, risks a whole route-segment crash
because `next/image` rejects non-allowlisted hosts at optimization time) is closed at the
write layer, with a read-time safety net for legacy rows.

## 2. Identity rule (deterministic per laptop id)

A laptop's display image is EXACTLY the validated `Laptop.imageUrl` scalar stored for that
row — or nothing. No filename convention (`{id}.jpg`), no per-model curated list, no keyword
guessing, no host fallback chain. Documented in comments on `resolveProductImage`
(`src/lib/product-image.ts`). Same rule on every surface via the one shared resolver.

## 3. Validation (write-time gates — the crash vector is closed)

| Gate | File | Behavior |
|---|---|---|
| Admin form schema | `src/lib/laptop-fields.ts` (`optionalImageUrl`) | Empty → null; non-empty must be allowlisted https, else Zod rejects |
| Bulk import | `src/app/api/admin/import/route.ts` (spreads `LaptopFormSchema.shape`) | Same gate, no code change needed |
| PATCH API | `src/lib/db/catalog.ts` (`validateLaptopPatch`) | `imageUrl`: `""` clears (stored trimmed); any other value must be allowlisted, else 400 |
| Spine validation | `src/lib/validation/product.ts` (`ProductBaseSchema.imageUrl`) | `.url()` + allowlist refine |

Non-Unsplash/malformed URLs are now un-storable through every write path. Admin help text
updated to "Unsplash only".

## 4. Allowlist (single shared constant)

`PRODUCT_IMAGE_HOSTS = ["images.unsplash.com"]` in `src/lib/product-image.ts` — mirrors
`images.remotePatterns` in `next.config.ts:7-11` exactly (comment says keep in sync).
`isAllowedProductImageUrl()`: https + exact-host match (lookalike subdomains rejected) +
non-empty path + ≤2048 chars. CSP `img-src` already matches the same host (audit §3).

## 5. Resolver (deterministic display model)

`resolveProductImage(imageUrl): {kind:'image',src} | {kind:'fallback'}` — the single
decision point used by catalog card, detail gallery, compare table, results hero/options,
JSON-LD/OG gating, and results enrichment. Read-time use is defense-in-depth for legacy
rows predating the write gates: an invalid stored URL degrades to fallback instead of
crashing `next/image`.

## 6. Gallery (`src/components/ui/detail-gallery.tsx`, client island)

- Single-image reality today: one primary frame; zero valid images → honest fallback slot
  in the same bordered panel (no fake multi-views, no lightbox — deliberately omitted).
- Multi-image ready: thumbnail strip, Arrow/Home/End keyboard nav with focus sync,
  `aria-current` + visible ring + "Image n of N" text (never color-only), `aria-live`
  selection announcements. Thumbnails are `aria-hidden` images inside labeled buttons.
- Truthful labels only: optional per-image `label` rendered when provided; the codebase
  supplies none today, so only positional "Image n of N" shows — no invented view names.
- Primary reserves aspect via intrinsic 800×512 ratio (`max-h-80`, `object-contain`);
  only the primary is ever `priority`. Thumbnails are `loading="lazy"`.

## 7. Fallback redesign (`ProductImageFallback`)

Deliberate SpecWise frame: Monitor-icon idiom kept, plus "Image unavailable" label;
`border-border` + `bg-card` + `text-muted` theme tokens (Light/Dark/System readable);
`aspect-ratio: W/H` inline style matching the real image box (no collapse, no CLS);
`role="img"` + `aria-label="Image unavailable for {brand} {model}"` (icon `aria-hidden`).
All raw fallback usages route through the shared resolver — no ad-hoc null checks remain
at call sites. `ProductImage` error latch is now keyed by src (new URL retries; fixes the
audit §4 stale-latch edge without an effect). Compact tiles (<120px wide or <80px tall,
e.g. option thumbs) render icon-only with the accessible label retained (verified:
full label clipped at that size in browser).

## 8. Results / compare integration

- `resultImageSrc(item)` now reads an optional `imageUrl` through the resolver:
  absent (today's frozen DTO) → null → fallback, preserved; present + valid → URL;
  present + invalid → null.
- `attachResultImages(items, imageMap)` (in `src/lib/results-presentation.ts`): pure
  server-side enrichment helper — attaches validated imageUrls post-scoring, keyed by
  `laptopId`. Scoring firewall test asserts every scoring field is identical before/after
  and engine order is untouched (images NEVER influence scoring).
- ResultsHero + OptionCard (new compact thumb) render through the resolver.
- **Known limitation (boundary-driven):** `src/lib/recommend/v3/*`, `src/app/api/quiz/*`,
  and `results-view-v3.tsx` are frozen, so `RankedItemDTO` still carries no `imageUrl` on
  the wire and results surfaces render the honest fallback until a future phase adds the
  field server-side (`attachResultImages` + read path are ready; `validateV3Results`
  already tolerates the extra key — verified by test, no shape change needed).
- Compare: desktop `alt=""` inconsistency fixed (factual brand+model both breakpoints);
  JSON-LD `image` (detail + compare nodes) and compare OG/Twitter images now emit only
  allowlisted URLs (first-validated-wins for OG).

## 9. Themes / mobile / a11y

- Fallback + gallery use theme tokens only (`bg-card`, `border-border`, `text-muted`,
  `bg-background/40`, `ring-accent`) — verified Light/Dark/System via dev-server
  screenshots (see §14).
- No overflow: fallback `overflow-hidden` + `min(100%, Wpx)` width; gallery/table
  containers unchanged (`overflow-x-auto` region with arrow-key scroll kept).
- Selection state: `aria-current` + ring + position text (compare remove links and
  gallery thumbs). No color-only states introduced.

## 10. Perf / hygiene

- `sizes` added to every `next/image` usage (catalog `45vw→200px`, detail `90vw→400px`,
  compare `80vw→240px` / `160px`, hero/options fixed px, gallery thumbs `96px`).
- `priority` only on genuine heroes: detail gallery primary (LCP), above-fold catalog
  cards (existing conditional prop). Everything else lazy/default. No `placeholder`/
  blur added (no blur data source; avoids fake shimmer).
- New client runtime: gallery + fallback islands only (`ProductImage`,
  `DetailGallery`). Resolver/validation are JSX-free.

## 11. Security

Write gates + read-time resolver together enforce: no `javascript:`/relative URLs stored
or rendered (non-https rejected); no attacker-chosen host reaches `next/image`
(optimization-SSRF surface limited to the allowlisted CDN); PATCH trims input;
length caps (1000 form / 2048 URL) retained. No new network calls, no new deps.

## 12. Provenance / copyright

Unchanged from audit §6: the only automated populator remains the opt-in Unsplash
keyword fill; no photographer/attribution/license columns added (schema work is out of
scope). The gates ensure stored URLs are at least fetchable Unsplash CDN links; content
correctness (photo depicts the named model) is still human-review territory.

## 13. Loading / CLS / error handling

- Aspect reserved everywhere (width/height intrinsics + fallback aspect-ratio box).
- Loading: no skeleton pop-in added; error → latch → labeled fallback, no retry loop,
  no broken-image glyph, no throw path. Invalid-host legacy rows: fallback, not crash.
- Honesty rules: fallback says "unavailable" (never a generic photo); alt text never
  claims a depicted model beyond brand+model; OG/JSON-LD omit rather than emit bad URLs.

## 14. Verification

- `npx tsc --noEmit`: exit 0.
- Unit (`npm run test:unit`): 6 files / 79 passed / 3 skipped (baseline 5 / 56 / 3).
  New `src/lib/__tests__/product-image.test.ts`: 22 tests (allowlist, resolver,
  alt, form schema, PATCH, spine, enrichment firewall, `validateV3Results`
  tolerance, fallback/gallery static markup).
  `results-presentation.test.ts` +1 net (null-contract kept, enriched branches added).
- Mapping suites: 24 passed / 6 skipped (baseline 23 / 6).
- `npm run build`: success (18 routes).
- `npm run lint` on all 16 touched files: 0 errors (baseline 0; one transient
  `set-state-in-effect` introduced and fixed by keying the latch on src).
- Dev-server browser verification × Light/Dark (Playwright, live dev server :3000,
  0 console errors across all navigations, detail 404 clean): screenshots in
  `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-8d\` —
  `catalog-light/dark.png` (empty catalog, honest empty state),
  `results-empty.png` (no stored DTO), `results-light/dark.png` (stored 2-item DTO
  in browser localStorage only — no DB writes — showing hero + option fallback tiles,
  readable in both themes, no overflow), `compare-light/dark.png` (empty state).
  UNVERIFIABLE due to empty catalog (no fabricated data): image-bearing card rows,
  detail gallery primary with a real photo, compare populated table, OG/social cards.

## 15. Limitations (not deferred work — explicit unknowns)

- Prod/remote DB unreachable (Neon): stored `imageUrl` values unverified; write gates
  verified at schema/unit level, not against a live write.
- Results wire enrichment awaits a DTO shape change in frozen files (see §8).
- No per-photo content verification (photo depicts named model) — out of scope.
- `error.tsx` per-route coverage not inventoried (defense now at data layer instead).

## 16. Files changed

New: `src/lib/product-image.ts`, `src/components/ui/detail-gallery.tsx`,
`src/lib/__tests__/product-image.test.ts`.
Edited: `src/lib/laptop-fields.ts`, `src/lib/db/catalog.ts`,
`src/lib/validation/product.ts`, `src/components/ui/product-image.tsx`,
`src/components/catalog/laptop-card.tsx`, `src/components/compare/compare-table.tsx`,
`src/app/laptops/[id]/page.tsx`, `src/app/compare/[slugs]/page.tsx`,
`src/lib/results-presentation.ts`, `src/components/results/ResultsHero.tsx`,
`src/components/results/OptionCard.tsx`, `src/lib/__tests__/results-presentation.test.ts`,
`src/components/results/__tests__/results-mapping.test.ts`.
Docs: this file + `SPECWISE-V2-PHASE-8-TRACEABILITY.md`.
