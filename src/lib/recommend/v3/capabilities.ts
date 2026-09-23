/**
 * v3 capability normalization — exact anchors + linear interpolation (locked spec §C).
 * Null stays null (excluded from W numerator AND denominator). Never 0, never 0.5.
 * Thermals is a modifier on cpu (+0.03/0/-0.03), never a standalone dim.
 */
import type { ScorableLaptop } from "../../types";
import type { DimV3 } from "./types";

export type CapSource = "measured" | "claimed" | "inferred" | "missing";
export interface Capability { value: number | null; confidence: number; source: CapSource }
export type CapabilitySetV3 = Record<DimV3, Capability>;

/** Piecewise-linear interpolation over [x,y] anchors sorted ascending. */
export function interpAnchors(x: number, anchors: Array<[number, number]>): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    if (x <= anchors[i][0]) {
      const [x0, y0] = anchors[i - 1];
      const [x1, y1] = anchors[i];
      const t = (x - x0) / (x1 - x0 || 1);
      return y0 + t * (y1 - y0);
    }
  }
  return anchors[anchors.length - 1][1];
}

const CPU_ANCHORS: Array<[number, number]> = [[4, 0.45], [6, 0.6], [8, 0.75], [12, 0.9], [16, 1.0]];
const VRAM_ANCHORS: Array<[number, number]> = [[0, 0.1], [6, 0.5], [8, 0.75], [12, 0.9], [16, 1.0]];
const RAM_ANCHORS: Array<[number, number]> = [[8, 0.5], [16, 0.8], [24, 0.9], [32, 1.0]];
const STORAGE_ANCHORS: Array<[number, number]> = [[256, 0.5], [512, 0.8], [1024, 1.0]];
const BATTERY_ANCHORS: Array<[number, number]> = [[4, 0.2], [6, 0.55], [8, 0.75], [10, 0.9], [12, 1.0]];
const REFRESH_ANCHORS: Array<[number, number]> = [[60, 0.3], [90, 0.6], [120, 0.9], [144, 1.0]];
const BRIGHTNESS_ANCHORS: Array<[number, number]> = [[300, 0.55], [400, 0.8], [500, 1.0]];

export function cpuCap(cores: number | null): Capability {
  if (cores == null) return { value: null, confidence: 0, source: "missing" };
  return { value: interpAnchors(cores, CPU_ANCHORS), confidence: 0.8, source: "measured" };
}

export function gpuCap(type: string | null, vram: number | null): Capability {
  if (!type) return { value: null, confidence: 0, source: "missing" };
  if (type === "dedicated") {
    if (vram == null) return { value: 0.7, confidence: 0.5, source: "inferred" };
    if (vram <= 6) return { value: 0.7, confidence: 0.9, source: "measured" };
    return { value: interpAnchors(vram, [[6, 0.7], [8, 0.8], [12, 0.9], [16, 1.0]]), confidence: 0.9, source: "measured" };
  }
  return { value: 0.3, confidence: 0.8, source: "inferred" };
}

export function vramCap(vram: number | null, gpuType: string | null): Capability {
  if (vram == null) {
    // Integrated/unknown VRAM is reflected in gpu=.30 already; vram dim excluded (no double hit).
    if (gpuType === "dedicated") return { value: 0.7, confidence: 0.5, source: "inferred" };
    return { value: null, confidence: 0, source: "missing" };
  }
  return { value: interpAnchors(vram, VRAM_ANCHORS), confidence: 0.9, source: "measured" };
}

export function ramCap(gb: number): Capability {
  if (gb < 8) return { value: 0.2, confidence: 1.0, source: "measured" };
  if (gb > 32) return { value: 1.0, confidence: 1.0, source: "measured" };
  return { value: interpAnchors(gb, RAM_ANCHORS), confidence: 1.0, source: "measured" };
}

export function storageCap(gb: number): Capability {
  if (gb < 256) return { value: 0.3, confidence: 1.0, source: "measured" };
  if (gb > 1024) return { value: 1.0, confidence: 1.0, source: "measured" };
  return { value: interpAnchors(gb, STORAGE_ANCHORS), confidence: 1.0, source: "measured" };
}

export function batteryCap(hours: number | null): Capability {
  if (hours == null) return { value: null, confidence: 0, source: "missing" };
  return { value: interpAnchors(hours, BATTERY_ANCHORS), confidence: 0.6, source: "claimed" };
}

