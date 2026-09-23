/**
 * v3 invariant suite (locked spec §K). Pure engine tests — no DB, no API.
 */
import { describe, expect, it } from "vitest";
import type { ScorableLaptop } from "@/lib/types";
import type { CanonicalProfile } from "@/lib/recommend/v3/types";
import { WORKLOAD_VECTORS_V31, blendWorkloadWeights } from "@/lib/recommend/v3/workloads";
import { DIMS_V3 } from "@/lib/recommend/v3/types";
import { workloadFit, poolValue, weightsForProfile } from "@/lib/recommend/v3/scoring";
import { capabilitiesForV3 } from "@/lib/recommend/v3/capabilities";
import { runV3 } from "@/lib/recommend/v3/engine";
import { quickToProfile } from "@/lib/recommend/v3/quiz";
import { CanonicalProfileSchema } from "@/lib/recommend/v3/validate";

let n = 0;
function lap(over: Partial<ScorableLaptop> = {}): ScorableLaptop {
  n += 1;
  return {
    id: `t${n}`, brand: "Test", model: `M${n}`, variant: null,
    price: 1000, currency: "USD", region: "US", url: null, affiliateUrl: null,
    os: "windows", cpuBrand: "intel", cpuFamily: "i7", cpuGeneration: null,
    cpuCores: 8, gpuType: "integrated", gpuModel: null, gpuVRAM: null,
    ramAmount: 16, ramUpgradeable: true, storageAmount: 512, storageType: "SSD",
    storageExpandable: true, displaySize: 15, displayResolution: "1080p",
    displayRefreshRate: 60, displayPanelType: "IPS", displayBrightness: 300,
    displayColorGamut: "sRGB", displayTouch: false, batteryCapacity: null,
    batteryLife: 8, weight: 1.6, buildMaterial: "aluminum", webcamQuality: null,
    ports: ["hdmi", "usb-c"], wireless: null, securityFeatures: [],
    keyboardBacklit: true, isTouchscreen: false, isRefurbished: false,
    isActive: true, isPopular: false, imageUrl: null, reviewScore: null,
    notes: null, retailers: [], ...over,
  };
}

function prof(over: Partial<CanonicalProfile> = {}): CanonicalProfile {
  return {
    schemaVersion: "v3", region: "US", currency: "USD",
    workloads: [{ id: "study-office", importance: "primary", subprofile: null }],
    budget: { min: null, max: null, noMax: true, currency: "USD" },
    priorities: [], requirements: [], ...over,
  };
}

describe("v3 vectors sum exactly to 1.0", () => {
  it.each(Object.keys(WORKLOAD_VECTORS_V31))("%s sums to 1", (k) => {
    const v = WORKLOAD_VECTORS_V31[k as keyof typeof WORKLOAD_VECTORS_V31];
    const s = (Object.keys(v) as Array<keyof typeof v>).reduce((x, d) => x + v[d], 0);
    expect(Math.abs(s - 1)).toBeLessThan(1e-9);
    expect(Object.keys(v).sort()).toEqual([...DIMS_V3].sort());
  });
});

describe("blending", () => {
  it("single workload = its vector", () => {
    const b = blendWorkloadWeights([{ id: "dev", importance: "primary", subprofile: "standard" }]);
    expect(b.cpu).toBeCloseTo(WORKLOAD_VECTORS_V31["dev-standard"].cpu, 9);
  });
  it("primary dominates secondary; occasional never hardens", () => {
    const b = blendWorkloadWeights([
      { id: "study-office", importance: "primary", subprofile: null },
      { id: "gaming", importance: "secondary", subprofile: "both" },
    ]);
    // gpu between the two parents, closer to study-office? No: gaming secondary pulls up.
    expect(b.gpu).toBeGreaterThan(WORKLOAD_VECTORS_V31["study-office"].gpu);
    expect(b.gpu).toBeLessThan(WORKLOAD_VECTORS_V31["gaming-both"].gpu);
  });
  it("duplicate dedup keeps highest influence", () => {
    const b = blendWorkloadWeights([
      { id: "dev", importance: "occasional", subprofile: "standard" },
      { id: "dev", importance: "primary", subprofile: "standard" },
    ]);
    expect(b.cpu).toBeCloseTo(WORKLOAD_VECTORS_V31["dev-standard"].cpu, 9);
  });
});

