import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { pruneRateLimits } from "@/lib/rate-limit"

/**
 * Phase 3: the RateLimit retention purge is deterministic through its seam.
 * Uses uniquely-keyed rows so the shared dev table is untouched otherwise.
 */
describe("rate-limit retention", () => {
  it("prunes rows older than the retention window and keeps fresh rows", async () => {
    const staleKey = `phase3-test-stale-${Date.now()}`;
    const freshKey = `phase3-test-fresh-${Date.now()}`;
    const window = new Date("2020-01-01T00:00:00Z");
    await prisma.$executeRaw`
      INSERT INTO "RateLimit" ("id", "key", "window", "count", "updatedAt", "createdAt")
      VALUES (${crypto.randomUUID()}, ${staleKey}, ${window}, 1, ${window}, ${window})`;
    const fresh = await prisma.rateLimit.create({
      data: { key: freshKey, window: new Date(), count: 1 },
    });

    try {
      const deleted = await pruneRateLimits(24);
      expect(deleted).toBeGreaterThanOrEqual(1);
      expect(
        await prisma.rateLimit.findFirst({ where: { key: staleKey } })
      ).toBeNull();
      expect(
        await prisma.rateLimit.findFirst({ where: { key: freshKey } })
      ).not.toBeNull();
    } finally {
      await prisma.rateLimit.deleteMany({
        where: { key: { in: [staleKey, freshKey] } },
      });
    }
  });
});
