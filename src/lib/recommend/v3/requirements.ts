/**
 * v3 Requirement Builder — deterministic order (locked spec §D):
 *   workload targets → user Must replaces floors → user Prefer adds targets
 *   → Occasional targets-only → final Requirement[] with provenance.
 * No hidden path from workload → hard without an explicit user Must.
 */
import type { CanonicalProfile, Requirement, WorkloadId } from "./types";
import { workloadKeyFor } from "./workloads";

/** Workload-proposed floors/targets (all kind=target at this stage — never hard). */
function workloadProposals(
  profile: CanonicalProfile,
): Requirement[] {
  const out: Requirement[] = [];
  const primSec = profile.workloads.filter((w) => w.importance !== "occasional");
  const all = profile.workloads;
  void primSec;
  const has = (id: WorkloadId) => all.some((w) => w.id === id);
  const prov = (id: WorkloadId, reason: string): Requirement["provenance"] => ({
    source: "workload",
    workloadId: id,
    reason,
  });

  for (const w of all) {
    const key = workloadKeyFor(w.id, w.subprofile);
    if (key === "dev-heavy") {
      out.push({ id: "ram", kind: "target", target: 16, importance: 2, provenance: prov("dev", "Heavy dev memory floor (target until Must)"), userMust: false });
      out.push({ id: "storage", kind: "target", target: 512, importance: 2, provenance: prov("dev", "Heavy dev storage floor"), userMust: false });
    } else if (w.id === "dev") {
      out.push({ id: "ram", kind: "target", target: 8, importance: 2, provenance: prov("dev", "Dev memory floor"), userMust: false });
      out.push({ id: "storage", kind: "target", target: 256, importance: 1, provenance: prov("dev", "Dev storage floor"), userMust: false });
    }
    if (w.id === "gaming") {
      const sub = w.subprofile ?? "both";
      if (sub === "esports") {
        out.push({ id: "refresh", kind: "target", target: 144, importance: 3, provenance: prov("gaming", "Esports refresh target"), userMust: false });
      } else if (sub === "aaa") {
        out.push({ id: "vram", kind: "target", target: 8, importance: 3, provenance: prov("gaming", "AAA VRAM headroom"), userMust: false });
        out.push({ id: "refresh", kind: "target", target: 120, importance: 2, provenance: prov("gaming", "AAA refresh target"), userMust: false });
      } else {
        out.push({ id: "refresh", kind: "target", target: 144, importance: 2, provenance: prov("gaming", "Gaming refresh target"), userMust: false });
        out.push({ id: "vram", kind: "target", target: 8, importance: 2, provenance: prov("gaming", "Gaming VRAM target"), userMust: false });
      }
    }
    if (w.id === "ai-ml") {
      out.push({ id: "vram", kind: "target", target: 8, importance: 3, provenance: prov("ai-ml", "AI/ML VRAM headroom"), userMust: false });
      out.push({ id: "gpu", kind: "target", target: "dedicated", importance: 3, provenance: prov("ai-ml", "AI/ML GPU target (hard only via Must)"), userMust: false });
      out.push({ id: "ram", kind: "target", target: 16, importance: 2, provenance: prov("ai-ml", "AI/ML memory target"), userMust: false });
    }
    if (w.id === "video-photo") {
      out.push({ id: "storage", kind: "target", target: 512, importance: 2, provenance: prov("video-photo", "Creator storage target"), userMust: false });
      out.push({ id: "color-prefer", kind: "target", targetClass: "A", target: true, importance: 2, provenance: prov("video-photo", "Color-accuracy target"), userMust: false });
    }
    if (w.id === "cad-3d") {
      out.push({ id: "vram", kind: "target", target: 6, importance: 2, provenance: prov("cad-3d", "CAD viewport VRAM target"), userMust: false });
      out.push({ id: "displaySize", kind: "target", target: 15, importance: 2, provenance: prov("cad-3d", "CAD display-size target"), userMust: false });
    }
    if (w.id === "study-office") {
      out.push({ id: "battery", kind: "target", target: 10, importance: 2, provenance: prov("study-office", "All-day battery target"), userMust: false });
    }
  }
  void has;
  return out;
}

/**
 * Merge user requirements (already materialized in profile.requirements by the
 * quiz builders) over workload proposals:
 * - kind=hard with same id replaces any workload target with that id (user wins both directions).
 * - kind=target adds alongside (nested satisfaction handles same-dim multiples).
 * - Occasional-workload proposals stay targets (enforced by quiz builders never
 *   emitting hards for occasional workloads; re-asserted here by demoting).
 */
