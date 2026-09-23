/**
 * v3 engine — Eligibility → W/C/V/K → Final → Ranking → Diversity/Lanes → Explanation → DTO.
 * Deterministic total order: Final → K(ε) → price → weight → id.
 * Relaxation: ≤3 auto steps over soft-hards only; intent-hards (os/refurb/budget-min) NEVER auto.
 */
import type { ScorableLaptop } from "../../types";
import type {
  CanonicalProfile, RankedItemDTO, RecommendationDTO, RelaxEntry, Requirement,
} from "./types";
import { DIMS_V3, SCORING_VERSION_V3, WEIGHTS_VERSION_V3 } from "./types";
import { capabilitiesForV3 } from "./capabilities";
import { buildRequirements, hardStateFrom, type HardStateV3 } from "./requirements";
import {
  weightsForProfile, capsContextFor, workloadFit, targetFit, poolValue,
  confidenceFor, tierFor, finalScore, TIE_EPS,
} from "./scoring";

export function isPriceMissingV3(l: Pick<ScorableLaptop, "price" | "priceMissing">): boolean {
  return l.priceMissing ?? l.price <= 0;
}

export interface Missed { id: string; required: string; actual: string }

function hardFailures(l: ScorableLaptop, h: HardStateV3): Missed[] {
  const out: Missed[] = [];
  const missing = isPriceMissingV3(l);
  if (h.budgetMin != null && (missing || l.price < h.budgetMin)) {
    out.push({ id: "budget", required: `≥${h.budgetMin}`, actual: missing ? "unlisted" : String(l.price) });
  }
  if (h.budgetMax != null && (missing || l.price > h.budgetMax)) {
    out.push({ id: "budget", required: `≤${h.budgetMax}`, actual: missing ? "unlisted" : String(l.price) });
  }
  if (h.os && l.os.toLowerCase() !== h.os.toLowerCase()) {
    out.push({ id: "os", required: h.os, actual: l.os });
  }
  if (h.minRam != null && l.ramAmount < h.minRam) {
    out.push({ id: "ram", required: `≥${h.minRam}GB`, actual: `${l.ramAmount}GB` });
  }
  if (h.minStorage != null && l.storageAmount < h.minStorage) {
    out.push({ id: "storage", required: `≥${h.minStorage}GB`, actual: `${l.storageAmount}GB` });
  }
  if (h.gpuDedicated && l.gpuType !== "dedicated") {
    out.push({ id: "gpu", required: "dedicated", actual: l.gpuType });
  }
  if (h.minVRAM != null && (l.gpuVRAM ?? -1) < h.minVRAM) {
    out.push({ id: "vram", required: `≥${h.minVRAM}GB`, actual: l.gpuVRAM == null ? "unlisted" : `${l.gpuVRAM}GB` });
  }
  if (h.maxWeight != null && (l.weight == null || l.weight > h.maxWeight)) {
    out.push({ id: "weight", required: `≤${h.maxWeight}kg`, actual: l.weight == null ? "unlisted" : `${l.weight}kg` });
  }
  if (h.minRefresh != null && l.displayRefreshRate < h.minRefresh) {
    out.push({ id: "refresh", required: `≥${h.minRefresh}Hz`, actual: `${l.displayRefreshRate}Hz` });
  }
  if (h.minSize != null && l.displaySize < h.minSize) {
    out.push({ id: "displaySize", required: `≥${h.minSize}"`, actual: `${l.displaySize}"` });
  }
  if (h.minBattery != null && (l.batteryLife == null || l.batteryLife < h.minBattery)) {
    out.push({ id: "battery", required: `≥${h.minBattery}h`, actual: l.batteryLife == null ? "unlisted" : `${l.batteryLife}h` });
  }
  if (h.minCores != null && (l.cpuCores == null || l.cpuCores < h.minCores)) {
    out.push({ id: "cpu-cores", required: `≥${h.minCores} cores`, actual: l.cpuCores == null ? "unlisted" : `${l.cpuCores}` });
  }
  if (h.ports.length > 0) {
    const have = new Set(l.ports.map((p) => p.toLowerCase()));
    const miss = h.ports.filter((p) => !have.has(p.toLowerCase()));
    if (miss.length > 0) out.push({ id: "ports", required: h.ports.join("+"), actual: `missing ${miss.join(",")}` });
  }
  if (h.ramUpgradeRequired && !l.ramUpgradeable) {
    out.push({ id: "upgrade", required: "RAM upgradeable", actual: "soldered" });
  }
  if (h.storageUpgradeRequired && !l.storageExpandable) {
    out.push({ id: "upgrade", required: "storage expandable", actual: "sealed" });
  }
  if (h.newOnly && l.isRefurbished) {
    out.push({ id: "refurb", required: "new only", actual: "refurbished" });
  }
  return out;
}

