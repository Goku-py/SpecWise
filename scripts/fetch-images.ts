// ponytail: one-shot script to populate laptop imageUrl from Unsplash
// Usage: npx tsx scripts/fetch-images.ts
// Requires UNSPLASH_ACCESS_KEY in .env

import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import "dotenv/config"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const API_KEY = process.env.UNSPLASH_ACCESS_KEY
if (!API_KEY) {
  console.error("UNSPLASH_ACCESS_KEY not set in .env")
  process.exit(1)
}

async function main() {
  const laptops = await prisma.laptop.findMany({ where: { imageUrl: null } })
  console.log(`Found ${laptops.length} laptops without images`)

  for (const l of laptops) {
    // ponytail: 1.5s delay between calls to stay under Unsplash free tier (50 req/hr)
    await new Promise(r => setTimeout(r, 1500))
    const query = encodeURIComponent(`${l.brand} ${l.model} laptop`)
    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Client-ID ${API_KEY}` },
      })
      if (!res.ok) { console.warn(`  HTTP ${res.status} for ${l.brand} ${l.model}`); continue }
      const data: any = await res.json()
      if (!data.results?.length) { console.warn(`  No results for ${l.brand} ${l.model}`); continue }

      const imgUrl = data.results[0].urls.small
      await prisma.laptop.update({ where: { id: l.id }, data: { imageUrl: imgUrl } })
      console.log(`  ✓ ${l.brand} ${l.model}`)
    } catch (e) {
      console.warn(`  ✗ ${l.brand} ${l.model}:`, e)
    }
  }

  console.log("Done")
  await prisma.$disconnect()
}

main()
