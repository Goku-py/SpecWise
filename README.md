![SpecWise — Laptop recommendation engine](./public/hero.svg)

**SpecWise** is an open-source laptop recommendation engine. It translates plain-English quiz answers into weighted F-score rankings across a database of 50+ spec fields — so users find the right machine without learning hardware terminology.

Built with Next.js 16, Prisma 7, PostgreSQL, and TypeScript. Designed as a reference for scoring-engine architecture, filter-pipeline design, and multi-region pricing.

---

## Why this exists

Buying a laptop means deciphering 50+ specs — TDP, refresh rates, panel types, VRAM. Non-technical users don't know what matters for their use case. SpecWise bridges that gap:

1. User answers 8–18 plain-English questions (budget, use case, preferences)
2. Answers pass through a **7-stage filter pipeline** with progressive relaxation fallbacks
3. Remaining laptops are ranked by a **weighted F-score** (precision × recall) across 10 dimensions
4. Results show match score, reasoning, and honest trade-offs

No jargon, no manual spec comparison.

---

## Technical highlights

### Scoring engine (`src/lib/scoring.ts`)

- **Filter pipeline**: 7 sequential filters (budget → OS → CPU → RAM → storage → GPU → ports). If a step eliminates all laptops, it relaxes that constraint. Last resort: top 10 popular laptops within a generous budget.
- **F-score ranking**: 10 scoring dimensions (CPU, GPU, RAM, storage, battery, portability, display, budget, upgradeability, build quality) × use-case-specific priority weights → weighted harmonic mean.
- **Self-contained demo**: `npx tsx src/lib/scoring.demo.ts` — 5 mock laptops with assertions.

### Database (`prisma/schema.prisma`)

- **Laptop**: 50+ fields covering CPU (brand, family, generation, cores, benchmark), GPU (type, model, VRAM), memory, storage, display (size, resolution, refresh rate, panel type, brightness, gamut), physical specs, ports, security features.
- **LaptopPrice**: Multi-region, multi-retailer pricing with composite PK `(laptopId, region, retailer)`.
- **RateLimit**: DB-backed rate limiter with in-memory fallback.
- **Lead**: Optional email capture.

### Multi-region pricing (`src/lib/regions.ts`)

6 regions (US, IN, GB, DE, CA, AU) with per-region currency, FX rates, and retailer configs. Pricing auto-converts from USD base. The seed script (`prisma/seed.ts`) generates region-specific prices using `generatePrices()` — or uses real data from PricesAPI if available.

### Data flow

```
User quiz → POST /api/quiz → Zod validate → rate-limit check →
fetch catalog (cached) → scoreLaptops() → filter → F-score rank →
top 12 results → localStorage + optional email
```

---

## Features

| Feature | Path | Description |
|---|---|---|
| **Guided quiz** | `/quiz` | Quick (8 questions) or Advanced (18). Region-aware budget slider. Progress saved in localStorage. |
| **Smart results** | `/results` | Top match hero + alternatives grid. Each shows score, reasons, and trade-off warnings. |
| **Side-by-side compare** | `/compare?ids=...` | Up to 6 laptops across 12 spec categories. |
| **Browse catalog** | `/laptops` | Debounced search by brand/model. |
| **Laptop detail** | `/laptops/[id]` | Full spec breakdown across 8 sections + retailer pricing table. |
| **Use-case pages** | `/category/[useCase]` | Pre-filtered for 10 use cases (gaming, student, coding, etc.) — no quiz needed. |
| **Admin panel** | `/admin` | Manage catalog — activate/deactivate listings, filter by region (secured via `ADMIN_API_KEY`). |
| **Region awareness** | global | Auto-detected via ipapi.co, stored in localStorage. Affects pricing, currency, budget slider. |
| **Dark mode** | global | CSS custom properties + `.dark` class toggle. |

---

## Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4, Lucide icons, Geist font |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL (Neon serverless or pg) |
| **ORM** | Prisma 7 |
| **Validation** | Zod 4 |
| **Email** | Resend |
| **Linting** | ESLint 9 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or remote)

### Setup

```bash
git clone https://github.com/Goku-py/SpecWise
cd specwise
npm install
```

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `ADMIN_API_KEY` | No | — | Bearer token for admin API routes |
| `RESEND_API_KEY` | No | — | Quiz results email via Resend (skips gracefully) |
| `TECHSPECS_API_ID` | No | — | TechSpecs.io API ID for laptop spec enrichment |
| `TECHSPECS_API_KEY` | No | — | TechSpecs.io API key |
| `PRICESAPI_API_KEY` | No | — | PricesAPI.io key for live pricing (service currently down) |
| `UNSPLASH_ACCESS_KEY` | No | — | Unsplash API key for product images |
| `CATALOG_CACHE_TTL_SECONDS` | No | `3600` | Catalog cache duration |
| `NEXT_PUBLIC_APP_URL` | No | — | Used by seed script for cache invalidation |

Only `DATABASE_URL` is strictly required. Everything else degrades gracefully.

### Database

```bash
npx prisma migrate deploy   # Apply migrations (8 migrations)
npx tsx prisma/seed.ts     # Seed 56 laptops + regional pricing + Unsplash images
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Take the quiz, browse laptops, compare — everything works locally with seeded data.

### Scripts

See `package.json` for the full list. Key ones:

| Script | Purpose |
|---|---|
| `npm run db:seed` | Seed database from `data/laptops.json` |
| `npx tsx scripts/fetch-laptops.ts` | Enrich `data/laptops.json` via TechSpecs + PricesAPI |
| `npx tsx scripts/fetch-images.ts` | Fetch Unsplash product images |
| `npx tsx src/lib/scoring.demo.ts` | Run the scoring engine demo |

---

## Project structure

```
src/
├── app/              # Next.js App Router pages + API routes
│   ├── page.tsx      # Landing page
│   ├── quiz/         # Quiz page
│   ├── results/      # Results page
│   ├── laptops/      # Browse + detail pages
│   ├── compare/      # Side-by-side comparison
│   ├── category/     # Use-case landing pages
│   ├── admin/        # Admin panel
│   └── api/          # API routes (quiz, laptops, search, health, admin)
├── components/       # React components (quiz, results, layout, ui)
├── lib/              # Core logic (scoring, questions, types, regions, validation)
├── scripts/          # Data fetching scripts (TechSpecs, PricesAPI, images)
└── prisma/           # Schema, migrations, seed
```

---

## Architecture decisions

- **Pricing transparency**: The seed script (`generatePrices()`) creates honest regional prices from FX rates. If PricesAPI is available, real data overrides. No hidden markups.
- **Best-effort email**: Quiz results deliver to screen regardless of email success. Email via Resend is fire-and-forget.
- **Rate limiting**: DB-backed rate limiter at 60 req/min/IP on quiz and laptop endpoints. Falls back to in-memory Map if DB is unavailable.
- **No auth, no sessions**: Quiz state lives in localStorage. No user accounts, no server-side sessions. Keeps the app simple and private.
- **Ponytail pragmatism**: Direct use of `unstable_cache`, no abstraction layers, progressive filter fallbacks as simple retry loops. Marked with `// ponytail:` comments throughout.

---

## Limitations

- **Bootstrapped data** — Laptop specs and prices are seeded, not live. This is a recommendation engine, not a price comparison tool.
- **Region coverage** — 6 regions. More via `src/lib/regions.ts`.
- **No user accounts** — localStorage only. No auth, no sessions.
- **Best-effort email** — Core flow independent of email delivery.

---

## License

[MIT](LICENSE)