export function portabilityCap(weight: number | null, carry: "always" | "balanced" | "desk" | null): Capability {
  if (weight == null) return { value: null, confidence: 0, source: "missing" };
  if (carry === "always") {
    if (weight <= 1.2) return { value: 1.0, confidence: 0.9, source: "measured" };
    return { value: interpAnchors(weight, [[1.2, 1.0], [1.5, 0.85], [1.8, 0.65], [2.2, 0.35]]), confidence: 0.9, source: "measured" };
  }
  if (carry === "desk") {
    // Desk users neutral-to-positive on heavy (documented inversion).
    return { value: weight >= 2.2 ? 0.8 : 0.5, confidence: 0.7, source: "inferred" };
  }
  // balanced / null: commuter peak 1.5–1.8
  if (weight <= 1.2) return { value: 0.9, confidence: 0.9, source: "measured" };
  if (weight <= 1.5) return { value: 1.0, confidence: 0.9, source: "measured" };
  if (weight <= 2.0) return { value: 0.9, confidence: 0.9, source: "measured" };
  if (weight <= 2.5) return { value: 0.5, confidence: 0.9, source: "measured" };
  return { value: 0.25, confidence: 0.9, source: "measured" };
}

export function panelScore(panel: string | null): { value: number; confidence: number } {
  if (!panel) return { value: 0.5, confidence: 0.3 };
  const p = panel.toLowerCase();
  if (p.includes("oled")) return { value: 1.0, confidence: 0.9 };
  if (p.includes("mini-led") || p.includes("miniled")) return { value: 0.9, confidence: 0.8 };
  if (p.includes("ips") || p.includes("va")) return { value: 0.6, confidence: 0.7 };
  return { value: 0.4, confidence: 0.5 };
}

export function gamutScore(gamut: string | null): number | null {
  if (!gamut) return null;
  const g = gamut.toUpperCase();
  if (g.includes("P3") || g.includes("100%") || g.includes("ADOBE")) return 1.0;
  if (g.includes("SRGB") || g.includes("NTSC")) return 0.65;
  return 0.5;
}

export interface ScreenPrefs {
  smooth: boolean; vivid: boolean; sharp: boolean; touch: boolean;
}

export function displayCap(
  l: Pick<ScorableLaptop, "displayRefreshRate" | "displayPanelType" | "displayBrightness" | "displayColorGamut" | "isTouchscreen">,
  prefs: ScreenPrefs,
): Capability {
  const subs: Array<{ v: number; w: number; conf: number }> = [];
  const refresh = interpAnchors(l.displayRefreshRate, REFRESH_ANCHORS);
  subs.push({ v: refresh, w: prefs.smooth ? 2 : 1, conf: 0.9 });
  const panel = panelScore(l.displayPanelType);
  subs.push({ v: panel.value, w: prefs.vivid ? 2 : 1, conf: panel.confidence });
  if (l.displayBrightness != null) {
    subs.push({ v: interpAnchors(l.displayBrightness, BRIGHTNESS_ANCHORS), w: prefs.sharp ? 2 : 1, conf: 0.8 });
  }
  const gamut = gamutScore(l.displayColorGamut);
  if (gamut != null) subs.push({ v: gamut, w: prefs.vivid ? 2 : 1, conf: 0.7 });
  if (prefs.touch) subs.push({ v: l.isTouchscreen ? 1.0 : 0.2, w: 2, conf: 0.9 });
  if (subs.length === 0) return { value: null, confidence: 0, source: "missing" };
  const wSum = subs.reduce((s, x) => s + x.w, 0);
  const conf = subs.reduce((s, x) => s + x.conf * x.w, 0) / wSum;
  return { value: subs.reduce((s, x) => s + x.v * x.w, 0) / wSum, confidence: conf, source: conf >= 0.7 ? "measured" : "inferred" };
}

const METAL_RE = /carbon|titanium|magnesium|alumin(i|iu)m/i;
export function buildCap(material: string | null): Capability {
  if (!material) return { value: null, confidence: 0, source: "missing" };
  if (METAL_RE.test(material)) return { value: 0.9, confidence: 0.6, source: "claimed" };
  return { value: 0.5, confidence: 0.4, source: "claimed" };
}

/**
 * Thermals modifier on cpu (never a standalone dim).
 * Catalog has no TDP/cooler fields → always { adjust: 0, unknown: true } today.
 * Kept as a function so a future source can plug in without changing the scorer.
 */
export function thermalsModifier(_laptop: unknown): { adjust: number; unknown: boolean } {
  return { adjust: 0, unknown: true };
}

export interface CapsContext {
  carry: "always" | "balanced" | "desk" | null;
  screen: ScreenPrefs;
}

export function capabilitiesForV3(l: ScorableLaptop, ctx: CapsContext): CapabilitySetV3 {
  const cpu = cpuCap(l.cpuCores);
  const th = thermalsModifier(l);
  if (cpu.value != null && th.adjust !== 0) {
    cpu.value = Math.max(0, Math.min(1, cpu.value + th.adjust));
  }
  return {
    cpu,
    gpu: gpuCap(l.gpuType, l.gpuVRAM),
    vram: vramCap(l.gpuVRAM, l.gpuType),
    ram: ramCap(l.ramAmount),
    storage: storageCap(l.storageAmount),
    display: displayCap(l, ctx.screen),
    battery: batteryCap(l.batteryLife),
    portability: portabilityCap(l.weight, ctx.carry),
    build: buildCap(l.buildMaterial),
  };
}
