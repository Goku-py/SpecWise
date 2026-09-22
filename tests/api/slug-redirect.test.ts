import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { recordSlugRedirect } from "@/lib/db/catalog"
import { apiBase, getJson, uniqueIp, xffHeader } from "./helpers"

const OLD_SLUG = "phase3-old-test-slug";

async function pageStatus(path: string): Promise<{ status: number; location: string | null }> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: xffHeader(uniqueIp()),
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location") };
  // Note: no body read — 308 responses carry none.
}

/**
 * Phase 3 slugs: unique enforcement, redirect recording, 308 behavior.
 * Cleans up every row it creates.
 */
describe("slug redirects", () => {
  // Deterministic start: an interrupted previous run (crash / early exit) can
  // leave the probe slug behind because afterAll never ran, which would break
  // the "no row yet" assertions below.
  beforeAll(async () => {
    await prisma.slugRedirect.deleteMany({ where: { from: OLD_SLUG } });
  });

  it("recordSlugRedirect is idempotent, skips self-redirects, latest wins", async () => {
    // SlugRedirect.laptopId has an FK to Laptop.id (ON DELETE CASCADE), so the
    // test must reference REAL seeded laptops — a fabricated id throws a
    // foreign-key violation. Using existing rows (rather than creating test
    // laptops) also keeps the exact catalog counts other API suites assert.
    const owners = await prisma.laptop.findMany({
      select: { id: true },
      orderBy: { id: "asc" },
      take: 2,
    })
    const [owner, challenger] = owners;
    expect(owner).toBeDefined();
    expect(challenger).toBeDefined();

    // Self-redirect: no row created.
    await recordSlugRedirect(prisma, owner.id, OLD_SLUG, OLD_SLUG);
    expect(await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } })).toBeNull();

    // Null old slug: no row created.
    await recordSlugRedirect(prisma, owner.id, null, "phase3-new-slug");
    expect(await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } })).toBeNull();

    // Record + re-record (idempotent, same owner).
    await recordSlugRedirect(prisma, owner.id, OLD_SLUG, "phase3-new-slug");
    await recordSlugRedirect(prisma, owner.id, OLD_SLUG, "phase3-new-slug");
    const row = await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } });
    expect(row?.laptopId).toBe(owner.id);
    expect(await prisma.slugRedirect.count({ where: { from: OLD_SLUG } })).toBe(1);

    // Latest owner wins on `from` collision.
    await recordSlugRedirect(prisma, challenger.id, OLD_SLUG, "other-slug");
    expect((await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } }))?.laptopId).toBe(
      challenger.id
    );
  });

  it("duplicate slugs are rejected by the database unique index", async () => {
    const existing = await prisma.laptop.findFirstOrThrow({ select: { slug: true } });
    await expect(
      prisma.laptop.create({
        data: {
          id: "phase3-dup-slug-probe",
          slug: existing.slug,
          brand: "Probe",
          model: "Probe",
          os: "Windows",
          cpuBrand: "Intel",
          cpuFamily: "Core",
          ramAmount: 8,
          storageAmount: 256,
          displaySize: 14,
          ports: [],
          securityFeatures: [],
        },
      })
    ).rejects.toThrow();
    await prisma.laptop.deleteMany({ where: { id: "phase3-dup-slug-probe" } });
  });

  it("old slug URL responds 308 to the current slug URL", async () => {
    const laptop = await prisma.laptop.findFirstOrThrow({
      select: { id: true, slug: true },
    });
    expect(laptop.slug).toBeTruthy();
    await prisma.slugRedirect.upsert({
      where: { from: OLD_SLUG },
      update: { laptopId: laptop.id },
      create: { from: OLD_SLUG, laptopId: laptop.id },
    });

    const res = await pageStatus(`/laptops/${OLD_SLUG}`);
    expect(res.status).toBe(308);
    expect(res.location).toBe(`/laptops/${laptop.slug}`);

    const current = await pageStatus(`/laptops/${laptop.slug}`);
    expect(current.status).toBe(200);
  });

  afterAll(async () => {
    await prisma.slugRedirect.deleteMany({ where: { from: OLD_SLUG } });
  });
});

describe("laptop page (ID compatibility)", () => {
  it("unknown id still 404s", async () => {
    const res = await getJson(`${apiBase}/api/laptops/does-not-exist-xyz`, {
      headers: xffHeader(uniqueIp()),
    });
    expect([404, 400]).toContain(res.status);
  });
});
