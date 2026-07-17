# SpecWise — The Laptop That Fits *You*

**Find the right laptop without learning a single spec.**

SpecWise translates what you *do* into what you *need*. Answer 8 simple questions about your workflow and budget. We parse 50+ spec fields across a curated database of 1,200+ models and rank every machine by how well it matches your life — so you buy with confidence, not confusion.

---

## Why SpecWise?

Buying a laptop shouldn't require a hardware engineering degree. Most advice is either brand-paid fluff or buried in spec sheets. SpecWise gives you honest, data-driven recommendations — no jargon, no bias, no affiliate markups.

**3 minutes** → **8 questions** → **your perfect match.**

---

## What You Can Do

| Experience | What happens |
|---|---|
| **Guided Quiz** | Tell us about your work, preferences, and budget. We handle the rest. |
| **Smart Matches** | Every result shows a match score, a plain-English explanation, and honest trade-offs. |
| **Side-by-Side Compare** | Pit your top picks across 12 spec categories. See the winner at a glance. |
| **Browse the Catalog** | Search 1,200+ models by brand, specs, or use case. Filtered by your region. |
| **Pre-filtered Categories** | Gaming? Coding? Design? Instant picks for 10 use cases — no quiz needed. |
| **Region-Aware Pricing** | Prices in your currency, from your local retailers. 6 regions supported. |

---

## How It's Built

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS 4, Lucide icons, DM Sans |
| Language | TypeScript 5 |
| Database | PostgreSQL (Neon serverless) |
| ORM | Prisma 7 |
| Validation | Zod 4 |
| Scoring | Weighted F-score across 10 hardware dimensions |

---

## Quick Start

```bash
git clone https://github.com/Goku-py/SpecWise
cd specwise
npm install
```

Copy `.env.example` → `.env`, set `DATABASE_URL`, then:

```bash
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it's fully functional with seeded data.

---

## License

MIT
