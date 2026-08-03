import { afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { deleteLaptop } from "@/lib/db/catalog"
import { apiBase, bearerHeaders, getJson, uniqueIp } from "./helpers"

interface ImportResponse {
  imported: number
  errors: Array<{ index: number; error: string }>
}

interface ErrorResponse {
  error: string
}

const ip = uniqueIp()
const runSuffix = Date.now().toString(36)

/**
 * Minimal valid laptop per LaptopFormSchema (src/lib/laptop-fields.ts):
 * required = brand, model, os, cpuBrand, cpuFamily, ramAmount, storageAmount,
 * storageType, displaySize.
 */
function validLaptop(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    brand: "QA-Test",
    model: `API-${runSuffix}`,
    os: "Windows 11 Pro",
    cpuBrand: "Intel",
    cpuFamily: "Core i7-1360P",
    ramAmount: 16,
    storageAmount: 512,
    storageType: "SSD",
    displaySize: 14,
    ...overrides,
  }
}

function postImport(body: unknown) {
  return getJson<ImportResponse | ErrorResponse>(`${apiBase}/api/admin/import`, {
    method: "POST",
    headers: { "content-type": "application/json", ...bearerHeaders(ip) },
    body: JSON.stringify(body),
  })
}

describe("POST /api/admin/import", () => {
  it("imports one valid laptop with a price", async () => {
    const res = await postImport({
      laptops: [
        validLaptop({
          model: `A-${runSuffix}`,
          prices: [{ region: "US", retailer: "amazon", price: 999 }],
        }),
      ],
    })

    expect(res.status).toBe(200)
    expect((res.body as ImportResponse).imported).toBe(1)
    expect((res.body as ImportResponse).errors).toEqual([])
  })

  it("imports the valid item and reports the invalid one per-index", async () => {
    const res = await postImport({
      laptops: [
        validLaptop({ model: `B-${runSuffix}` }),
        validLaptop({
          model: `C-${runSuffix}`,
          prices: [{ region: "XX", retailer: "amazon", price: 999 }],
        }),
      ],
    })

    expect(res.status).toBe(200)
    const body = res.body as ImportResponse
    expect(body.imported).toBe(1)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0].index).toBe(1)
    expect(body.errors[0].error).toContain("region")
  })

  it("rejects more than 200 laptops per request with 400", async () => {
    const laptops = Array.from({ length: 201 }, (_, i) =>
      validLaptop({ model: `Bulk-${i}` })
    )

    const res = await postImport({ laptops })

    expect(res.status).toBe(400)
    expect((res.body as ErrorResponse).error).toBe("Too many laptops: max 200 per request")
  })

  afterAll(async () => {
    try {
      // Cleanup: delete every test-created laptop (cascades prices + snapshots
      // via FK onDelete) and verify the catalog is back at baseline.
      const qa = await prisma.laptop.findMany({
        where: { brand: "QA-Test" },
        select: { id: true },
      })
      for (const { id } of qa) {
        await deleteLaptop(id)
      }

      const [laptops, prices, brands, retailers, snapshots, qaLeft] = await Promise.all([
        prisma.laptop.count(),
        prisma.laptopPrice.count(),
        prisma.brand.count(),
        prisma.retailer.count(),
        prisma.priceSnapshot.count(),
        prisma.laptop.count({ where: { brand: "QA-Test" } }),
      ])

      expect(laptops).toBe(56)
      expect(prices).toBe(672)
      expect(brands).toBe(10)
      expect(retailers).toBe(6)
      expect(qaLeft).toBe(0)
      // Snapshots are NOT asserted: the dev cron may add rows mid-run.
      expect(snapshots).toBeGreaterThanOrEqual(672)
    } finally {
      await prisma.$disconnect()
    }
  })
})
