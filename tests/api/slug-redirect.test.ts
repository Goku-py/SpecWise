import { afterAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { recordSlugRedirect } from "@/lib/db/catalog"
import { apiBase, getJson, uniqueIp, xffHeader } from "./helpers"

const TEST_LAPTOP_ID = "phase3-slug-test-laptop";
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
  it("recordSlugRedirect is idempotent, skips self-redirects, latest wins", async () => {
    // Self-redirect: no row created.
    await recordSlugRedirect(prisma, TEST_LAPTOP_ID, OLD_SLUG, OLD_SLUG);
    expect(await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } })).toBeNull();

    // Null old slug: no row created.
    await recordSlugRedirect(prisma, TEST_LAPTOP_ID, null, "phase3-new-slug");
    expect(await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } })).toBeNull();

    // Record + re-record (idempotent, same owner).
    await recordSlugRedirect(prisma, TEST_LAPTOP_ID, OLD_SLUG, "phase3-new-slug");
    await recordSlugRedirect(prisma, TEST_LAPTOP_ID, OLD_SLUG, "phase3-new-slug");
    const row = await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } });
    expect(row?.laptopId).toBe(TEST_LAPTOP_ID);
    expect(await prisma.slugRedirect.count({ where: { from: OLD_SLUG } })).toBe(1);

    // Latest owner wins on `from` collision.
    await recordSlugRedirect(prisma, "other-laptop", OLD_SLUG, "other-slug");
    expect((await prisma.slugRedirect.findUnique({ where: { from: OLD_SLUG } }))?.laptopId).toBe(
      "other-laptop"
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
