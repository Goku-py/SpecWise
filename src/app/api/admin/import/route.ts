import { NextResponse } from "next/server"
import { z } from "zod"
import { withLogging } from "@/lib/logger"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"
import { verifyAdminApiKey } from "@/lib/admin-auth"
import { getRegion } from "@/lib/regions"
import {
  LaptopFormSchema,
  ImportPriceSchema,
  formatZodError,
  type LaptopFormValues,
  type ImportPriceValues,
} from "@/lib/laptop-fields"
import { importLaptops, type PriceWrite } from "@/lib/db/catalog"

/**
 * POST /api/admin/import — bulk upsert of laptops (+ optional prices).
 *
 * Contract:
 *  - Auth: `Authorization: Bearer <ADMIN_API_KEY>` (verifyAdminApiKey).
 *  - Rate limit: 30 requests/minute/IP (same as PATCH /api/laptops/[id]).
 *  - Body: { "laptops": [ { ...LaptopFields, "prices"?: [ { "region", "retailer",
 *      "price", "currency"?, "url"?, "affiliateUrl"? } ] } ] }
 *      * max 200 laptops/request, max 50 prices/laptop.
 *      * price is in WHOLE currency units (major units), NOT cents.
 *      * region must be a known region code (US/IN/GB/DE/CA/AU); currency
 *        defaults to the region's currency when omitted.
 *      * urls must be valid URLs when provided.
 *  - Semantics: UPSERT keyed on the deterministic id (Brand-Model[-Variant]).
 *    Re-importing an existing product UPDATES its fields and prices; an
 *    existing status is preserved unless overwritten. Slugs are regenerated
 *    from brand-model-variant with a uniqueness suffix.
 *  - Errors: validation failures are collected per-index and do NOT block the
 *    remaining items ({ imported, errors }). The valid items run in ONE
 *    transaction — a DB-level failure rolls the whole batch back (400/500).
 *  - Response: 200 { "imported": number, "errors": [{ "index": number,
 *    "error": string }] }.
 */

const MAX_LAPTOPS_PER_REQUEST = 200
const MAX_PRICES_PER_LAPTOP = 50

const ImportItemSchema = z.object({
  ...LaptopFormSchema.shape,
  prices: z.array(ImportPriceSchema).max(MAX_PRICES_PER_LAPTOP).optional(),
})

interface ImportError {
  index: number
  error: string
}

function toPriceWrite(p: ImportPriceValues): Omit<PriceWrite, "laptopId"> {
  return {
    region: p.region,
    retailer: p.retailer,
    price: p.price,
    currency: p.currency ?? getRegion(p.region).currency,
    url: p.url ?? null,
    affiliateUrl: p.affiliateUrl ?? null,
  }
}

export const POST = withLogging(async (request: Request) => {
  // Rate limit: 30 requests/minute/IP
  const ip = getClientIP(request)
  const rateLimit = await checkRateLimit(`admin-import:${ip}`, 30, 60)
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "60" } }
    )
  }

  // API key auth
  if (!verifyAdminApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 })
  }

  const laptops = (body as { laptops?: unknown }).laptops
  if (!Array.isArray(laptops)) {
    return NextResponse.json({ error: "Body must include a laptops array" }, { status: 400 })
  }
  if (laptops.length === 0) {
    return NextResponse.json({ error: "laptops must not be empty" }, { status: 400 })
  }
  if (laptops.length > MAX_LAPTOPS_PER_REQUEST) {
    return NextResponse.json(
      { error: `Too many laptops: max ${MAX_LAPTOPS_PER_REQUEST} per request` },
      { status: 400 }
    )
  }

  // Per-item validation — failures are collected, valid items proceed.
  const errors: ImportError[] = []
  const valid: { data: LaptopFormValues; prices: Omit<PriceWrite, "laptopId">[] }[] = []

  laptops.forEach((item, index) => {
    const parsed = ImportItemSchema.safeParse(item)
    if (!parsed.success) {
      errors.push({ index, error: formatZodError(parsed.error) })
      return
    }
    valid.push({
      data: parsed.data,
      prices: (parsed.data.prices ?? []).map(toPriceWrite),
    })
  })

  if (valid.length === 0) {
    return NextResponse.json({ imported: 0, errors })
  }

  // One transaction, single invalidation inside importLaptops.
  const result = await importLaptops(
    valid.map(v => ({ data: v.data, prices: v.prices }))
  )
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ imported: result.imported, errors })
})
