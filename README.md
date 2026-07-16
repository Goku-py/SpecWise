# SpecWise

Buying a laptop means deciphering 50+ specs. Most people don't know what a TDP is, whether they need 16 GB or 32 GB, or why two laptops with the same CPU are priced $400 apart. SpecWise asks a few plain-English questions and scores every laptop against what actually matters for your use case — so you find the right machine without becoming a hardware expert.

---

## How It Works

**1. Take the quiz** — Quick (8 questions) or Advanced (18 questions). Tell us your budget, what you're using it for, and any preferences you have. No jargon.

**2. We score every laptop** — Your answers go through a filter pipeline and a weighted F-score ranking engine. Each laptop gets a match score based on how well it fits your needs vs how completely your answers are satisfied. Use-case weights tune what matters (GPU matters more for gaming, battery life for students, etc.).

**3. Get ranked results** — You see a top match with reasons, a grid of alternatives with honest trade-offs, and the option to compare side by side.

---

## Features

- **Guided quiz** — Two modes: Quick (8 questions) and Advanced (18). Budget slider adapts to your region's currency and price range. Progress is saved as you go.
- **Smart results** — Top match hero card plus alternatives grid. Each result shows match score, reasoning, and trade-off warnings.
- **Side-by-side compare** — Stack up to 6 laptops across 12 spec categories in one table.
- **Browse catalog** — Search by brand or model with instant (debounced) results.
- **Use-case pages** — Pre-filtered recommendations for 10 use cases (gaming, student, coding, etc.). Skip the quiz entirely.
- **Laptop detail pages** — Full spec breakdown in 8 sections plus retailer pricing.
- **Region-aware** — Auto-detects your region (US, IN, GB, DE, CA, AU). Prices, currencies, and budget ranges adjust accordingly.
- **Dark mode** — Built-in theme toggle.
- **Admin panel** — Manage the laptop catalog at `/admin`: activate/deactivate listings, filter by region. Secured via `ADMIN_API_KEY`.

---

## Scoring Engine

SpecWise uses a two-stage ranking system:

1. **Filter pipeline** — 7 sequential filters (budget, OS, CPU, RAM, storage, GPU, ports). If every laptop is eliminated at a step, that constraint is progressively relaxed. If all constraints fail, it falls back to the top 10 popular laptops within a generous budget window — you always get a result.

2. **F-score ranking** — Each laptop is scored across 10 dimensions (CPU, GPU, RAM, storage, battery, portability, display, budget, upgradeability, build quality). These scores are combined with use-case-specific priority weights using a weighted harmonic mean (precision × recall). Gaming profiles weight GPU at 0.30; student profiles weight budget at 0.25.

Each result includes **match reasons** (what fits well) and **trade-off warnings** (what you're giving up).

A self-contained demo with mock laptops and assertions lives at `src/lib/scoring.demo.ts` — run it with `npx tsx src/lib/scoring.demo.ts`.

---

## Tech Stack

| Layer | What |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19, Tailwind CSS 4, Lucide icons |
| **Language** | TypeScript |
| **Database** | PostgreSQL (via Neon serverless or pg) |
| **ORM** | Prisma 7 |
| **Validation** | Zod |
| **Email** | Resend |
| **Linting** | ESLint 9 |

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (local or remote)

### Setup

```bash
git clone <repo-url>
cd specwise
npm install
```

Copy `.env.example` to `.env` and fill in the values:

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `ADMIN_API_KEY` | No | — | Bearer token for admin API routes |
| `RESEND_API_KEY` | No | — | Sends quiz results by email (skips gracefully if absent) |
| `CATALOG_CACHE_TTL_SECONDS` | No | `3600` | How long the catalog cache lives |
| `NEXT_PUBLIC_APP_URL` | No | — | Public URL (used by seed script) |

Only `DATABASE_URL` is strictly required. Everything else degrades gracefully.

### Database

```bash
npx prisma migrate deploy   # Apply migrations
npx prisma db seed          # Seed laptops and pricing data
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Take the quiz, browse laptops, compare — everything works locally.

Additional scripts are listed in `package.json`.

---

## Limitations

- **Bootstrapped data** — Laptop specs and prices are seeded, not live. Pricing may be stale. This is a recommendation engine, not a price comparison tool.
- **Region coverage** — 6 regions (US, IN, GB, DE, CA, AU). More can be added via `src/lib/regions.ts`.
- **No user accounts** — Quiz answers and region preference live in localStorage. No auth, no server-side sessions.
- **Best-effort email** — If email delivery fails (Resend is down, key is missing), the quiz results are still shown on screen. Email is a nice-to-have, not a requirement.

---

## License

[MIT](LICENSE)
