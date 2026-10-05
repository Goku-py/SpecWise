# SPECWISE V2 — DESIGN DIRECTION (Phase 1)

> Visual/motion direction only. No implementation, no CSS values. Current-state evidence in
> `SPECWISE-V2-DESIGN-AUDIT.md`.

## 1. Visual personality

**Assured** — one confident answer per screen, stated first in plain language, evidence trailing.
Never competing equal-weight panels. Limits admitted visibly (missing image, "—" rows, low confidence).

**Forensic** — precision shown, not performed. Every engine number paired with its meaning
("so what for my decision"). No number without its reason attached or one step away.

**Warm** — buying advisor, not monitoring console. Human-voice headlines, breathing room on decision
surfaces, real-machine photography. Warmth lives in copy voice and imagery, never decorative gradients.

**Restrained** — scarcity of emphasis is the premium signal. Accent, glow, motion each appear at most
once per viewport, reserved for the decision point. If everything glows, nothing is recommended.

## 2. Typography: Sans advises, mono cites

- **Human voice = Geist Sans. Owns:** verdicts, headlines, lede, quiz questions, reasoning, empty states, CTAs.
  Dominates by area; first thing the eye lands on in any section is always Sans.
- **Technical voice = JetBrains Mono. Owns:** engine evidence only — FScore numerals, W/C/V/K, spec values/units,
  prices, badges, table data, eyebrow kickers. Compact citation voice proving the sentence above it.
- KEEP eyebrow idiom (mono 12px uppercase) as the terminal signature; KEEP display:swap and hero scale intent.
- EVOLVE: body/quiz/reasoning/buttons/card titles → Sans; collapse 3 heading idioms into 2 roles (Verdict/Evidence).
- The test: cover the numbers on any screen; the remaining Sans alone must still tell the user what to do.

## 3. Spacing, cards, accent

- **Two-tempo rhythm:** verdict breathing room, evidence density. Generous above the verdict, compact below it.
- **Cards are evidence containers, never verdict containers.** Verdicts sit on open background with type + one viz.
- **One border weight for structure, none for emphasis.** Emphasis via type scale + single accent, never nested cards/glow frames.
- **Accent marks the decision, nowhere else:** one primary action per viewport; top-match-only accent; glow fires only on verdict viz.
- **Cyan/violet stay informational** (engine semantics), never decorative. No glassmorphism, gradients, ambient glows.
- KEEP radius scale + elev shadows; converge hand-rolled card divs onto one card idiom ("card" = evidence group).

## 4. Data-viz grammar (engine values only)

- **Overall FScore = single verdict glyph.** KEEP donut (count-up, role=img) as the ONLY circular viz; always verdict-paired + image-adjacent, never standalone.
- **W/C/V/K = comparable bars, not radar.** RETIRE RadarChart (dormant + distorts + mouse-only); parallel bars sharing one scale.
- **Strengths = Sans statements + mono evidence tags**, not chips/badges.
- **Deltas = directional dual-encoded rows** (position/sign + non-color marker, never color alone).
- **Thresholds = stepped human language** ("Best fit" / "Strong alternative" / "Partial fit"), color as reinforcement.
- Forbidden: pies, radar revivals, 3D-embedded data, chartjunk. Every viz element traces to an engine number.

## 5. Image usage (single-image-today reality)

- Images **confirm; scores rank.** Results best-match gains a modest confirming image slot; donut stays dominant. Never let photo quality confer rank advantage.
- Detail/compare/proof stay image-led (correct today). Fallbacks are first-class: designed neutral frame, same size (no shift, no "broken" feel).
- No blur-up gimmicks, no stock collages, never synthesize galleries from one photo (visual equivalent of fabricated specs).

## 6. Motion principles

