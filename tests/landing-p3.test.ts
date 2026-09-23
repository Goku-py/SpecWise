import { describe, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  ILLUSTRATIVE_PICKS,
  WORKLOAD_IDS,
  emptyIllustrativeMachines,
  resolveIllustrativeMachines,
} from "@/components/landing/data/illustrative-picks";
import type { ScorableLaptopWithSlug } from "@/components/landing/illustrative-machine";

function syntheticEntry(slug: string): ScorableLaptopWithSlug {
  return {
    id: `id-${slug}`,
    slug,
    brand: "Test",
    model: slug,
    variant: null,
    price: 1000,
    priceMissing: false,
    priceStale: false,
    currency: "USD",
    region: "US",
    url: null,
    affiliateUrl: null,
    os: "Windows",
    cpuBrand: "Test",
    cpuFamily: "Test CPU",
    cpuGeneration: null,
    cpuCores: 8,
    gpuType: "dedicated",
    gpuModel: "Test GPU",
    gpuVRAM: 8,
    ramAmount: 16,
    ramUpgradeable: true,
    storageAmount: 512,
    storageType: "SSD",
    storageExpandable: false,
    displaySize: 15.6,
    displayResolution: "1920x1080",
    displayRefreshRate: 144,
    displayPanelType: null,
    displayBrightness: null,
    displayColorGamut: "sRGB",
    displayTouch: false,
    batteryCapacity: null,
    batteryLife: 8,
    weight: 2.0,
    buildMaterial: null,
    webcamQuality: null,
    ports: [],
    wireless: null,
    securityFeatures: [],
    keyboardBacklit: true,
    isTouchscreen: false,
    isRefurbished: false,
    isActive: true,
    isPopular: false,
    imageUrl: null,
    reviewScore: null,
    notes: null,
    retailers: [],
  };
}

describe("P3 production hardening", () => {
  it("emptyIllustrativeMachines returns 6 empty groups without warnings", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const empty = emptyIllustrativeMachines();
    expect(Object.keys(empty).sort()).toEqual([...WORKLOAD_IDS].sort());
    for (const id of WORKLOAD_IDS) expect(empty[id]).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("full curated catalog resolves with zero warnings and zero fallback", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const catalog = Object.values(ILLUSTRATIVE_PICKS).flat().map(syntheticEntry);
    const out = resolveIllustrativeMachines(catalog);
    expect(warn).not.toHaveBeenCalled();
    for (const id of WORKLOAD_IDS) {
      expect(out[id].map((m) => m.slug)).toEqual(ILLUSTRATIVE_PICKS[id]);
    }
    warn.mockRestore();
  });

  it("hero caption drops the redundant stage suffix for the assembled state", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../src/components/hero/hero-laptop-wrapper.tsx"),
      "utf8"
    );
    expect(src).toContain('stage === "Assembled laptop"');
  });

  it("scene-shell exposes no contradictory aria labeling", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../src/components/three/scene-shell.tsx"),
      "utf8"
    );
    expect(src).not.toMatch(/role="img"/);
  });
});
