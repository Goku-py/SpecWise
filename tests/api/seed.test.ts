import { describe, expect, it } from "vitest"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import { prisma } from "@/lib/prisma"

const execFileAsync = promisify(execFile);

const SEED_TIMEOUT_MS = 240_000;

async function counts() {
  const [laptops, prices, redirects] = await Promise.all([
    prisma.laptop.count(),
    prisma.laptopPrice.count(),
    prisma.slugRedirect.count(),
  ]);
  return { laptops, prices, redirects };
}

async function runSeed(env: Record<string, string>): Promise<{ code: number; out: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"],
      {
        cwd: process.cwd(),
        env: { ...process.env, ...env },
        timeout: SEED_TIMEOUT_MS,
        maxBuffer: 4 * 1024 * 1024,
      }
    );
    return { code: 0, out: String(stdout) + String(stderr) };
  } catch (err) {
    const e = err as { code?: number; stdout?: unknown; stderr?: unknown };
    return { code: e.code ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") };
  }
}

/**
 * Phase 3 seed safety on the shared dev DB. Never passes ALLOW_WIPE_SEED=1
 * here: the destructive path must stay blocked by default, and these tests
 * prove the default path cannot delete user data.
 */
describe("seed safety", () => {
  it("dry-run validates, prints a diff, and writes nothing", async () => {
    const before = await counts();
    const res = await runSeed({ SEED_DRY_RUN: "1" });
    expect(res.code).toBe(0);
    expect(res.out).toMatch(/DRY RUN/);
    expect(await counts()).toEqual(before);
  }, SEED_TIMEOUT_MS);

  it("default run is upsert-only: counts stable, marker row survives", async () => {
    await prisma.laptop.upsert({
      where: { id: "phase3-seed-marker" },
      update: {},
      create: {
        id: "phase3-seed-marker",
        slug: "phase3-seed-marker",
        brand: "Marker",
        model: "Marker",
        os: "Windows",
        cpuBrand: "Intel",
        cpuFamily: "Core",
        ramAmount: 8,
        storageAmount: 256,
        displaySize: 14,
        ports: [],
        securityFeatures: [],
        status: "draft",
      },
    });
    const before = await counts();
    try {
      const res = await runSeed({});
      expect(res.code).toBe(0);
      const after = await counts();
      // Upserts only: same laptops (marker untouched), same prices, no
      // redirects fabricated for unchanged slugs.
      expect(after.laptops).toBe(before.laptops);
      expect(after.prices).toBe(before.prices);
      expect(after.redirects).toBe(before.redirects);
      expect(await prisma.laptop.findUnique({ where: { id: "phase3-seed-marker" } })).not.toBeNull();
    } finally {
      await prisma.laptop.deleteMany({ where: { id: "phase3-seed-marker" } });
    }
  }, SEED_TIMEOUT_MS);
});