interface RelaxOp {
  id: string;
  applies: (h: HardStateV3) => boolean;
  apply: (h: HardStateV3) => { h: HardStateV3; entry: RelaxEntry };
}

const STORAGE_BANDS = [1024, 512, 256];
const RAM_BANDS = [32, 24, 16, 8];

function lowerRam(f: number): number | null {
  for (const b of RAM_BANDS) if (b < f) return b;
  return null;
}
function lowerStorage(f: number): number | null {
  if (f > 1024) return 1024;
  const i = STORAGE_BANDS.indexOf(f);
  if (i === -1) return 256;
  return STORAGE_BANDS[i + 1] ?? null;
}

/** Locked order: budget → storage → RAM → GPU → VRAM/refresh/size → ports → weight/battery. OS/refurb/budget-min NEVER. */
const RELAX_OPS: RelaxOp[] = [
  { id: "budget", applies: (h) => h.budgetMax != null,
    apply: (h) => {
      const step1 = Math.round(h.budgetMax! * 1.1);
      return { h: { ...h, budgetMax: step1 }, entry: { requirement: "budget", from: `≤${h.budgetMax}`, to: `≤${step1}`, reason: "budget widened +10%" } };
    } },
  { id: "budget2", applies: (h) => h.budgetMax != null,
    apply: (h) => {
      const step2 = Math.round(h.budgetMax! * 1.1364); // ≈+25% cumulative over original
      return { h: { ...h, budgetMax: step2 }, entry: { requirement: "budget", from: `≤${h.budgetMax}`, to: `≤${step2}`, reason: "budget widened to +25% cumulative" } };
    } },
  { id: "storage", applies: (h) => h.minStorage != null,
    apply: (h) => {
      const next = lowerStorage(h.minStorage!);
      return { h: { ...h, minStorage: next }, entry: { requirement: "storage", from: `≥${h.minStorage}GB`, to: next == null ? "any" : `≥${next}GB`, reason: "storage floor lowered one band" } };
    } },
  { id: "ram", applies: (h) => h.minRam != null,
    apply: (h) => {
      const next = lowerRam(h.minRam!);
      return { h: { ...h, minRam: next }, entry: { requirement: "ram", from: `≥${h.minRam}GB`, to: next == null ? "any" : `≥${next}GB`, reason: "memory floor lowered one band" } };
    } },
  { id: "gpu", applies: (h) => h.gpuDedicated,
    apply: (h) => ({ h: { ...h, gpuDedicated: false, minVRAM: null }, entry: { requirement: "gpu", from: "dedicated", to: "any (preferred)", reason: "dedicated-GPU hard relaxed to preference" } }) },
  { id: "vram", applies: (h) => h.minVRAM != null,
    apply: (h) => ({ h: { ...h, minVRAM: null }, entry: { requirement: "vram", from: `≥${h.minVRAM}GB`, to: "any", reason: "VRAM floor relaxed to preference" } }) },
  { id: "refresh", applies: (h) => h.minRefresh != null,
    apply: (h) => ({ h: { ...h, minRefresh: null }, entry: { requirement: "refresh", from: `≥${h.minRefresh}Hz`, to: "any", reason: "refresh floor relaxed to preference" } }) },
  { id: "displaySize", applies: (h) => h.minSize != null,
    apply: (h) => ({ h: { ...h, minSize: null }, entry: { requirement: "displaySize", from: `≥${h.minSize}"`, to: "any", reason: "display-size floor relaxed" } }) },
  { id: "ports", applies: (h) => h.ports.length > 0,
    apply: (h) => {
      const next = h.ports.slice(0, Math.max(0, h.ports.length - 1));
      return { h: { ...h, ports: next }, entry: { requirement: "ports", from: h.ports.join("+"), to: next.length === 0 ? "any" : next.join("+"), reason: "port set shrunk by one" } };
    } },
  { id: "weight", applies: (h) => h.maxWeight != null,
    apply: (h) => ({ h: { ...h, maxWeight: null }, entry: { requirement: "weight", from: `≤${h.maxWeight}kg`, to: "any", reason: "weight ceiling relaxed to preference" } }) },
  { id: "battery", applies: (h) => h.minBattery != null,
    apply: (h) => ({ h: { ...h, minBattery: null }, entry: { requirement: "battery", from: `≥${h.minBattery}h`, to: "any", reason: "battery floor relaxed to preference" } }) },
  { id: "cores", applies: (h) => h.minCores != null,
    apply: (h) => ({ h: { ...h, minCores: null }, entry: { requirement: "cpu-cores", from: `≥${h.minCores}`, to: "any", reason: "CPU-core floor relaxed" } }) },
  { id: "upgrade", applies: (h) => h.ramUpgradeRequired || h.storageUpgradeRequired,
    apply: (h) => ({ h: { ...h, ramUpgradeRequired: false, storageUpgradeRequired: false }, entry: { requirement: "upgrade", from: "required", to: "preferred", reason: "upgradeability relaxed to preference" } }) },
];

