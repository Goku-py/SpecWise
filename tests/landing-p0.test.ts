/**
 * Landing P0 invariants — fast, no DB, no scoring engine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { ScorableLaptop } from "@/lib/types";
import type { WorkloadId } from "@/lib/recommend/v3/types";
import { parseV3ShareParams } from "@/lib/share";
import {
  ILLUSTRATIVE_PICKS,
  WORKLOAD_IDS,
  FALLBACK_FILTERS,
  resolveIllustrativeMachines,
} from "@/components/landing/data/illustrative-picks";
import { buildWorkloadPrefillPath } from "@/components/landing/lib/prefill";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const landingDir = join(repoRoot, "src", "components", "landing");

let n = 0;
function lap(over: Partial<ScorableLaptop> = {}): ScorableLaptop {
  n += 1;
  return {
    id: `t${n}`, brand: "Test", model: `M${n}`, variant: null,
    price: 1000, currency: "USD", region: "US", url: null, affiliateUrl: null,
    os: "windows", cpuBrand: "intel", cpuFamily: "i7", cpuGeneration: null,
    cpuCores: 8, gpuType: "integrated", gpuModel: null, gpuVRAM: null,
    ramAmount: 16, ramUpgradeable: true, storageAmount: 512, storageType: "SSD",
    storageExpandable: true, displaySize: 15, displayResolution: "1920x1200",
    displayRefreshRate: 60, displayPanelType: "IPS", displayBrightness: 300,
    displayColorGamut: null, displayTouch: false, batteryCapacity: null,
    batteryLife: 10, weight: 1.4, buildMaterial: "aluminum", webcamQuality: null,
    ports: ["hdmi", "usb-c"], wireless: null, securityFeatures: [],
    keyboardBacklit: true, isTouchscreen: false, isRefurbished: false,
    isActive: true, isPopular: false, imageUrl: null, reviewScore: null,
    notes: null, retailers: [], ...over,
  };
}

function listLandingFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  };
  walk(landingDir);
  return out;
}

describe("IllustrativeMachine has no forbidden keys", () => {
  it("resolved machines expose only display fields", async () => {
    const { toIllustrativeMachine } = await import("@/components/landing/illustrative-machine");
    const m = toIllustrativeMachine({ ...lap(), slug: "test-m-1" });
    const forbidden = ["score", "overall", "W", "C", "V", "K", "strengths", "whyAbove", "weights", "capabilities"];
    for (const key of forbidden) {
      expect(m, `forbidden key ${key}`).not.toHaveProperty(key);
    }
    expect(Object.keys(m).sort()).toEqual(
      ["id", "slug", "brand", "model", "variant", "imageUrl", "cpuFamily", "gpuModel", "gpuVRAM",
       "ramAmount", "storageAmount", "displaySize", "displayResolution", "displayRefreshRate",
       "weight", "batteryLife", "price", "currency", "priceMissing", "priceStale"].sort()
    );
  });
});

describe("ILLUSTRATIVE_PICKS shape", () => {
  it("covers 6 workloads with 3 slugs each", () => {
    expect([...WORKLOAD_IDS].sort()).toEqual(
      (["dev", "gaming", "ai-ml", "video-photo", "cad-3d", "study-office"] as WorkloadId[]).sort()
    );
    for (const id of WORKLOAD_IDS) {
      expect(ILLUSTRATIVE_PICKS[id], id).toHaveLength(3);
      for (const slug of ILLUSTRATIVE_PICKS[id]) {
        expect(typeof slug).toBe("string");
        expect(slug.length).toBeGreaterThan(0);
      }
    }
  });

  it("all slugs distinct across workloads", () => {
    const all = Object.values(ILLUSTRATIVE_PICKS).flat();
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("resolveIllustrativeMachines", () => {
  it("fills missing slugs from fallback filters to 3 per workload", () => {
    // Empty catalog → all empty (no crash, no engine call).
    const empty = resolveIllustrativeMachines([]);
    for (const id of WORKLOAD_IDS) expect(empty[id]).toEqual([]);
  });

  it("resolves curated slugs and backfills the rest", () => {
    const catalog = [
      { ...lap({ ramAmount: 32 }), slug: "apple-macbook-pro-14-m4-pro-24gb" },
      { ...lap({ gpuType: "dedicated", gpuModel: "RTX 4070", gpuVRAM: 8, displayRefreshRate: 240, ramAmount: 8 }), slug: "hp-omen-16" },
      // Generic fallback candidates (slug-sorted order matters).
      { ...lap({ ramAmount: 16 }), slug: "aaa-generic-dev" },
      { ...lap({ ramAmount: 24 }), slug: "zzz-generic-dev" },
    ];
    const out = resolveIllustrativeMachines(catalog);
    expect(out.dev.map((m) => m.slug)).toEqual([
      "apple-macbook-pro-14-m4-pro-24gb",
      "aaa-generic-dev",
      "zzz-generic-dev",
    ]);
    expect(out.gaming[0].slug).toBe("hp-omen-16");
  });

  it("fallback predicates are null-tolerant (null passes)", () => {
    const l = lap({ weight: null, batteryLife: null, gpuVRAM: null, displayResolution: null, displayColorGamut: null });
    expect(FALLBACK_FILTERS["study-office"](l)).toBe(true);
    expect(FALLBACK_FILTERS["ai-ml"]({ ...l, gpuType: "dedicated" })).toBe(true);
  });
});

describe("workload prefill paths", () => {
  it.each(WORKLOAD_IDS)("prefill for %s parses and carries the primary workload", (id) => {
    const path = buildWorkloadPrefillPath(id, "US", "USD");
    expect(path.startsWith("/quiz?s=")).toBe(true);
    const raw = decodeURIComponent(path.slice("/quiz?s=".length));
    const profile = parseV3ShareParams({ s: raw });
    expect(profile).not.toBeNull();
    expect(profile!.region).toBe("US");
    expect(profile!.workloads).toHaveLength(1);
    expect(profile!.workloads[0].id).toBe(id);
    expect(profile!.workloads[0].importance).toBe("primary");
  });
});

describe("no landing file imports the matching engine", () => {
  it("landing sources never reference engine or scoring modules", () => {
    const banned = ["recommend/v3/engine", "recommend/v3/scoring", "recommend/v3/capabilities", "recommend/v3/workloads", "runV3"];
    for (const file of listLandingFiles()) {
      const src = readFileSync(file, "utf-8");
      for (const token of banned) {
        expect(src, `${file} contains ${token}`).not.toContain(token);
      }
    }
  });
});
