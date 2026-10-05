# SPECWISE V2 — PHASE 7 AUDIT (pre-implementation)

> Read-only audit by explore subagent, verified by file reads with file:line evidence.
> No files modified. Frozen baseline: commit 4ffb119.

## 1. Detail route (`src/app/laptops/[id]/page.tsx`, 477 lines, all-server)

- `LaptopDetailPage` (231), `generateMetadata` (81), `generateStaticParams` (39). No `"use client"`.
- Identity: `resolveLaptop` (49-55) = `getLaptopBySlug` first, `getLaptopById` fallback after decode (50). Legacy-id hit → `permanentRedirect('/laptops/${slug}')` 308 in both metadata (97) and body (247). Unknown → single-hop `slugRedirect` 308 (61-68, 238-242), else `notFound()`.
- `force-dynamic` (37); `dynamicParams=true` (32); static params neutralised by force-dynamic.
- Section order: back-link → H1 brand+model(+variant) + OS + Popular/reviewScore (328-356) → `DetailPriceLine` min–max (352) → refurb note → `ProductImage` LCP priority (359-368) → `ExplorerWrapper` ssr:false (371-373) → spec grid 8 sections via local `Section`/`SpecRow` (376-444) → `DetailPricingTable` (447) → rivals "Compare with similar devices" ×3 (450-474).
- Prices: `priceRows` from `laptop.prices` (285-293), server-resolved `href` via `buildAffiliateUrl` (271-277); client filters by cookie region (detail-pricing 36-65), renders nothing on zero rows. `BuyButton` null when href null.
- Rivals: `pickRivals` (196-208, same-gpu → closest displaySize, slug-only, 3); links via `canonicalComparisonPath` (306-310).
- SEO: title `${brand} ${model} — SpecWise`; `buildProductJsonLd` (139-180) region-filtered, cheapest-current else cheapest-regional, sku=id, canonical slug URL.
- Region: cookie → `normalizeRegion` → US fallback (251-252). No loading/error/not-found segment files.

## 2. Compare routes (disjoint, share only `canonicalComparisonPath`)

- `/compare` (`page.tsx` 21 lines + `compare-content.tsx` client): reads ONLY legacy `specwise-results` via `readResultsSnapshot()` (64); URL `?ids=a,b` (88); no add/remove, no max; legacy `matchScore` + `MatchBadge` only (193, row 47); no winners; empty states all h2; table `min-w-[600px]` sticky-col + region/tabIndex + Arrow-key handler (16-20, 176-182).
- `/compare/[slugs]/page.tsx` (444 lines, server): `<a>-vs-<b>` slug-or-id each side; `resolvePair` tries every `-vs-` split (59-71); force-dynamic; canonical set in metadata (220) but NO redirect on non-canonical order; server catalog data; region server-side; cheapest-current regional offer; price + reviewScore only, no scores, no winners; 19 spec rows; JSON-LD `@graph` (no fabricated counts); GEO summary; detail links `/laptops/${slug ?? id}` (368); single h1.

## 3. CompareContract.ts (27 lines, verbatim read)

`ResultsCompareContext { ids: string[]; overall: Record<string, number> }`; `buildResultsCompareContext(dto, count=3)` takes first N in engine order, carries `laptopId` + `scores.overall`. Types-only, no UI. Only production importer is its own test — intentionally deferred.

## 4. Results handoffs today

- Detail links: `ResultsHero:77`, `OptionCard:36-41` via `detailHref` = `/laptops/${encodeURIComponent(laptopId)}` (id fallback + 308). DTO has no slug; `resultImageSrc` always null.
- Compare CTA in v3 results: NONE. `ResultsActions` offers Change-priorities / Copy-answers-link / Start-over only; comment defers compare to Phase 7.
- Legacy `results-grid.tsx` (no v3 importer — dead UI) holds the only compare entry: unbounded toggle + bar → `/compare?ids=`.

## 5. Binding consumption

`bindingStateFor(storedProfile, readBinding())` → bound/stale/unbound; stale renders `StaleNotice`; unbound falls back to legacy region-equality check. Invalid profile hides copy-link; results still render.

## 6. Catalog retrieval

`getActiveCatalog(region)` (region-filtered prices, cache TTL 3600, tag `laptops-catalog`); `getLaptopById/Slug` (all-region prices, callers filter); `pickBestOffer` (cheapest-valid else cheapest-stale + flag, null when empty); `toScorable` (priceMissing when no rows, USD fallback). Detail uses slug/id getters; `[slugs]` uses getters + `pickBestOffer`; legacy compare uses none.

## 7. Storage keys

`specwise-results` (legacy, reader only — NO writer in src), `specwise-v3-results`, `specwise-v3-profile`, `specwise-v3-binding`. v2 envelope `{v:2, savedAt, data}`; legacy raw accepted+migrated on read.

## 8. Visual system status

Detail and both compares use theme tokens throughout — zero hardcoded hex/rgb in all three files. Palette-named classes (`text-yellow-500`, `text-amber-500`, `bg-accent-success/5`, `bg-red-500/10`) present; light-mode safety of those mappings UNKNOWN (tokens not inspected). Mono for values/labels, sans for headers — consistent with 6C voice, though detail spec grid is dense dashboard-adjacent. No `ui/card` on any of the three surfaces.

## 9. Mobile + a11y status

Both compare tables: `min-w-[600px]` scroll region + sticky first col + `role="region"` + tabIndex; only legacy compare has Arrow-key handler. Detail pricing table has NO region semantics. Single H1 on all three data states; empty states use h2-only (no h1). Affiliate anchors carry sponsored rel. Detail specs stack `grid sm:grid-cols-2`.

## 10. Tests

No test renders detail or `[slugs]` pages. Coverage: e2e `results-compare.spec.ts` (`?ids=` table; heading assertion STALE — expects "Your Matches", renders "Your best match"); `results-mapping` (detailHref, CompareContract passthrough); `results-presentation` (detailHref); `compare-pairs` (canonical ordering); `result-binding`; `storage`; API-level jsonld/slug-redirect. E2E fixture `tests/e2e/fixtures/results.ts` seeds both pools (contents UNKNOWN).

## Routes rendering Detail/Compare

`/laptops/[id]` (detail) · `/compare?ids=` (legacy personal) · `/compare/[slugs]` (SEO pair). Detail linked from `/`, `/laptops`, results, legacy grid, `[slugs]` cards. Footer → `/compare`; sitemap → `/compare` + slugs + bounded pairs.

## Dead/legacy paths

1. Legacy `specwise-results` has a reader but no writer → `/compare?ids=` always empty for v3 users.
2. `results-grid.tsx` dead UI holding the only compare CTA.
3. `buildResultsCompareContext` imported only by its test.
4. `/compare?ids=` unbounded columns; `getActiveCatalog` import on detail used only for neutralised static params; `initialRegion` voided.

## Top 5 unification risks

1. Two compare data universes, no bridge: `?ids=`×legacy-snapshot vs `[slugs]`×server-Postgres; v3 DTO ids match neither URL scheme and DTO carries no slugs.
2. Three scoring languages, no shared component: legacy matchScore% vs no-scores vs v3 overall+W/C/V.
3. Non-canonical `[slugs]` URLs never redirect (canonical set, no 308) — selection affordances will grow duplicate-URL debt without canonicalisation.
4. Region handling differs per page: client-filter (detail) vs server-filter (`[slugs]`) vs ignored (`/compare`).
5. Only working compare entry lives in dead legacy UI targeting a key nothing writes; wiring entries without a writer (or id→slug mapping) yields empty states.
