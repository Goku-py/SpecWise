![SpecWise](./public/hero.svg)

<p align="center">
  <b>SpecWise</b> — an open-source laptop recommendation engine that translates plain-English quiz answers into weighted F-score rankings across 50+ spec fields.
  <br>
  <i>Non-technical users find the right machine without learning hardware terminology.</i>
</p>

<p align="center">
  <a href="#why-this-exists">Why</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#stack">Stack</a>
</p>

---

## Why this exists

Buying a laptop means deciphering 50+ specs — TDP, refresh rates, panel types, VRAM, thermal design power, colour gamut coverage. Most people don't know what matters for their workload, and review sites optimise for affiliate commissions, not honest matching.

SpecWise bridges that gap:

1. **User answers 8–18 plain-English questions** — budget, use case, preferences
2. **7-stage filter pipeline** with progressive relaxation fallbacks — if a filter eliminates everything, it loosens constraints
3. **Weighted F-score ranking** across 10 dimensions (CPU, GPU, RAM, storage, battery, portability, display, budget, upgradeability, build quality) with per-use-case priority weights
4. **Results show match score, reasoning, and honest trade-offs** — no jargon, no manual spec comparison, no affiliate bias

<p align="center">
  <img src="./public/screenshots/home.png" alt="SpecWise Homepage" width="700" />
  <br>
  <em>Homepage — Bento grid layout with hero, features, use cases, and process steps</em>
</p>

---

## Features

| Path | What it does |
|---|---|
| `/quiz` | Quick (8) or advanced (18) questions — region-aware budget, saved progress |
| `/results` | Top match hero + alternatives grid with scores, reasoning, trade-offs |
| `/compare?ids=...` | Side-by-side comparison across 12 spec categories |
| `/laptops` | Debounced catalog search with live filtering |
| `/laptops/[id]` | Full spec breakdown + retailer pricing |
| `/category/[useCase]` | Pre-filtered for 10 use cases — no quiz needed |
| `/admin` | Manage catalog listings, filter by region (secured via `ADMIN_API_KEY`) |
| **Global** | Region-aware pricing (6 regions), dark/light mode, auto region detection |

### Quiz

<p align="center">
  <img src="./public/screenshots/quiz.png" alt="SpecWise Quiz" width="700" />
  <br>
  <em>Quiz flow — 8–18 plain-English questions with region-aware budget slider</em>
</p>

### Browse & Search

<p align="center">
  <img src="./public/screenshots/catalog.png" alt="SpecWise Laptop Catalog" width="700" />
  <br>
  <em>Laptop catalog with debounced search, spec cards, and live filtering</em>
</p>

### Laptop Detail

<p align="center">
  <img src="./public/screenshots/laptop-detail.png" alt="SpecWise Laptop Detail" width="700" />
  <br>
  <em>Full spec breakdown — CPU, GPU, RAM, storage, display, battery, ports, pricing</em>
</p>

### Compare

<p align="center">
  <img src="./public/screenshots/compare.png" alt="SpecWise Compare" width="700" />
  <br>
  <em>Side-by-side comparison across 12 spec categories with match badges</em>
</p>

### Use Case Pages

<p align="center">
  <img src="./public/screenshots/category.png" alt="SpecWise Category Page" width="700" />
  <br>
  <em>Pre-filtered laptop recommendations per use case — no quiz required</em>
</p>

---

## Quick start

```bash
git clone https://github.com/Goku-py/SpecWise
cd specwise
npm install
```

Copy `.env.example` to `.env`. Only `DATABASE_URL` is required.

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         User Quiz (8–18 questions)                    │
│                  Budget • Use Case • Preferences • Region             │
└──────────────────────────┬───────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        POST /api/quiz                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │  Zod     │  │  Rate    │  │  Fetch   │  │ 7-Stage │  │ F-    │  │
│  │ Validate │→│  Limit   │→│ Catalog │→│ Filter  │→│ Score  │  │
│  │          │  │ (60/min) │  │ (cached) │  │ Pipeline│  │ Rank   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └───────┘  │
│                               │                          │           │
│                               └──────────┬───────────────┘           │
│                                          ▼                           │
│                              ┌──────────────────────┐                │
│                              │  Top 12 Results      │                │
│                              │  → localStorage      │                │
│                              │  → optional email     │                │
│                              └──────────────────────┘                │
└──────────────────────────────────────────────────────────────────────┘

       Filter Pipeline (7 stages with progressive relaxation):
       Budget → OS → CPU → RAM → Storage → GPU → Ports
       ↓ if all eliminated, relax constraint and retry
       Last resort: top 10 popular laptops within generous budget

       F-score Ranking (10 dimensions × use-case weights):
       CPU + GPU + RAM + Storage + Battery + Portability +
       Display + Budget Fit + Upgradeability + Build Quality
       → Weighted harmonic mean → sorted by score
```

---

## Stack

| Layer | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide icons, DM Sans |
| Language | TypeScript 5 |
| Database | PostgreSQL (Neon / pg) |
| ORM | Prisma 7 |
| Validation | Zod 4 |

## Multi-region pricing

6 regions (US, IN, GB, DE, CA, AU) with exchange-rate-based price generation. Real data from PricesAPI overrides when available.

## Project structure

```
src/
├── app/              # Next.js App Router pages + API routes
├── components/       # Quiz, results, layout, UI components
├── lib/              # Core logic (scoring, questions, types, regions)
├── scripts/          # Data fetching (TechSpecs, PricesAPI, images)
└── prisma/           # Schema, migrations, seed
```

## Scripts

| Command | |
|---|---|
| `npm run db:seed` | Seed database from `data/laptops.json` |
| `npx tsx src/lib/scoring.demo.ts` | Run scoring engine demo (5 laptops, 6 assertions) |

## License

MIT