function evidenceFor(dim: string, l: ScorableLaptop): string {
  switch (dim) {
    case "cpu": return `${l.cpuCores ?? "?"}-core ${l.cpuFamily}`;
    case "gpu": return l.gpuType === "dedicated" ? `dedicated ${l.gpuModel ?? ""} ${l.gpuVRAM ?? "?"}GB`.trim() : "integrated graphics";
    case "vram": return l.gpuVRAM != null ? `${l.gpuVRAM} GB VRAM` : "VRAM unlisted";
    case "ram": return `${l.ramAmount} GB RAM`;
    case "storage": return `${l.storageAmount} GB ${l.storageType}`;
    case "battery": return l.batteryLife != null ? `${l.batteryLife}h battery` : "battery unlisted";
    case "portability": return l.weight != null ? `${l.weight} kg` : "weight unlisted";
    case "display": return `${l.displayRefreshRate} Hz ${l.displayPanelType ?? "display"}`;
    case "build": return l.buildMaterial ?? "build unlisted";
    default: return dim;
  }
}

interface Scored {
  laptop: ScorableLaptop;
  W: number; C: number; V: number | null; K: number;
  final: number; completeness: number;
  factors: string[];
  caps: Record<string, number | null>;
  weights: Record<string, number>;
  missedPreferred: Array<{ id: string; required: string; actual: string }>;
}

