/**
 * v3 cutover tests: store-driven profile ≡ builder-driven profile (Quick ≡ Advanced).
 * Identical effective profile → identical request payload (modulo requirement order)
 * → identical result DTO through the same engine.
 */
import { describe, expect, it } from "vitest";
import { quickToProfile } from "@/lib/recommend/v3/quiz";
import { runV3 } from "@/lib/recommend/v3/engine";
import { useV3QuizStore } from "@/store/useV3QuizStore";
import type { CanonicalProfile, Requirement } from "@/lib/recommend/v3/types";
import type { ScorableLaptop } from "@/lib/types";

let n = 100;
function lap(over: Partial<ScorableLaptop> = {}): ScorableLaptop {
  n += 1;
  return {
    id: `c${n}`, brand: "Test", model: `M${n}`, variant: null,
    price: 1200, currency: "USD", region: "US", url: null, affiliateUrl: null,
    os: "windows", cpuBrand: "intel", cpuFamily: "i7", cpuGeneration: null,
    cpuCores: 8, gpuType: "dedicated", gpuModel: "RTX", gpuVRAM: 8,
    ramAmount: 16, ramUpgradeable: true, storageAmount: 512, storageType: "SSD",
    storageExpandable: true, displaySize: 15, displayResolution: "1080p",
    displayRefreshRate: 144, displayPanelType: "IPS", displayBrightness: 400,
    displayColorGamut: "sRGB", displayTouch: false, batteryCapacity: null,
    batteryLife: 8, weight: 1.8, buildMaterial: "aluminum", webcamQuality: null,
    ports: ["hdmi", "usb-c", "usb-a"], wireless: null, securityFeatures: [],
    keyboardBacklit: true, isTouchscreen: false, isRefurbished: false,
    isActive: true, isPopular: false, imageUrl: null, reviewScore: null,
    notes: null, retailers: [], ...over,
  };
}

function sortReqs(r: Requirement[]): Requirement[] {
  return [...r].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : a.kind < b.kind ? -1 : 1,
  );
}

describe("Quick (builder) ≡ Advanced (store) for identical effective answers", () => {
  it("same answers → same payload → same DTO", () => {
    const viaBuilder = quickToProfile({
      workloads: [{ id: "gaming", importance: "primary" }],
      gamingSubtype: "aaa",
      region: "US",
      currency: "USD",
      budgetMax: 2500,
      priorities: ["speed", "screen"],
      ramGB: 16,
      ramMust: true,
      storageGB: 512,
      osPrefer: "windows",
      gpuPrefer: true,
    });

    // Same answers through the Zustand store (the Advanced editing surface).
    useV3QuizStore.getState().reset();
    const s = useV3QuizStore.getState();
    s.toggleWorkload("gaming");
    s.setGamingSubtype("aaa");
    s.setBudget(null, 2500, false);
    s.togglePriority("speed");
    s.togglePriority("screen");
    s.setRam(16, true);
    s.setStorage(512, false);
    s.setOs("prefer", "windows");
    s.setGpu("prefer");
    const viaStore = useV3QuizStore.getState().profile;

    // Same effective payload (requirement order-insensitive).
    expect(viaStore.workloads).toEqual(viaBuilder.workloads);
    expect(viaStore.budget).toEqual(viaBuilder.budget);
    expect(viaStore.priorities).toEqual(viaBuilder.priorities);
    expect(sortReqs(viaStore.requirements)).toEqual(sortReqs(viaBuilder.requirements));

    // Same DTO through the same engine.
    const catalog = [lap(), lap({ price: 2000, gpuVRAM: 12 }), lap({ price: 900 }), lap({ price: 1500, ramAmount: 32 })];
    const d1 = runV3(catalog, viaBuilder);
    const d2 = runV3(catalog, viaStore);
    expect(d2.items.map((i) => i.laptopId)).toEqual(d1.items.map((i) => i.laptopId));
    expect(d2).toEqual(d1);
  });

  it("Advanced refinement mutates the same profile and rescoring reflects it", () => {
    const base: CanonicalProfile = quickToProfile({
      workloads: [{ id: "study-office", importance: "primary" }],
      region: "US", currency: "USD", budgetMax: 2000,
    });
    const catalog = [
      lap({ cpuBrand: "intel", price: 1000 }),
      lap({ cpuBrand: "amd", price: 1000 }),
      lap({ price: 1200 }),
      lap({ price: 800 }),
    ];
    const before = runV3(catalog, base);
    // Advanced edit: brand-prefer amd (Type-B target → C only, W untouched).
    const refined: CanonicalProfile = {
      ...base,
      requirements: [
        ...base.requirements,
        { id: "brand-prefer", kind: "target", targetClass: "B", importance: 3, target: "amd", provenance: { source: "advanced", reason: "AMD preferred" }, userMust: false },
      ],
    };
    const after = runV3(catalog, refined);
    // Quick answers preserved (workloads/budget identical).
    expect(refined.workloads).toEqual(base.workloads);
    expect(refined.budget).toEqual(base.budget);
    // The Type-B target moves C for non-AMD laptops.
    const amdBefore = before.items.find((i) => i.laptopId === catalog[1].id)!;
    const amdAfter = after.items.find((i) => i.laptopId === catalog[1].id)!;
    expect(amdAfter.scores.C).toBeGreaterThanOrEqual(amdBefore.scores.C);
    const intelAfter = after.items.find((i) => i.laptopId === catalog[0].id)!;
    expect(intelAfter.scores.C).toBeLessThan(1);
    // W untouched by a Type-B target (no double count).
    expect(intelAfter.scores.W).toBe(
      before.items.find((i) => i.laptopId === catalog[0].id)!.scores.W,
    );
  });

  it("backward/forward navigation preserves answers (store is append-only per field)", () => {
    useV3QuizStore.getState().reset();
    const s = useV3QuizStore.getState();
    s.toggleWorkload("dev");
    s.toggleWorkload("study-office");
    s.setImportance("study-office", "occasional");
    s.setBudget(500, 1500, false);
    s.togglePriority("battery");
    s.setRam(32, false);
    s.go(3);
    s.go(0); // navigate back
    const p = useV3QuizStore.getState().profile;
    expect(p.workloads).toHaveLength(2);
    expect(p.budget).toMatchObject({ min: 500, max: 1500 });
    expect(p.priorities).toEqual(["battery"]);
    expect(p.requirements.some((r) => r.id === "ram" && r.target === 32)).toBe(true);
    s.go(3); // forward again — nothing lost
    expect(useV3QuizStore.getState().profile).toEqual(p);
  });
});
