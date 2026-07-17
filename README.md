Buying a laptop means deciphering 50+ specs — TDP, refresh rates, panel types, VRAM, thermal design power, colour gamut coverage. Most people don't know what matters for their workload, and review sites optimise for affiliate commissions, not honest matching.

**SpecWise** solves that. An open-source recommendation engine that translates plain-English quiz answers into weighted F-score rankings across a 50+ field spec database. Non-technical users find the right machine without learning hardware terminology.

---

## Why this exists

SpecWise bridges that gap:

1. **User answers 8–18 plain-English questions** — budget, use case, preferences
2. **7-stage filter pipeline** with progressive relaxation fallbacks — if a filter eliminates everything, it loosens constraints
3. **Weighted F-score ranking** across 10 dimensions (CPU, GPU, RAM, storage, battery, portability, display, budget, upgradeability, build quality) with per-use-case priority weights
4. **Results show match score, reasoning, and honest trade-offs** — no jargon, no manual spec comparison, no affiliate bias
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
cp .env.example .env  # only DATABASE_URL is required
npx prisma migrate deploy
npx tsx prisma/seed.ts
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
Quiz → POST /api/quiz → Zod validate → rate-limit → fetch catalog (cached)
→ 7-stage filter pipeline (Budget/OS/CPU/RAM/Storage/GPU/Ports)
   with progressive relaxation fallbacks
→ F-score ranking across 10 weighted dimensions
→ Top 12 results → localStorage + optional email
```

6 regions (US, IN, GB, DE, CA, AU). Exchange-rate-based pricing. Real data from PricesAPI overrides when available.

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

## License

MIT