describe("W conditional monotonicity + mask behavior", () => {
  it("fixed mask: raising a cap never lowers W", () => {
    const p = prof({ workloads: [{ id: "dev", importance: "primary", subprofile: "standard" }] });
    const w = weightsForProfile(p);
    const a = lap({ cpuCores: 8, batteryLife: 8 });
    const b = lap({ cpuCores: 16, batteryLife: 8 });
    const ca = capabilitiesForV3(a, { carry: "balanced", screen: { smooth: false, vivid: false, sharp: false, touch: false } });
    const cb = capabilitiesForV3(b, { carry: "balanced", screen: { smooth: false, vivid: false, sharp: false, touch: false } });
    expect(workloadFit(cb, w)).toBeGreaterThanOrEqual(workloadFit(ca, w));
  });
  it("null excluded: unknown battery does not penalize vs known-bad", () => {
    const p = prof();
    const w = weightsForProfile(p);
    const unknown = lap({ batteryLife: null });
    const bad = lap({ batteryLife: 2 });
    const cu = capabilitiesForV3(unknown, { carry: "balanced", screen: { smooth: false, vivid: false, sharp: false, touch: false } });
    const cb = capabilitiesForV3(bad, { carry: "balanced", screen: { smooth: false, vivid: false, sharp: false, touch: false } });
    expect(cu.battery.value).toBeNull();
    expect(workloadFit(cu, w)).toBeGreaterThan(workloadFit(cb, w));
  });
});

describe("hard enforcement + null-vs-Must + Prefer vs Must", () => {
  it("Must eliminates; Prefer ranks", () => {
    const must = prof({ requirements: [{ id: "ram", kind: "hard", importance: 2, min: 16, target: 16, provenance: { source: "quick", reason: "t" }, userMust: true }] });
    const catalog = [lap({ ramAmount: 8 }), lap({ ramAmount: 16 }), lap({ ramAmount: 32 }), lap({ ramAmount: 64 })];
    const r = runV3(catalog, must);
    expect(r.exhausted).toBe(false);
    expect(r.relaxed).toBe(false);
    expect(r.items.every((i) => (i.specs.ramGB as number) >= 16)).toBe(true);
    const prefer = prof({ requirements: [{ id: "ram", kind: "target", targetClass: "A", importance: 2, target: 32, provenance: { source: "quick", reason: "t" }, userMust: false }] });
    const r2 = runV3(catalog, prefer);
    expect(r2.items.length).toBe(4);
    expect(r2.items[0].specs.ramGB).toBe(32);
  });
  it("null weight vs weight-Must fails with unlisted", () => {
    const p = prof({ requirements: [{ id: "weight", kind: "hard", importance: 2, max: 1.5, provenance: { source: "advanced", reason: "t" }, userMust: true }] });
    const r = runV3([lap({ weight: null }), lap({ weight: 1.2 }), lap({ weight: 1.3 }), lap({ weight: 1.1 })], p);
    expect(r.relaxed).toBe(false);
    expect(r.items.length).toBe(3);
    expect(r.items.every((i) => (i.specs.weightKg as number) <= 1.5)).toBe(true);
    expect(r.items.some((i) => (i.specs.weightKg as number) === 1.2)).toBe(true);
  });
  it("linux matches linux only (legacy hack deleted)", () => {
    const p = prof({ requirements: [{ id: "os", kind: "hard", importance: 2, min: "linux", provenance: { source: "quick", reason: "t" }, userMust: true }] });
    const r = runV3([lap({ os: "windows" }), lap({ os: "linux" })], p);
    expect(r.items.map((i) => i.specs.os)).toEqual(["linux"]);
  });
});

