import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"
import { verifyAdminApiKey } from "@/lib/admin-auth"
import { validateLaptopPatch, updateLaptop } from "@/lib/db/catalog"

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

// Field whitelists + DTO validation moved to src/lib/db/catalog.ts (phase 2b) —
// the API route, admin forms and the import endpoint share one source of truth
// (LAPTOP_EDITABLE_FIELDS / validateLaptopPatch / updateLaptop).

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

  const { data, error } = validateLaptopPatch(body)
  if (error) {
    return NextResponse.json({ error }, { status: 400 })
  }

  // updateLaptop performs the write + cache invalidation (catalog tag and
  // revalidatePath for /laptops, /laptops/[id], /category/[useCase], /admin).
  const result = await updateLaptop(id, data)
  if (!result.ok) {
    if (result.code === "not_found") {
      return NextResponse.json({ error: result.error }, { status: 404 })
    }
    if (result.code === "conflict") {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }
    console.error("Laptop update error:", result.error)
    return NextResponse.json(
      { error: "Failed to update laptop" },
      { status: 500 }
    )
  }

  return NextResponse.json({ laptop: result.laptop })
})
