/**
 * Capability normalization (Phase 2D). Null stays null; never coerced.
 * Bands carry brief rationale; thresholds are versioned with WEIGHTS_VERSION v1.
 */
import type { ScorableLaptop } from "../types"
import type { Dim9 } from "./weights"

export type CapSource = "measured" | "claimed" | "inferred" | "missing"
export interface Capability { value: number | null; confidence: number; source: CapSource }
export type CapabilitySet = Record<Dim9, Capability>

// Shared band functions (also imported by decomposition.ts — one formula each).
export function cpuBand(cores: number | null): number | null {
  if (cores == null) return null
  if (cores >= 16) return 1.0 // flagship mobile (HX/Max-class core counts)
  if (cores >= 12) return 0.9
  if (cores >= 8) return 0.75 // modern performance baseline
  if (cores >= 6) return 0.6
  if (cores >= 4) return 0.45
  return 0.25
}

export function gpuBand(type: string, vram: number | null): { value: number; confidence: number; source: CapSource } {
  if (type === "dedicated") {
    if (vram == null) return { value: 0.7, confidence: 0.5, source: "inferred" }
    if (vram >= 12) return { value: 1.0, confidence: 0.9, source: "measured" }
    if (vram >= 8) return { value: 0.9, confidence: 0.9, source: "measured" }
    if (vram >= 6) return { value: 0.8, confidence: 0.9, source: "measured" }
    return { value: 0.7, confidence: 0.9, source: "measured" }
  }
  return { value: 0.3, confidence: 0.8, source: "inferred" } // iGPU tier, no dGPU
}

export function ramBand(gb: number): number {
  if (gb >= 32) return 1.0
  if (gb >= 16) return 0.8
  if (gb >= 8) return 0.5
  return 0.2
}

export function storageBand(gb: number): number {
  if (gb >= 1024) return 1.0
  if (gb >= 512) return 0.8
  if (gb >= 256) return 0.5
  return 0.3
}

export function batteryBand(hours: number | null): number | null {
  if (hours == null) return null
  if (hours >= 12) return 1.0
  if (hours >= 10) return 0.9
  if (hours >= 8) return 0.75 // full workday threshold
  if (hours >= 6) return 0.55
  if (hours >= 4) return 0.35
  return 0.2
}

export function portabilityBand(weight: number | null, pref: string | null): number | null {
  if (weight == null) return null
  if (pref === "always") return weight <= 1.2 ? 1.0 : weight <= 1.5 ? 0.9 : weight <= 1.8 ? 0.6 : weight <= 2.2 ? 0.35 : 0.15
  if (pref === "desk") return weight >= 2.2 ? 0.8 : 0.5 // desk users neutral-to-positive on heavy
  // sometimes / unset: peak at 1.5–2.0 kg commuter band
  return weight <= 1.2 ? 0.9 : weight <= 1.5 ? 1.0 : weight <= 2.0 ? 0.9 : weight <= 2.5 ? 0.5 : 0.25
}

export function refreshBand(hz: number): number {
  if (hz >= 144) return 1.0
  if (hz >= 120) return 0.9
  if (hz >= 90) return 0.6
  if (hz >= 60) return 0.4
  return 0.3
}

export function panelBand(panel: string | null): { value: number; confidence: number } {
  if (!panel) return { value: 0.5, confidence: 0.3 }
  const p = panel.toLowerCase()
  if (p.includes("oled")) return { value: 1.0, confidence: 0.9 }
  if (p.includes("mini-led") || p.includes("miniled")) return { value: 0.9, confidence: 0.8 }
  if (p.includes("ips") || p.includes("va")) return { value: 0.6, confidence: 0.7 }
  return { value: 0.4, confidence: 0.5 }
}

export function brightnessBand(nits: number | null): number | null {
  if (nits == null) return null
  if (nits >= 500) return 1.0
  if (nits >= 400) return 0.85 // outdoor-usable threshold
  if (nits >= 300) return 0.65
  return 0.4
}