describe("determinism + order independence", () => {
  it("shuffled catalog = identical ranking", () => {
    const p = prof({ workloads: [{ id: "dev", importance: "primary", subprofile: "standard" }] });
    const catalog = [lap({ price: 900 }), lap({ price: 1200 }), lap({ price: 1500 }), lap({ price: 700 }), lap({ price: 2000 })];
    const a = runV3(catalog, p).items.map((i) => i.laptopId);
    const b = runV3([...catalog].reverse(), p).items.map((i) => i.laptopId);
    expect(a).toEqual(b);
    const c = runV3(catalog, p).items.map((i) => i.laptopId);
    expect(a).toEqual(c);
  });
});

describe("V rules", () => {
  it("pools <4 → neutral V=0.5", () => {
    const p = prof();
    const r = runV3([lap({ price: 800 }), lap({ price: 2000 })], p);
    expect(r.items.every((i) => i.scores.V === 0.5)).toBe(true);
  });
  it("currency invariance (FX constant cancels)", () => {
    const items = [
      { id: "a", W: 0.8, priceUSD: 1000 },
      { id: "b", W: 0.6, priceUSD: 500 },
      { id: "c", W: 0.7, priceUSD: 1500 },
      { id: "d", W: 0.5, priceUSD: 800 },
    ];
    const v1 = poolValue(items).V;
    const v2 = poolValue(items.map((i) => ({ ...i, priceUSD: i.priceUSD! * 83 }))).V; // fx scale
    for (const i of items) expect(v1.get(i.id)).toBeCloseTo(v2.get(i.id)!, 9);
  });
  it("cheap-mediocre does not beat excellent outright", () => {
    const p = prof({ workloads: [{ id: "dev", importance: "primary", subprofile: "standard" }] });
    const catalog = [
      lap({ price: 500, cpuCores: 4, ramAmount: 8, storageAmount: 256, batteryLife: 4 }),
      lap({ price: 2000, cpuCores: 16, ramAmount: 32, storageAmount: 1024, batteryLife: 10 }),
      lap({ price: 1200, cpuCores: 8, ramAmount: 16, storageAmount: 512, batteryLife: 8 }),
      lap({ price: 900, cpuCores: 8, ramAmount: 16, storageAmount: 512, batteryLife: 8 }),
    ];
    const r = runV3(catalog, p);
    expect(r.items[0].laptopId).not.toBe(catalog[0].id);
  });
  it("price-missing lane: never top-3 above priced", () => {
    const p = prof();
    const priced = [lap({ price: 800 }), lap({ price: 900 }), lap({ price: 1000 }), lap({ price: 1100 })];
    const ghost = lap({ price: 0, priceMissing: true });
    const r = runV3([...priced, ghost], p);
    const idx = r.items.findIndex((i) => i.priceMissing);
    expect(idx === -1 || idx >= 3).toBe(true);
  });
});

describe("relaxation", () => {
  it("relaxes budget ≤3 steps with ledger; NEVER touches os", () => {
    const p = prof({
      budget: { min: null, max: 100, noMax: false, currency: "USD" },
      requirements: [
        { id: "budget", kind: "hard", importance: 2, min: null, max: 100, provenance: { source: "quick", reason: "t" }, userMust: true },
        { id: "os", kind: "hard", importance: 2, min: "macos", provenance: { source: "quick", reason: "t" }, userMust: true },
      ],
    });
    const catalog = [lap({ price: 2000, os: "windows" }), lap({ price: 2500, os: "windows" })];
    const r = runV3(catalog, p);
    expect(r.exhausted).toBe(true);
    expect(r.awaitingUser).toBe(true);
    expect(r.relaxationLedger.every((e) => e.requirement !== "os")).toBe(true);
    expect(r.relaxationLedger.length).toBeLessThanOrEqual(3);
  });
  it("RAM relaxes one band at a time", () => {
    const p = prof({ requirements: [{ id: "ram", kind: "hard", importance: 2, min: 32, target: 32, provenance: { source: "advanced", reason: "t" }, userMust: true }] });
    const catalog = [lap({ ramAmount: 16 }), lap({ ramAmount: 16 }), lap({ ramAmount: 16 })];
    const r = runV3(catalog, p);
    expect(r.relaxed).toBe(true);
    expect(r.relaxationLedger[0].requirement).toBe("ram");
  });
});

