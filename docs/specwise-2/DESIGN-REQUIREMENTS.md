# SpecWise 2.0 — Design Requirements

Dark-only. No light mode in Phase 1.

## Tokens
Palette bg/surface/card/border/text/muted/accent(`#FF5500`)/success/warning/error + hairline/glow utils (`globals.css`). Consolidate dual legacy/new names to one. Focus-ring token must pass 3:1 vs adjacent bg. Fix muted `#9CA3AF`-on-card to 4.5:1 body / 3:1 large (measure and bump).

## Components & states
Buttons/links (default/hover/focus-visible ring-2/disabled/loading); cards (rest/hover/selected, selection never color-only); sliders (track/fill/thumb/focus, 44px hit, `role=slider` + keyboard); skeletons (`aria-busy`, reduced-motion-safe); empty/error panels + retry; sticky compare header/col; badges: estimate / price-unavailable / adjusted-view / relaxed-filter.
Match meter 0–100 + band labels, single server-score source.

## Motion & 3D
`prefers-reduced-motion`: freeze hero (≤80 particles, viewport-gated), kill stagger (idx×60–200ms) and smooth scrollToTop. Canvases `aria-hidden` if decorative; charts/radar `role=img` + label + full text list equivalent.

## Forms & errors
Every input labeled (`<label>`; placeholder never sole). Quiz cards = real radios in `fieldset/legend`; per-field errors via `aria-describedby`; async errors `role=alert`; results/rank/region updates `aria-live=polite`.

## Layout
Home single H1, proof-first hero (server counts, no hardcodes); quiz one-q-per-view + sticky CTA; results stacked (fix `w-1/4 min-w-[280px]` squeeze); compare horizontal scroll + sticky col; 44px minimum targets (fix 40px header toggle).
