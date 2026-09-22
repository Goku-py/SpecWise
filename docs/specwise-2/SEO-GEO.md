# SpecWise 2.0 — SEO / GEO Requirements

No ranking promises. Implement in later phase; routing constraints binding now.

## IA
`/` (proof-first) · `/category/[useCase]` (whitelist else notFound; unique copy per use-case) · `/laptops` (SSR canonical; `?q=` canonicalizes to base or SSR param) · `/laptops/[id]` · `/compare` + `/results` (noindex shells, OUT of sitemap) · `/guides/*` (methodology, RAM/storage sizing, TGP-vs-GPU, OLED/P3 glossary) · budget hubs only if data-backed. Fix/remove dead `#api` anchor; unify Database/Catalog naming.

## Crawlability
Canonical on all indexable routes; `noindex,follow` on `/results /compare /admin* ?q= ?ids=`; sitemap = 8 static + categories + active laptops w/ lastModified; robots Allow:/ Disallow:/admin,/api; fix `metadataBase` localhost fallback in prod. Per-page titles/descriptions + OG images (new asset; `public/` currently svg-only).

## Facts (GEO)
SpecRow tables; balanced strengths/weaknesses; region-consistent pricing (UI region = JSON-LD Offer region/currency — kill lowest-across-regions mismatch); real `availability` (kill hardcoded InStock); visible `lastUpdated/published` + `priceValidUntil`; methodology + org/author entity; "best/#1" only with dated method + scope.

## Structured data
Organization + WebSite + SearchAction(`/laptops?q=`) · Product + Brand + Offer(region-consistent) + sku/url/image · BreadcrumbList (`ol/li` — fix current nav>Link+span) · ItemList (catalog/category) · FAQ (guides/category visible Q&A only) · no AggregateRating without real reviews. JSON-LD `</script>`-escaped.

## Internal linking
Breadcrumb Home/Category/Product; detail gets 3–6 related (same useCase + adjacent budget); guides ↔ category/detail bidirectional.
