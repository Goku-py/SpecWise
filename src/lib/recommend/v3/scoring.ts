/**
 * v3 scoring — W/C/V/K/Final exactly per locked spec §§H/4/5/10.
 * Final = 0.65W + 0.20C + 0.15V (Best-value: 0.55/0.20/0.25).
 * K never scales Final; near-tie nudge ε=0.005 only in ranking.
 */
import type { ScorableLaptop } from "../../types";
import type { CanonicalProfile, DimV3, Requirement } from "./types";
import { DIMS_V3 } from "./types";
import { blendWorkloadWeights, applyPriorities } from "./workloads";
import { capabilitiesForV3, type CapabilitySetV3, type CapsContext } from "./capabilities";

export const ALPHA = 0.65;
export const BETA = 0.2;
export const GAMMA = 0.15;
export const ALPHA_VALUE = 0.55;
export const GAMMA_VALUE = 0.25;
export const TIE_EPS = 0.005;

export function weightsForProfile(profile: CanonicalProfile): Record<DimV3, number> {
  const allOccasional =
    profile.workloads.length > 0 &&
    profile.workloads.every((w) => w.importance === "occasional");
  const inputs = profile.workloads.map((w) => ({
    id: w.id,
    importance: allOccasional
      ? ("secondary" as const)
      : w.importance,
    subprofile: w.subprofile,
  }));
  const blended = blendWorkloadWeights(inputs);
  return applyPriorities(blended, profile.priorities);
}

export function capsContextFor(profile: CanonicalProfile): CapsContext {
  const carry = profile.priorities.includes("carry")
    ? "always"
    : ("balanced" as const);
  const screen = {
    smooth: false,
    vivid: profile.priorities.includes("screen"),
    sharp: profile.priorities.includes("screen"),
    touch: profile.requirements.some(
      (r) => r.id === "touch-prefer" && r.kind === "target",
    ),
  };
  return { carry, screen };
}

/** W — weighted capability mean over available dims only. Mask-conditional monotone. */
export function workloadFit(
  caps: CapabilitySetV3,
  weights: Record<DimV3, number>,
): number {
  const avail = DIMS_V3.filter((d) => caps[d].value != null);
  const wSum = avail.reduce((s, d) => s + weights[d], 0) || 1;
  return avail.reduce((s, d) => s + weights[d] * caps[d].value!, 0) / wSum;
}

function numShortfall(target: number, actual: number): number {
  if (actual >= target) return 0;
  return Math.max(0, Math.min(1, (target - actual) / target));
}

/**
 * C — Type-B targets only (os-prefer, brand-prefer, upgrade-prefer,
 * touch-prefer, resolution-prefer, color-prefer, oled-prefer).
 * Type-A targets are W-only (no double count). No targets ⇒ C=1.
 */
export function targetFit(
  laptop: ScorableLaptop,
  requirements: Requirement[],
): number {
  const targets = requirements.filter(
    (r) => r.kind === "target" && r.targetClass === "B",
  );
  if (targets.length === 0) return 1;
  let num = 0;
  let den = 0;
  for (const t of targets) {
    const imp = t.importance;
    den += imp;
    let short = 0;
    switch (t.id) {
      case "os-prefer":
        short = typeof t.target === "string" && laptop.os.toLowerCase() === t.target.toLowerCase() ? 0 : 1;
        break;
      case "brand-prefer":
        short = typeof t.target === "string" && laptop.cpuBrand.toLowerCase() === t.target.toLowerCase() ? 0 : 1;
        break;
      case "upgrade-prefer":
        if (typeof t.target === "string") {
          const wantRam = t.target.includes("ram");
          const wantSt = t.target.includes("storage");
          const got = (wantRam ? (laptop.ramUpgradeable ? 1 : 0) : 1) * (wantSt ? (laptop.storageExpandable ? 1 : 0) : 1);
          short = got ? 0 : 1;
        }
        break;
      case "touch-prefer":
        short = laptop.isTouchscreen ? 0 : 1;
        break;
      case "resolution-prefer":
      case "color-prefer":
      case "oled-prefer":
        // Capability-mapped display prefs are W-scored; these B-marked display
        // prefs are boolean confirmations from explanation only.
        short = 0;
        break;
      default:
        short = 0; // Type-A ids reaching here are ignored (W-only).
        break;
    }
    num += imp * short;
  }
  if (den === 0) return 1;
  return 1 - num / den;
}

export interface PoolValue {
  V: Map<string, number>;
  neutral: boolean;
}

/**
 * V — pool-local value. V = 0.5·perfNorm + 0.5·priceScore over ln(priceUSD).
 * FX constants cancel in min-max (currency-invariant). Pools <4 → neutral 0.5.
 * priceMissing → absent from map (caller renormalizes + lanes).
 */
export function poolValue(
  items: Array<{ id: string; W: number; priceUSD: number | null }>,
): PoolValue {
  const priced = items.filter((i) => i.priceUSD != null && i.priceUSD > 0);
  if (items.length < 4 || priced.length < 2) {
    return { V: new Map(items.map((i) => [i.id, 0.5])), neutral: true };
  }
  const Ws = priced.map((i) => i.W);
  const lns = priced.map((i) => Math.log(i.priceUSD!));
  const minW = Math.min(...Ws);
  const maxW = Math.max(...Ws);
  const minL = Math.min(...lns);
  const maxL = Math.max(...lns);
  const m = new Map<string, number>();
  for (const i of items) {
    if (i.priceUSD == null || i.priceUSD <= 0) continue;
    const perfNorm = maxW === minW ? 0.5 : (i.W - minW) / (maxW - minW);
    const priceScore = maxL === minL ? 0.5 : (maxL - Math.log(i.priceUSD)) / (maxL - minL);
    m.set(i.id, 0.5 * perfNorm + 0.5 * priceScore);
  }
  // Unpriced items: absent (null V). Fill neutral only for map completeness checks.
  for (const i of items) if (!m.has(i.id)) m.set(i.id, 0.5);
  return { V: m, neutral: false };
}

/** K — 0.6·completeness + 0.4·freshness. Tiers High≥.80 Med≥.55. */
export function confidenceFor(
  caps: CapabilitySetV3,
  weights: Record<DimV3, number>,
  priceMissing: boolean,
  priceStale: boolean,
): { K: number; completeness: number; factors: string[] } {
  const dims = DIMS_V3;
  const total = dims.reduce((s, d) => s + weights[d], 0) || 1;
  const avail = dims.reduce((s, d) => s + (caps[d].value != null ? weights[d] : 0), 0);
  const completeness = avail / total;
  const freshness = priceMissing ? 0.3 : priceStale ? 0.6 : 1.0;
  const factors: string[] = [];
  for (const d of dims) if (caps[d].value == null) factors.push(`${d} unlisted`);
  if (caps.cpu.confidence === 0 && caps.cpu.value == null) void 0;
  factors.push("thermal data unavailable");
  if (priceStale) factors.push("price stale");
  if (priceMissing) factors.push("price unavailable");
  const K = 0.6 * completeness + 0.4 * freshness;
  return { K, completeness, factors };
}

export function tierFor(K: number): "high" | "medium" | "limited" {
  if (K >= 0.8) return "high";
  if (K >= 0.55) return "medium";
  return "limited";
}

export function finalScore(
  W: number,
  C: number,
  V: number | null,
  bestValue: boolean,
): number {
  const v = V ?? 0.5;
  if (bestValue) return ALPHA_VALUE * W + BETA * C + GAMMA_VALUE * v;
  return ALPHA * W + BETA * C + GAMMA * v;
}
