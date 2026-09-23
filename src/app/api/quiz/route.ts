import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"
import { normalizeRegion } from "@/lib/regions"
import { getActiveCatalog, toScorable } from "@/lib/catalog-cache"
import { CanonicalProfileSchema } from "@/lib/recommend/v3/validate"
import { runV3 } from "@/lib/recommend/v3/engine"
import type { ScorableLaptop } from "@/lib/types"

/**
 * POST /api/quiz — single recommendation contract (v3).
 * Body: { schemaVersion: "v3", profile: CanonicalProfile }.
 * The server is authoritative; the client never scores.
 */
export const POST = withLogging(async (request) => {
    // Rate limit: 60 requests/minute/IP
    const ip = getClientIP(request)
    const rateLimit = await checkRateLimit(`post-quiz:${ip}`, 60, 60)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": "60" } }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const bodyRec = body as Record<string, unknown>
    if (bodyRec.schemaVersion !== "v3" || bodyRec.profile == null) {
      return NextResponse.json(
        { error: "Invalid request", issues: ["schemaVersion must be \"v3\" with a profile"] },
        { status: 400 }
      )
    }

    const v3parse = CanonicalProfileSchema.safeParse(bodyRec.profile)
    if (!v3parse.success) {
      const issues = v3parse.error.issues.map(i => `${i.path.join(".")}: ${i.message}`)
      return NextResponse.json({ error: "Invalid v3 profile", issues }, { status: 400 })
    }
    const profile = v3parse.data
    const region = normalizeRegion(profile.region)
    if (!region) {
      return NextResponse.json({ error: "Unsupported region" }, { status: 400 })
    }

    // Single cached query for the active catalog filtered by region
    const rawCatalog = await getActiveCatalog(region)

    const scorable: ScorableLaptop[] = rawCatalog.map(l => toScorable(l, region))

    const dto = runV3(scorable, { ...profile, region })

    return NextResponse.json({ ...dto, total: dto.items.length })
})
