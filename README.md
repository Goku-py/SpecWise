![SpecWise](./public/hero.svg)

**SpecWise** — an open-source laptop recommendation engine that translates plain-English quiz answers into weighted F-score rankings across 50+ spec fields. Non-technical users find the right machine without learning hardware terminology.

Built with Next.js 16, Prisma 7, PostgreSQL, TypeScript.

---

## Why this exists

Buying a laptop means deciphering 50+ specs — TDP, refresh rates, panel types, VRAM, thermal design power, colour gamut coverage. Most people don't know what matters for their workload, and review sites optimise for affiliate commissions, not honest matching.

SpecWise bridges that gap:

1. User answers 8–18 plain-English questions (budget, use case, preferences)
2. Answers pass through a **7-stage filter pipeline** with progressive relaxation fallbacks — if a filter eliminates everything, it loosens constraints
3. Remaining laptops are ranked by a **weighted F-score** (precision × recall) across 10 dimensions, with per-use-case priority weights
4. Results show match score, reasoning, and honest trade-offs

No jargon, no manual spec comparison, no affiliate bias.

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

## Stack

| Layer | |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide icons, DM Sans |
| Language | TypeScript 5 |
| Database | PostgreSQL (Neon / pg) |
| ORM | Prisma 7 |
| Validation | Zod 4 |

---

## Architecture

**Scoring engine** — 7-stage filter pipeline with progressive relaxation fallbacks, then F-score ranking across 10 weighted dimensions per use case.

**Multi-region pricing** — 6 regions (US, IN, GB, DE, CA, AU) with exchange-rate-based price generation. Real data from PricesAPI overrides when available.

**Data flow:**
```
Quiz → POST /api/quiz → validate → rate-limit → scoreLaptops() → filter → F-score rank → top 12 → localStorage
```

No auth, no sessions. Quiz state lives in localStorage.

---

## Scripts

| Command | |
|---|---|
| `npm run db:seed` | Seed database from `data/laptops.json` |
| `npx tsx src/lib/scoring.demo.ts` | Run scoring engine demo (5 laptops, 6 assertions) |

---

## Project structure

```
src/
├── app/              # Next.js App Router pages + API routes
├── components/       # Quiz, results, layout, UI components
├── lib/              # Core logic (scoring, questions, types, regions)
├── scripts/          # Data fetching (TechSpecs, PricesAPI, images)
└── prisma/           # Schema, migrations, seed
```

---

## License

MIT
