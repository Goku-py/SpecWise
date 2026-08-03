import { prisma } from "./prisma"

interface MemoryEntry {
  count: number
  resetAt: number
}

const memoryFallback = new Map<string, MemoryEntry>()

function getWindowTimestamp(windowSec: number): number {
  return Math.floor(Date.now() / 1000 / windowSec) * windowSec
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return "unknown"
}

export async function checkRateLimit(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowTs = getWindowTimestamp(windowSec)
  const key = `${identifier}:${windowTs}`
  const resetAt = (windowTs + windowSec) * 1000

  try {
    const result = await prisma.$queryRawUnsafe<Array<{ count: number }>>(
      `INSERT INTO "RateLimit" ("id", "key", "window", "count", "updatedAt")
       VALUES ($1, $2, to_timestamp($3)::timestamp(3), 1, now())
       ON CONFLICT ("key", "window")
       DO UPDATE SET "count" = "RateLimit"."count" + 1, "updatedAt" = now()
       RETURNING "count"`,
      crypto.randomUUID(),
      key,
      windowTs
    )
    const count = result[0]?.count ?? 1

    // Opportunistic cleanup: the table otherwise grows ~86K rows/day with no TTL.
    // ~1 in 50 calls prunes rows older than 24h; failures are non-fatal.
    if (Math.random() < 0.02) {
      try {
        await prisma.$executeRaw`DELETE FROM "RateLimit" WHERE "updatedAt" < now() - interval '1 day'`
      } catch (error) {
        console.error("Rate limit cleanup error (non-fatal):", error)
      }
    }

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    }
  } catch (error) {
    console.error("Rate limit DB error, using memory fallback:", error)
    const existing = memoryFallback.get(key)
    const count = existing && existing.resetAt > Date.now() ? existing.count + 1 : 1
    memoryFallback.set(key, { count, resetAt })
    // ponytail: unbounded Map — sweep expired entries every 100th insert
    if (memoryFallback.size % 100 === 0) {
      const now = Date.now()
      for (const [k, v] of memoryFallback) {
        if (v.resetAt <= now) memoryFallback.delete(k)
      }
    }
    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt,
    }
  }
}
