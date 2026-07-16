import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { verifyAdminApiKey } from "@/lib/admin-auth"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"

export const GET = withLogging(async (request, rid) => {
    // Rate limit: 60 requests/minute/IP
    const ip = getClientIP(request)
    const rateLimit = await checkRateLimit(`get-laptops:${ip}`, 60, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    // Admin API key auth
    if (!verifyAdminApiKey(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const region = searchParams.get("region")
    if (!region) {
      return NextResponse.json(
        { error: "Missing required query param: region" },
        { status: 400 }
      )
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "20")))

    const [laptops, total] = await Promise.all([
      prisma.laptop.findMany({
        include: {
          prices: {
            where: { region },
            select: {
              region: true,
              retailer: true,
              currency: true,
              price: true,
              url: true,
              affiliateUrl: true,
            },
            orderBy: { price: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.laptop.count(),
    ])

    const enriched = laptops.map(l => {
      const best = l.prices[0]
      return {
        ...l,
        price: best?.price ?? 0,
        currency: best?.currency ?? "USD",
        region: best?.region ?? region,
      }
    })

    return NextResponse.json({ laptops: enriched, total, page, pageSize })
})