export function gamutBand(gamut: string | null): number | null {
  if (!gamut) return null
  const g = gamut.toUpperCase()
  if (g.includes("P3") || g.includes("100%") || g.includes("ADOBE")) return 1.0
  if (g.includes("SRGB") || g.includes("NTSC")) return 0.6
  return 0.5
}

export function buildBand(material: string | null): { value: number; confidence: number; source: CapSource } {
  if (!material) return { value: 0.5, confidence: 0.3, source: "missing" }
  const m = material.toLowerCase()
  if (m.includes("carbon") || m.includes("titanium") || m.includes("magnesium") || m.includes("aluminum") || m.includes("aluminium")) {
    return { value: 1.0, confidence: 0.6, source: "claimed" }
  }
  return { value: 0.5, confidence: 0.5, source: "claimed" }
}

export interface DisplayOpts { screen: Array<"sharp" | "smooth" | "vivid" | "touch">; touchAvailable: boolean; isTouchscreen: boolean }

export function displayCapability(
  l: Pick<ScorableLaptop, "displayRefreshRate" | "displayPanelType" | "displayBrightness" | "displayColorGamut">,
  opts: DisplayOpts
): Capability {
  const subs: Array<{ v: number; w: number; conf: number }> = []
  const push = (v: number | null, conf: number, w = 1) => { if (v != null) subs.push({ v, w, conf }) }
  const vivid = opts.screen.includes("vivid"), smooth = opts.screen.includes("smooth"), sharp = opts.screen.includes("sharp")
  push(refreshBand(l.displayRefreshRate), 0.9, smooth ? 2 : 1)
  const panel = panelBand(l.displayPanelType)
  push(panel.value, panel.confidence, vivid ? 2 : 1)
  push(brightnessBand(l.displayBrightness), 0.8, sharp ? 2 : 1)
  push(gamutBand(l.displayColorGamut), 0.7, vivid ? 2 : 1)
  if (opts.screen.includes("touch")) {
    push(opts.touchAvailable ? (opts.isTouchscreen ? 1.0 : 0.2) : 0.5, opts.touchAvailable ? 0.9 : 0.3, 2)
  }
  if (subs.length === 0) return { value: null, confidence: 0, source: "missing" }
  const wSum = subs.reduce((s, x) => s + x.w, 0)
  const conf = subs.reduce((s, x) => s + x.conf * x.w, 0) / wSum
  return { value: subs.reduce((s, x) => s + x.v * x.w, 0) / wSum, confidence: conf, source: conf >= 0.7 ? "measured" : "inferred" }
}

export function capabilitiesFor(
  l: ScorableLaptop,
  ctx: { carry: "desk" | "sometimes" | "always" | null; screen: DisplayOpts["screen"] }
): CapabilitySet {
  const gpu = gpuBand(l.gpuType, l.gpuVRAM)
  const build = buildBand(l.buildMaterial)
  const battery = batteryBand(l.batteryLife)
  const portability = portabilityBand(l.weight, ctx.carry)
  return {
    cpu: l.cpuCores == null
      ? { value: null, confidence: 0, source: "missing" }
      : { value: cpuBand(l.cpuCores), confidence: 0.8, source: "measured" },
    gpu: { value: gpu.value, confidence: gpu.confidence, source: gpu.source },
    ram: { value: ramBand(l.ramAmount), confidence: 1.0, source: "measured" },
    storage: { value: storageBand(l.storageAmount), confidence: 1.0, source: "measured" },
    battery: battery == null
      ? { value: null, confidence: 0, source: "missing" }
      : { value: battery, confidence: 0.6, source: "claimed" },
    portability: portability == null
      ? { value: null, confidence: 0, source: "missing" }
      : { value: portability, confidence: 0.9, source: "measured" },
    display: displayCapability(l, { screen: ctx.screen, touchAvailable: true, isTouchscreen: l.isTouchscreen }),
    build: { value: build.value, confidence: build.confidence, source: build.source },
    // Pool-relative value is injected by the engine (needs pool context).
    value: { value: null, confidence: 0, source: "missing" },
  }
}