export function buildRequirements(profile: CanonicalProfile): {
  requirements: Requirement[];
  contradictions: string[];
  notes: string[];
} {
  const contradictions: string[] = [];
  const notes: string[] = [];
  const occasionalIds = new Set(
    profile.workloads.filter((w) => w.importance === "occasional").map((w) => w.id),
  );
  if (profile.workloads.length > 0 && occasionalIds.size === profile.workloads.length) {
    notes.push("All workloads marked Occasional — treated as Secondary for blending.");
  }
  const proposals = workloadProposals(profile).map((r) => {
    if (r.provenance.workloadId && occasionalIds.has(r.provenance.workloadId)) {
      return { ...r, importance: 1 as const };
    }
    return r;
  });

  const userReqs = profile.requirements;
  const hardIds = new Set(userReqs.filter((r) => r.kind === "hard").map((r) => r.id));
  const merged: Requirement[] = [];
  for (const p of proposals) {
    if (hardIds.has(p.id)) {
      notes.push(
        `Workload ${p.provenance.workloadId} proposes ${String(p.target ?? p.min ?? "")} for ${p.id}; user Must applies instead.`,
      );
      continue;
    }
    merged.push(p);
  }
  for (const u of userReqs) {
    if (u.kind === "hard" && u.provenance.source === "workload") {
      contradictions.push(`Workload-sourced hard requirement for ${u.id} demoted to target (workloads never harden).`);
      merged.push({ ...u, kind: "target" });
      continue;
    }
    merged.push(u);
  }

  // macOS + dedicated-GPU contradiction (surfaced, OS kept).
  const osHard = merged.find((r) => r.id === "os" && r.kind === "hard");
  const gpuHard = merged.find((r) => r.id === "gpu" && r.kind === "hard");
  if (
    osHard &&
    typeof osHard.min === "string" &&
    osHard.min.toLowerCase() === "macos" &&
    gpuHard
  ) {
    contradictions.push(
      "macOS laptops in this catalog use integrated graphics — dedicated-GPU requirement conflicts with macOS; OS kept, GPU treated as preferred.",
    );
  }
  return { requirements: merged, contradictions, notes };
}

/** Hard-state extraction for eligibility (hards only). */
export interface HardStateV3 {
  budgetMin: number | null;
  budgetMax: number | null;
  os: string | null;
  minRam: number | null;
  minStorage: number | null;
  gpuDedicated: boolean;
  minVRAM: number | null;
  maxWeight: number | null;
  minRefresh: number | null;
  minSize: number | null;
  minBattery: number | null;
  ports: string[];
  ramUpgradeRequired: boolean;
  storageUpgradeRequired: boolean;
  newOnly: boolean;
  minCores: number | null;
}

export function hardStateFrom(requirements: Requirement[]): HardStateV3 {
  const h: HardStateV3 = {
    budgetMin: null, budgetMax: null, os: null, minRam: null, minStorage: null,
    gpuDedicated: false, minVRAM: null, maxWeight: null, minRefresh: null,
    minSize: null, minBattery: null, ports: [], ramUpgradeRequired: false,
    storageUpgradeRequired: false, newOnly: false, minCores: null,
  };
  for (const r of requirements) {
    if (r.kind !== "hard") continue;
    switch (r.id) {
      case "budget":
        if (typeof r.min === "number") h.budgetMin = r.min;
        if (typeof r.max === "number") h.budgetMax = r.max;
        break;
      case "os": if (typeof r.min === "string") h.os = r.min; break;
      case "ram": if (typeof r.target === "number") h.minRam = r.target; if (typeof r.min === "number") h.minRam = r.min; break;
      case "storage": if (typeof r.target === "number") h.minStorage = r.target; if (typeof r.min === "number") h.minStorage = r.min; break;
      case "gpu": h.gpuDedicated = true; break;
      case "vram": if (typeof r.target === "number") h.minVRAM = r.target; break;
      case "weight": if (typeof r.max === "number") h.maxWeight = r.max; break;
      case "battery": if (typeof r.target === "number") h.minBattery = r.target; break;
      case "refresh": if (typeof r.target === "number") h.minRefresh = r.target; break;
      case "displaySize": if (typeof r.target === "number") h.minSize = r.target; break;
      case "ports": if (typeof r.target === "string") h.ports = r.target.split("+").filter(Boolean); break;
      case "upgrade":
        if (typeof r.target === "string") {
          if (r.target.includes("ram")) h.ramUpgradeRequired = true;
          if (r.target.includes("storage")) h.storageUpgradeRequired = true;
        }
        break;
      case "refurb": h.newOnly = true; break;
      case "cpu-cores": if (typeof r.target === "number") h.minCores = r.target; break;
    }
  }
  return h;
}
