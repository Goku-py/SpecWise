import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"
import { verifyAdminApiKey } from "@/lib/admin-auth"
import { invalidateCatalogCache } from "@/lib/catalog-cache"

export const GET = withLogging(async (request, rid, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  const laptop = await prisma.laptop.findUnique({
    where: { id },
    include: {
      prices: {
        select: { region: true, retailer: true, currency: true, price: true, url: true, affiliateUrl: true },
        orderBy: { price: "asc" },
      },
    },
  })

  if (!laptop) {
    return NextResponse.json({ error: "Laptop not found" }, { status: 404 })
  }

  return NextResponse.json({ laptop })
})

const stringFields = [
  "brand",
  "model",
  "variant",
  "os",
  "cpuBrand",
  "cpuFamily",
  "cpuGeneration",
  "gpuType",
  "gpuModel",
  "ramType",
  "storageType",
  "displayResolution",
  "displayPanelType",
  "displayColorGamut",
  "wireless",
  "buildMaterial",
  "webcamQuality",
  "imageUrl",
  "notes",
]

const numberFields = [
  "cpuCores",
  "cpuBenchmark",
  "gpuVRAM",
  "ramAmount",
  "storageAmount",
  "displaySize",
  "displayRefreshRate",
  "displayBrightness",
  "batteryCapacity",
  "batteryLife",
  "weight",
  "reviewScore",
]

const booleanFields = [
  "ramUpgradeable",
  "storageExpandable",
  "displayTouch",
  "keyboardBacklit",
  "isTouchscreen",
  "isRefurbished",
  "isActive",
  "isPopular",
]

const stringArrayFields = ["ports", "securityFeatures"]

function validatePatchDto(body: unknown): { data: Record<string, unknown>; error?: string } {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { data: {}, error: "Request body must be an object" }
  }

  const input = body as Record<string, unknown>
  const data: Record<string, unknown> = {}

  for (const key of Object.keys(input)) {
    const value = input[key]

    if (stringFields.includes(key)) {
      if (typeof value !== "string") {
        return { data: {}, error: `Field ${key} must be a string` }
      }
      data[key] = value
    } else if (numberFields.includes(key)) {
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return { data: {}, error: `Field ${key} must be a number` }
      }
      data[key] = value
    } else if (booleanFields.includes(key)) {
      if (typeof value !== "boolean") {
        return { data: {}, error: `Field ${key} must be a boolean` }
      }
      data[key] = value
    } else if (stringArrayFields.includes(key)) {
      if (!Array.isArray(value) || value.some(v => typeof v !== "string")) {
        return { data: {}, error: `Field ${key} must be an array of strings` }
      }
      data[key] = value
    } else {
      return { data: {}, error: `Unknown field: ${key}` }
    }
  }

  return { data }
}

export const PATCH = withLogging(async (request, rid, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  // Rate limit: 30 requests/minute/IP
  const ip = getClientIP(request)
  const rateLimit = await checkRateLimit(`patch-laptop:${ip}`, 30, 60)
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

  // Validate and sanitize request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { data, error } = validatePatchDto(body)
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  try {
    const laptop = await prisma.laptop.update({
      where: { id },
      data,
    })

    // Bust the catalog cache so quiz + admin views pick up the change
    invalidateCatalogCache()

    return NextResponse.json({ laptop })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2025") {
        return NextResponse.json({ error: "Laptop not found" }, { status: 404 })
      }
      if (error.code === "P2002") {
        return NextResponse.json({ error: "Conflict: a record with those values already exists" }, { status: 409 })
      }
    }
    console.error("Laptop update error:", error)
    return NextResponse.json(
      { error: "Failed to update laptop" },
      { status: 500 }
    )
  }
})
