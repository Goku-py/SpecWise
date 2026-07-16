import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import "dotenv/config"
import { REGIONS } from "../src/lib/regions"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const laptops = await prisma.laptop.findMany({
    select: { id: true, brand: true, model: true, price: true, currency: true, region: true, url: true, affiliateUrl: true }
  })

  console.log(`Migrating ${laptops.length} laptops to LaptopPrice...`)

  for (const lap of laptops) {
    // Preserve the original regional price for this laptop
    await prisma.laptopPrice.upsert({
      where: { laptopId_region_retailer: { laptopId: lap.id, region: lap.region, retailer: "default" } },
      update: {},
      create: {
        laptopId: lap.id,
        region: lap.region,
        retailer: "default",
        currency: lap.currency,
        price: lap.price,
        url: lap.url,
        affiliateUrl: lap.affiliateUrl,
      },
    })

    // Add a price row for every other region using the shared FX table (taxes included)
    for (const regionCfg of REGIONS) {
      if (regionCfg.code === lap.region) continue
      const convertedPrice = Math.round(lap.price * regionCfg.fx)
      await prisma.laptopPrice.upsert({
        where: { laptopId_region_retailer: { laptopId: lap.id, region: regionCfg.code, retailer: "default" } },
        update: {},
        create: {
          laptopId: lap.id,
          region: regionCfg.code,
          retailer: "default",
          currency: regionCfg.currency,
          price: convertedPrice,
        },
      })
    }

    console.log(`  ✓ ${lap.brand} ${lap.model} — ${REGIONS.length} region prices`)
  }

  console.log("\n✅ Migration complete!")
}

main()
  .catch(e => { console.error("Error:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
