# SpecWise

Match your workload to exact laptop hardware. Zero affiliate bias. Zero jargon.

---

## Features

| Feature | Description |
|---|---|
| F-score matching engine | Weighted multi-criteria ranking across 50+ hardware parameters. Server-side scoring (`src/lib/scoring.ts`) with client-side decomposition mirror (`src/lib/decomposition.ts`) for radar charts and re-ranking. |
| 4-step quiz | Workload profile, constraint mapping, spec analysis, ranked output. Preset workload cards (Software Dev & LLMs, 3D Motion & CAD, Competitive Gaming, Portability & Field Work) with progressive refinement. |
| Interactive Three.js hero | Instanced particle field, 8 hardware parameter nodes (CPU, GPU, RAM, Display, Thermal, Battery, Storage, Score), connection links. Scroll-driven storytelling with camera lerp. `prefers-reduced-motion` swaps to static SVG fallback. |
| 3D exploded hardware explorer | Procedural `boxGeometry` layers (display, heatsink, GPU, CPU, RAM, SSD, battery, motherboard). Click-to-select layers with spec field mapping. No external GLTF assets. |
| Radar chart decomposition | 8-axis SVG radar (CPU, GPU, Display, RAM, Storage, Battery, Portability, Build). Hover shows per-dimension contribution (`score x weight`). Pool-local delta breakdown. |
| Regional pricing | 6 regions (US, IN, GB, DE, CA, AU). Exchange-rate-based conversion with real PricesAPI overrides when available. Region detected via middleware cookie. |
| Dark-only engineering aesthetic | Design tokens defined in `src/app/globals.css` as CSS custom properties. Orange accent (`#FF5500`), monospace typography for data, no light mode toggle. |
| Responsive layout | Mobile-first grid system. Three.js scenes degrade quality (DPR cap, particle count reduction) on coarse pointers. |
| Accessibility (WCAG 2.3.3) | `prefers-reduced-motion` respected globally (animations collapsed to 0.01ms). Semantic HTML, keyboard navigation, 2px accent focus rings. 3D surfaces have text alternatives. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, Lucide icons, Inter + JetBrains Mono |
| 3D | Three.js, React Three Fiber v9, Drei |
| Animation | Motion (Framer Motion successor) |
| Database | PostgreSQL (via `pg` adapter) |
| ORM | Prisma 7 |
| Validation | Zod 4 |
| Email | Resend |
| Language | TypeScript 5 (strict) |
| Testing | Vitest, Playwright |

---

## Architecture

```
src/
  app/          Routes (Next.js App Router)
  components/   UI components (quiz, results, three, charts, layout)
  lib/          Business logic, types, utilities
```

**Scoring engine** -- `src/lib/scoring.ts` is the single source of truth for all ranking logic. Never imported by UI components directly.

**Decomposition** -- `src/lib/decomposition.ts` is a pure client-side mirror of scoring formulas. Used for radar charts, delta breakdowns, and weight-adjusted re-ranking in the browser. Header comment enforces parity with `scoring.ts`.

**Design tokens** -- `src/app/globals.css` defines all color, typography, and animation tokens as CSS custom properties. Both legacy names (`bg-card`, `text-muted`, `border-border`) and new names (`bg-surface`, `text-secondary`, `border-subtle`) resolve.

**Data flow:**

```
Quiz (client) --> POST /api/quiz --> Zod validate --> rate-limit
  --> fetch catalog (cached) --> 7-stage filter pipeline
  --> F-score ranking --> top 12 results --> localStorage + optional email

Results (client) --> decomposeScores() --> radar chart + delta breakdown
                --> rescorePool() --> weight-adjusted local re-rank
```

---

## Getting Started

```bash
git clone https://github.com/Goku-py/SpecWise
cd specwise
npm install
cp .env.example .env   # only DATABASE_URL is required
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Environment variables:**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `ADMIN_API_KEY` | No | Secures `/admin` routes |
| `RESEND_API_KEY` | No | Enables email delivery of results |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright e2e tests |
| `npm run db:setup` | Generate laptops, run migrations, seed database |

---

## License

MIT
