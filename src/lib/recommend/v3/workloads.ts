/**
 * v3.1 workload vectors — authoritative 4-decimal constants (locked spec §B).
 * Rows sum to exactly 1.0000 over the 9 scored dims.
 * Values are priors v3.1 (unevaluated). Tune only via golden-diff + eval note.
 */
import type { DimV3, WorkloadId, WorkloadImportance } from "./types";
import type { DevSubprofile, GamingSubprofile } from "./types";

export type WorkloadKey =
  | "dev-standard"
  | "dev-heavy"
  | "gaming-esports"
  | "gaming-aaa"
  | "gaming-both"
  | "ai-ml"
  | "video-photo"
  | "cad-3d"
  | "study-office";

export const WORKLOAD_VECTORS_V31: Record<WorkloadKey, Record<DimV3, number>> = {
  "dev-standard": { cpu: 0.2247, gpu: 0.0562, vram: 0.0225, ram: 0.2472, storage: 0.1348, display: 0.0674, battery: 0.1124, portability: 0.0899, build: 0.0449 },
  "dev-heavy": { cpu: 0.2526, gpu: 0.0526, vram: 0.0211, ram: 0.2947, storage: 0.1474, display: 0.0526, battery: 0.0737, portability: 0.0632, build: 0.0421 },
  "gaming-esports": { cpu: 0.2063, gpu: 0.268, vram: 0.0825, ram: 0.1443, storage: 0.0825, display: 0.1237, battery: 0.0309, portability: 0.0309, build: 0.0309 },
  "gaming-aaa": { cpu: 0.15, gpu: 0.3, vram: 0.14, ram: 0.14, storage: 0.1, display: 0.1, battery: 0.03, portability: 0.02, build: 0.02 },
  "gaming-both": { cpu: 0.1718, gpu: 0.2929, vram: 0.1212, ram: 0.1414, storage: 0.0909, display: 0.1111, battery: 0.0303, portability: 0.0202, build: 0.0202 },
  "ai-ml": { cpu: 0.1783, gpu: 0.2772, vram: 0.2178, ram: 0.1584, storage: 0.0792, display: 0.0198, battery: 0.0198, portability: 0.0198, build: 0.0297 },
  "video-photo": { cpu: 0.2021, gpu: 0.1616, vram: 0.0606, ram: 0.1818, storage: 0.1414, display: 0.1616, battery: 0.0404, portability: 0.0303, build: 0.0202 },
  "cad-3d": { cpu: 0.1819, gpu: 0.2424, vram: 0.1212, ram: 0.1616, storage: 0.101, display: 0.101, battery: 0.0303, portability: 0.0303, build: 0.0303 },
  "study-office": { cpu: 0.1429, gpu: 0.0238, vram: 0.0119, ram: 0.1429, storage: 0.0952, display: 0.0952, battery: 0.2381, portability: 0.2024, build: 0.0476 },
};

/** Importance → influence (product rule, locked). */
export const INFLUENCE: Record<WorkloadImportance, number> = {
  primary: 1.0,
  secondary: 0.6,
  occasional: 0.25,
};

export function workloadKeyFor(
  id: WorkloadId,
  sub: DevSubprofile | GamingSubprofile | null,
): WorkloadKey {
  if (id === "dev") return sub === "heavy" ? "dev-heavy" : "dev-standard";
  if (id === "gaming") {
    if (sub === "esports") return "gaming-esports";
    if (sub === "aaa") return "gaming-aaa";
    return "gaming-both";
  }
  return id;
}

export interface BlendInput {
  id: WorkloadId;
  importance: WorkloadImportance;
  subprofile: DevSubprofile | GamingSubprofile | null;
}

/**
 * Blend workload vectors (locked §G):
 *   w_d = Σ inf_i · w_d(i) / Σ inf_i, renormalized by construction.
 * Duplicate workload IDs are deduped (keep highest influence entry).
 * All-occasional input is promoted to secondary (caller logs the promotion).
 */
export function blendWorkloadWeights(inputs: BlendInput[]): Record<DimV3, number> {
  const deduped = new Map<WorkloadKey, { w: Record<DimV3, number>; inf: number }>();
  for (const inp of inputs) {
    const key = workloadKeyFor(inp.id, inp.subprofile);
    const inf = INFLUENCE[inp.importance];
    const prev = deduped.get(key);
    if (!prev || inf > prev.inf) deduped.set(key, { w: WORKLOAD_VECTORS_V31[key], inf });
  }
  const entries = [...deduped.values()];
  const totalInf = entries.reduce((s, e) => s + e.inf, 0) || 1;
  const out = {} as Record<DimV3, number>;
  const dims = Object.keys(WORKLOAD_VECTORS_V31["dev-standard"]) as DimV3[];
  for (const d of dims) {
    out[d] = entries.reduce((s, e) => s + e.inf * e.w[d], 0) / totalInf;
  }
  // Exact renormalization (guards float drift).
  const sum = dims.reduce((s, d) => s + out[d], 0) || 1;
  for (const d of dims) out[d] /= sum;
  return out;
}

/** Q3 pick → W increment map (locked §4). Best-value is NOT a W shift. */
export const PRIORITY_INCREMENT: Record<string, Partial<Record<DimV3, number>>> = {
  speed: { cpu: 0.025, gpu: 0.025 },
  battery: { battery: 0.05 },
  carry: { portability: 0.05 },
  screen: { display: 0.05 },
  build: { build: 0.05 },
};

/** Additive + renormalize priority adjustment. Never negative, sums exactly 1. */
export function applyPriorities(
  base: Record<DimV3, number>,
  picks: string[],
): Record<DimV3, number> {
  const w1 = { ...base };
  for (const p of picks.slice(0, 2)) {
    const inc = PRIORITY_INCREMENT[p];
    if (!inc) continue; // "value" and unknown picks: no W shift
    for (const d of Object.keys(inc) as DimV3[]) w1[d] += inc[d] ?? 0;
  }
  const dims = Object.keys(w1) as DimV3[];
  const s = dims.reduce((x, d) => x + w1[d], 0) || 1;
  for (const d of dims) w1[d] /= s;
  return w1;
}