- **Posture:** stillness by default; motion is an explanation budget. Existing 0.22s step-slide and 700ms count-up are reference ceilings — stay at/under, never grander.
- **Useful:** journey progress (directional quiz slide, standardized); cause-effect (preference change → rows highlight-and-resettle); ranking changes (positional moves, object constancy); revealing reasoning (verdict first, evidence cascade in argument order); result-state transitions (skeleton → donut count-up once).
- **Forbidden:** page transitions; scroll-reveals on decision surfaces; loop/ambient motion outside homepage; re-animating data without recomputation (dishonest motion); parallax/springs/staggers.
- **Reduced-motion:** static frame is the DEFAULT render, animation enhances only after confirmed preference (fix SSR flash). Every suppressed animation leaves its informational equivalent (focus move, live-region announcement, final values). Current hook+CSS+static-frame plumbing is mandatory for all future motion.

## 7. Design principles (binding on all future implementation)

1. One verdict per surface.
2. Every number earns its place with a reason.
3. Engine semantics are inviolable (visuals never change what values say).
4. Never fabricate intelligence (no viz/copy/3D implying knowledge the engine lacks).
5. Terminal texture, human voice (mono cites; Sans advises).
6. Emphasis is scarce by policy (one accent/glow/primary action per viewport).
7. Evidence compacts; verdicts breathe.
8. Comparison is tabular and persistent (sticky identity, stable delta grammar).
9. Images confirm; scores rank.
10. Stillness is the default; motion explains change.
11. Accessibility is a design material, not a retrofit (contrast gates, focus, non-color encoding, scroll-region parity, static-first motion).
12. Chrome recedes; content decides.

## 8. Responsive principles

- **Mobile (incl. 360px):** verdict-first stacking; evidence serialized or labeled-scroll (never squeezed columns); quiz single-column; 3D poster-only (static SVG, no canvas).
- **Tablet:** same flow, more air; comparison stays tabular (no card-ification — reflow destroys row alignment).
- **Desktop:** evidence beside verdict; compare full-width with sticky identity + arrow-key traversal; full-quality 3D within DPR/IO gating, fenced to non-decision surfaces.
- **Large desktop:** constrain, don't sprawl — extra width becomes whitespace around verdict.
- **Posture:** decision surfaces REFLOW (one mental model everywhere); marketing surfaces may TRANSFORM. Current min-w-600-scroll tables tolerated as last resort; stacked labeled rows preferred.

## 9. Accessibility principles

1. Contrast is a release gate (fix small-accent-mono + 10–11px muted uppercase risk idioms first).
2. Focus always visible and honest; mobile-menu focus-restore/Escape/inert is the model for all disclosures.
3. Quiz operable keyboard-alone with announced state; non-drag alternative to any slider/gesture.
4. Scroll-region parity: compare's labeled-region + arrow-key contract becomes universal.
5. Charts never speak in color alone; canvas/3D always aria-hidden with real DOM equivalents.
6. Motion static-first from first paint, with informational equivalents.
7. Headings/landmarks stay truthful through the 3-idiom → 2-role consolidation.

## 10. Per-template density + hierarchy

- **Homepage:** editorial; hero proposition dominates, 3D as backdrop; engine mechanics recede. Spacious.
- **Quiz:** sparsest; one breathing question per screen, thin progress; everything else recedes.
- **Results:** steepest gradient — open verdict block on top, compact tabular shortlist below; filters quiet.
- **Detail:** layered — open verdict third, compact evidence below; image confirms once.
- **Compare:** densest by design; table IS the page; images thumbnails-at-most.

## 11. Alternatives decided

- **Dark-only vs light mode → keep dark-only.** Dashboard feel comes from mono-everywhere + card uniformity (fixed by voice/density reform), not theme; light mode doubles all unsolved risk work. Revisit only on measured post-V2 demand.
- **Terminal-mono vs humanist retype → Sans-advises/mono-cites.** Mono-everywhere is the largest driver of the dashboard misread; eyebrow+badge+tabular mono preserves identity.
- **Best-match text-only vs verdict + modest image → verdict + modest image.** Imagery confirms, scores rank; fallback parity required.
