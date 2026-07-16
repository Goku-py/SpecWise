import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { scoreLaptops } from "@/lib/scoring"
import { sendResultsEmail } from "@/lib/email"
import { getClientIP, checkRateLimit } from "@/lib/rate-limit"
import { QuizAnswersSchema } from "@/lib/validation"
import { getActiveCatalog, toScorable } from "@/lib/catalog-cache"
import type { QuizAnswers, ScorableLaptop } from "@/lib/types"

export const POST = withLogging(async (request, rid) => {
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

    const parseResult = QuizAnswersSchema.safeParse(body)
    if (!parseResult.success) {
      const issues = parseResult.error.issues.map(i => `${i.path.join(".")}: ${i.message}`)
      return NextResponse.json({ error: "Invalid quiz answers", issues }, { status: 400 })
    }

    const { email: parsedEmail, region, ...rest } = parseResult.data
    const answers = rest as QuizAnswers
    const email = parsedEmail?.trim() || undefined

    // Single cached query for the active catalog filtered by region
    const rawCatalog = await getActiveCatalog(region)

    const scorable: ScorableLaptop[] = rawCatalog.map(l => toScorable(l, region))

    const results = scoreLaptops(scorable, answers)

    // ponytail: capture + send is best-effort and never blocks results
    if (email) {
      prisma.lead.upsert({
        where: { email_region: { email, region } },
        update: { answers: rest as object },
        create: { email, region, answers: rest as object },
      }).catch(e => console.error("Lead upsert error (non-fatal):", e))

      sendResultsEmail(email, results).catch(err => {
        console.error("Failed to send results email to", email, "(non-fatal):", err)
      })
    }

    return NextResponse.json({ results, total: results.length })
})