export function runV3(
  catalog: ScorableLaptop[],
  profile: CanonicalProfile,
  fxToUSD: (price: number, currency: string) => number = (p) => p,
): RecommendationDTO {
  const active = catalog.filter((l) => l.isActive);
  const { requirements, contradictions, notes } = buildRequirements(profile);
  const weights = weightsForProfile(profile) as Record<string, number>;
  const ctx = capsContextFor(profile);
  const bestValue = profile.priorities.includes("value");

  if (active.length === 0) {
    return emptyDTO(profile, contradictions, notes);
  }

  let hard = hardStateFrom(requirements);
  const ledger: RelaxEntry[] = [];
  let pool = active.filter((l) => hardFailures(l, hard).length === 0);
  let relaxed = false;

  if (pool.length < 3) {
    for (const op of RELAX_OPS) {
      if (ledger.length >= 3) break;
      if (pool.length >= 3) break;
      if (!op.applies(hard)) continue;
      // Budget second step only applies if first budget step was already taken.
      if (op.id === "budget2" && !ledger.some((e) => e.requirement === "budget")) continue;
      if (op.id === "budget" && ledger.some((e) => e.requirement === "budget")) continue;
      const next = op.apply(hard);
      hard = next.h;
      ledger.push(next.entry);
      relaxed = true;
      pool = active.filter((l) => hardFailures(l, hard).length === 0);
    }
  }

  const exhausted = pool.length === 0;
  const awaitingUser = exhausted && intentHardBlocks(requirements, active, hard);
  const workPool = exhausted
    ? [...active].sort((a, b) => hardFailures(a, hard).length - hardFailures(b, hard).length).slice(0, 12)
    : pool;

  // Score workPool.
  const ctxCarry = ctx.carry;
  const scored: Scored[] = workPool.map((l) => {
    const caps = capabilitiesForV3(l, { carry: ctxCarry, screen: ctx.screen });
    const W = workloadFit(caps, weights as Record<import("./types").DimV3, number>);
    const C = targetFit(l, requirements);
    const missing = isPriceMissingV3(l);
    const { K, completeness, factors } = confidenceFor(caps, weights as Record<import("./types").DimV3, number>, missing, l.priceStale ?? false);
    const capRec: Record<string, number | null> = {};
    for (const d of DIMS_V3) capRec[d] = caps[d].value;
    return { laptop: l, W, C, V: null, K, final: 0, completeness, factors, caps: capRec, weights: { ...weights }, missedPreferred: [] };
  });

  // Pool-local V (eligible pool; exhausted path uses workPool).
  const pv = poolValue(scored.map((s) => ({
    id: s.laptop.id,
    W: s.W,
    priceUSD: isPriceMissingV3(s.laptop) ? null : fxToUSD(s.laptop.price, s.laptop.currency),
  })));
  for (const s of scored) {
    const missing = isPriceMissingV3(s.laptop);
    s.V = missing ? null : (pv.V.get(s.laptop.id) ?? 0.5);
    s.final = finalScore(s.W, s.C, s.V, bestValue);
    s.missedPreferred = missedPreferredFor(s.laptop, requirements);
  }

  // Deterministic total order: Final → K(ε) → price → weight → id.
  scored.sort((a, b) => {
    if (Math.abs(b.final - a.final) > TIE_EPS) return b.final - a.final;
    if (b.K !== a.K) return b.K - a.K;
    const ap = isPriceMissingV3(a.laptop) ? Infinity : a.laptop.price;
    const bp = isPriceMissingV3(b.laptop) ? Infinity : b.laptop.price;
    if (ap !== bp) return ap - bp;
    const aw = a.laptop.weight ?? Infinity;
    const bw = b.laptop.weight ?? Infinity;
    if (aw !== bw) return aw - bw;
    return a.laptop.id < b.laptop.id ? -1 : a.laptop.id > b.laptop.id ? 1 : 0;
  });

  // Diversity: max 2 per brand+model family (ledgered via notes).
  const seen = new Map<string, number>();
  const diversified = scored.filter((s) => {
    const k = `${s.laptop.brand} ${s.laptop.model}`.toLowerCase();
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n <= 2;
  });

  // Price-missing lane: priced first; missing appended last (max 3, never top-3 above priced).
  const priced = diversified.filter((s) => !isPriceMissingV3(s.laptop));
  const missingLane = diversified.filter((s) => isPriceMissingV3(s.laptop)).slice(0, 3);
  const ordered = [...priced, ...missingLane].slice(0, 12);

  // whyAbove from actual per-dim cap deltas (Δ>0.02 listed, else suppressed).
  const items: RankedItemDTO[] = ordered.map((s, i) => {
    const nxt = ordered[i + 1];
    let whyAbove: RankedItemDTO["whyAbove"] = null;
    if (nxt) {
      const deltas = DIMS_V3.map((d) => ({
        dim: d,
        delta: (s.caps[d] ?? 0) - (nxt.caps[d] ?? 0),
      })).filter((x) => Math.abs(x.delta) > 0.02)
        .sort((a, b) => b.delta - a.delta);
      whyAbove = {
        vsId: nxt.laptop.id,
        won: deltas.filter((d) => d.delta > 0).slice(0, 2),
        lost: deltas.filter((d) => d.delta < 0).slice(-2).reverse(),
      };
    }
    const contribs = DIMS_V3.filter((d) => s.caps[d] != null)
      .map((d) => ({ d, c: (s.weights[d] ?? 0) * s.caps[d]! }))
      .sort((x, y) => y.c - x.c);
    const strengths = [...DIMS_V3].filter((d) => s.caps[d] != null)
      .sort((a, b) => s.caps[b]! - s.caps[a]!)
      .slice(0, 3)
      .map((d) => ({ dim: d, evidence: evidenceFor(d, s.laptop) }));
    const compromises = contribs.slice(-2).map((x) => x.d);
    const l = s.laptop;
    return {
      laptopId: l.id,
      brand: l.brand,
      model: l.model,
      variant: l.variant,
      price: isPriceMissingV3(l) ? null : l.price,
      currency: l.currency,
      priceStale: l.priceStale ?? false,
      priceMissing: isPriceMissingV3(l),
      scores: { overall: Math.round(s.final * 100), W: round3(s.W), C: round3(s.C), V: s.V == null ? null : round3(s.V) },
      confidence: tierFor(s.K),
      confidenceFactors: s.factors,
      dataCompleteness: round3(s.completeness),
      strengths,
      compromises,
      missedPreferred: s.missedPreferred,
      whyAbove,
      capabilities: s.caps,
      specs: {
        ramGB: l.ramAmount, storageGB: l.storageAmount, os: l.os,
        cpu: `${l.cpuCores ?? "?"}-core ${l.cpuFamily}`, gpu: l.gpuType,
        vramGB: l.gpuVRAM, weightKg: l.weight, batteryH: l.batteryLife,
        refreshHz: l.displayRefreshRate, display: l.displayResolution ?? l.displayPanelType,
      },
    };
  });

  return {
    schemaVersion: "v3",
    scoringVersion: SCORING_VERSION_V3,
    weightsVersion: WEIGHTS_VERSION_V3,
    region: profile.region,
    currency: profile.currency,
    relaxed,
    exhausted,
    awaitingUser,
    relaxationLedger: ledger,
    items,
    contradictions,
    notes,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Type-A preferred-target gaps (W-path misses) + Type-B shortfalls for explanation. */
function missedPreferredFor(
  l: ScorableLaptop,
  requirements: Requirement[],
): Array<{ id: string; required: string; actual: string }> {
  const out: Array<{ id: string; required: string; actual: string }> = [];
  for (const r of requirements) {
    if (r.kind !== "target" || r.targetClass === "B") continue;
    if (r.id === "battery" && typeof r.target === "number" && (l.batteryLife == null || l.batteryLife < r.target)) {
      out.push({ id: "battery", required: `≥${r.target}h preferred`, actual: l.batteryLife == null ? "unlisted" : `${l.batteryLife}h` });
    }
    if (r.id === "weight" && typeof r.max === "number" && (l.weight == null || l.weight > r.max)) {
      out.push({ id: "weight", required: `≤${r.max}kg preferred`, actual: l.weight == null ? "unlisted" : `${l.weight}kg` });
    }
    if (r.id === "refresh" && typeof r.target === "number" && l.displayRefreshRate < r.target) {
      out.push({ id: "refresh", required: `≥${r.target}Hz preferred`, actual: `${l.displayRefreshRate}Hz` });
    }
    if (r.id === "vram" && typeof r.target === "number" && (l.gpuVRAM ?? -1) < r.target) {
      out.push({ id: "vram", required: `≥${r.target}GB preferred`, actual: l.gpuVRAM == null ? "unlisted" : `${l.gpuVRAM}GB` });
    }
    if (r.id === "ram" && typeof r.target === "number" && l.ramAmount < r.target) {
      out.push({ id: "ram", required: `≥${r.target}GB preferred`, actual: `${l.ramAmount}GB` });
    }
    if (r.id === "storage" && typeof r.target === "number" && l.storageAmount < r.target) {
      out.push({ id: "storage", required: `≥${r.target}GB preferred`, actual: `${l.storageAmount}GB` });
    }
  }
  return out;
}

/** True when remaining emptiness is caused by an intent-hard (os/refurb/budget-min). */
function intentHardBlocks(
  requirements: Requirement[],
  active: ScorableLaptop[],
  hard: HardStateV3,
): boolean {
  void active;
  void hard;
  return requirements.some(
    (r) => r.kind === "hard" && (r.id === "os" || r.id === "refurb" || r.id === "budget" && typeof r.min === "number"),
  );
}

function emptyDTO(profile: CanonicalProfile, contradictions: string[], notes: string[]): RecommendationDTO {
  return {
    schemaVersion: "v3", scoringVersion: SCORING_VERSION_V3, weightsVersion: WEIGHTS_VERSION_V3,
    region: profile.region, currency: profile.currency,
    relaxed: false, exhausted: true, awaitingUser: false,
    relaxationLedger: [], items: [], contradictions, notes,
  };
}