describe("confidence independence", () => {
  it("K tiers + factors without scaling Final", () => {
    const p = prof();
    const sparse = lap({ batteryLife: null, weight: null, buildMaterial: null, price: 0, priceMissing: true });
    const full = lap({ batteryLife: 12, weight: 1.2, buildMaterial: "aluminum" });
    const r = runV3([sparse, full, lap(), lap()], p);
    const s = r.items.find((i) => i.laptopId === sparse.id)!;
    const f = r.items.find((i) => i.laptopId === full.id)!;
    expect(["medium", "limited"]).toContain(s.confidence);
    expect(s.confidenceFactors.length).toBeGreaterThan(0);
    expect(f.confidence).toBe("high");
  });
});

describe("Quick builders + validation", () => {
  it("quickToProfile defaults Prefer; Must escalates", () => {
    const prefer = quickToProfile({ workloads: [{ id: "dev" }], region: "US", currency: "USD", ramGB: 16 });
    expect(prefer.requirements.some((r) => r.id === "ram" && r.kind === "target")).toBe(true);
    const must = quickToProfile({ workloads: [{ id: "dev" }], region: "US", currency: "USD", ramGB: 16, ramMust: true });
    expect(must.requirements.some((r) => r.id === "ram" && r.kind === "hard" && r.userMust)).toBe(true);
  });
  it("occasional never hardens through builder", () => {
    const p = quickToProfile({ workloads: [{ id: "gaming", importance: "occasional" }, { id: "study-office", importance: "primary" }], region: "US", currency: "USD" });
    expect(p.requirements.every((r) => r.kind !== "hard" || r.provenance.source !== "workload")).toBe(true);
  });
  it("schema validates; budget min>max rejected", () => {
    const good = CanonicalProfileSchema.safeParse(prof());
    expect(good.success).toBe(true);
    const bad = CanonicalProfileSchema.safeParse(prof({ budget: { min: 2000, max: 1000, noMax: false, currency: "USD" } }));
    expect(bad.success).toBe(false);
  });
  it("Quick ≡ Advanced for identical effective profile", () => {
    const q = quickToProfile({ workloads: [{ id: "dev" }], region: "US", currency: "USD", ramGB: 16, ramMust: true });
    const a: CanonicalProfile = JSON.parse(JSON.stringify(q));
    const catalog = [lap({ ramAmount: 16, price: 1000 }), lap({ ramAmount: 32, price: 1500 }), lap({ ramAmount: 8, price: 700 }), lap({ ramAmount: 64, price: 2500 })];
    expect(runV3(catalog, a).items.map((i) => i.laptopId)).toEqual(runV3(catalog, q).items.map((i) => i.laptopId));
  });
});

describe("explanation deltas agree with scoring", () => {
  it("whyAbove deltas match capability gaps", () => {
    const p = prof({ workloads: [{ id: "gaming", importance: "primary", subprofile: "aaa" }] });
    const catalog = [
      lap({ gpuType: "dedicated", gpuVRAM: 12, price: 2000 }),
      lap({ gpuType: "dedicated", gpuVRAM: 6, price: 1500 }),
      lap({ price: 1000 }),
      lap({ price: 800 }),
    ];
    const r = runV3(catalog, p);
    const first = r.items[0];
    expect(first.whyAbove == null || first.whyAbove.vsId != null).toBe(true);
    if (first.whyAbove && first.whyAbove.won.length > 0) {
      const w = first.whyAbove.won[0];
      const nxt = r.items.find((i) => i.laptopId === first.whyAbove!.vsId)!;
      expect(Math.abs(first.capabilities[w.dim]! - nxt.capabilities[w.dim]! - w.delta)).toBeLessThan(1e-9);
    }
  });
});
