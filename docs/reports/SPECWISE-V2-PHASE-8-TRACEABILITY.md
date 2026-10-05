# SPECWISE V2 — PHASE 8 TRACEABILITY (requirement → implementation → test → visual)

> Parent audit anchors: `docs/reports/SPECWISE-V2-PHASE-8-AUDIT.md`. Parent brief: Phase 8 task
> (§8 of the session brief). "Visual" = dev-server screenshot × Light/Dark in
> `C:\Users\Pratik\AppData\Local\Temp\opencode\specwise-8d\`, or EXPLICITLY UNVERIFIABLE.

| # | Requirement (brief) | Implementation | Test | Visual verification |
|---|---|---|---|---|
| 1 | Validation hardening: https + allowlisted-host image URLs in admin form schema (`laptop-fields.ts`), PATCH validation (`catalog.ts validateLaptopPatch`), import schema | `optionalImageUrl` refine in `src/lib/laptop-fields.ts:104-114,158`; PATCH branch in `src/lib/db/catalog.ts:62-79`; import inherits via `LaptopFormSchema.shape`; spine `ProductBaseSchema` refine in `src/lib/validation/product.ts:188-191`; shared `PRODUCT_IMAGE_HOSTS` in `src/lib/product-image.ts:16` | `product-image.test.ts`: "LaptopFormSchema imageUrl" (2), "validateLaptopPatch imageUrl" (2), "spine ProductBaseSchema imageUrl" (2) | Admin form rejects evil host (screenshot `admin-*.png` if writable in dev; else schema-level only — see note R1) |
| 2 | Deterministic display model: one shared resolver for card/detail/compare/results | `resolveProductImage` in `src/lib/product-image.ts:24-32`; identity rule in file comments | "resolveProductImage" (2), determinism assertion (same input → same output) | All four surfaces render identically for a null-image row (screenshots) |
| 3 | Results images: enrich DTO server-side at build; zero scoring use; update locked expectations | `attachResultImages` + `resultImageSrc` in `src/lib/results-presentation.ts:104-147`; wire-ready (DTO shape frozen — see IMAGES.md §8) | Scoring-firewall test ("images NEVER influence scoring"), `validateV3Results` tolerance; updated `results-presentation.test.ts` + `results-mapping.test.ts` expectations | Results hero/options show honest fallback on unenriched DTO (`results-*.png`) |
| 4 | Detail gallery: primary + thumbnails + selected + keyboard + announcements; truthful single-image today; no lightbox; aspect-reserved; lazy non-hero; priority only LCP hero | `src/components/ui/detail-gallery.tsx`; mounted in `src/app/laptops/[id]/page.tsx:403-409` with `priority` | Structural (no gallery-data fixtures exist); keyboard/aria covered by code review + browser check | Detail page screenshot shows primary/fallback slot (`detail-*.png`) |
| 5 | Fallback redesign: deliberate "Image unavailable" frame, Monitor idiom, neutral, same aspect, Light/Dark/System | `ProductImageFallback` in `src/components/ui/product-image.tsx:14-44` | Indirect: resolver fallback branches + screenshots (no DOM env for class asserts) | Fallback tile visible in catalog/compare/results shots |
| 6 | Alt text factual "{brand} {model}"; fix desktop `alt=""` | `productImageAlt` (`product-image.ts:35-39`); `compare-table.tsx:143-147` fixed | "productImageAlt" (2) | DOM/axe spot-check via screenshots (alt not visible; code-level) |
| 7 | Perf/hygiene: sizes everywhere; priority heroes only; no new client runtime | `sizes` on all 7 `next/image` call sites + gallery thumbs | None (build + lint guard regressions) | `npm run build` success |
| 8 | Themes/mobile/a11y: containers + fallback in 3 modes; no overflow; no color-only selection | Token-only styling; `aria-current` + ring + text; `role="img"` labels | None runnable in node env (recorded, not faked) | Light/Dark screenshot pairs per surface |

Notes:
- R1: Admin write paths need a live DB + auth key; with remote Neon unreachable, write
  gates are verified at schema/unit level (safeParse + validateLaptopPatch pure calls),
  NOT via a live admin POST. No seed/migrate/write was performed per boundaries.
- Frozen-file deviations: `RankedItemDTO` (in `recommend/v3/types.ts`), `/api/quiz` route,
  and `results-view-v3.tsx` unchanged — results enrichment is presentation-ready, wire
  deferred (see IMAGES.md §8). No scoring/ranking/binding code touched (`git status`
  shows only the listed files modified).
- Counts: `npm run test:unit` 6 files / 79 passed / 3 skipped (baseline 5 / 56 / 3);
  mapping suites 24 / 6 skipped (baseline 23 / 6); `tsc` exit 0; `build` ok;
  `eslint` on 16 touched files 0 errors (baseline 0).
