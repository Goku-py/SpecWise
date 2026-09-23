/**
 * v3 quiz builders — Quick (Q1–Q4) and Advanced (conditional refinement).
 * Both mutate the SAME CanonicalProfile. No second scoring path.
 * RAM/storage default to Prefer; "Only show…" escalates to Must.
 */
import type {
  CanonicalProfile, Q3Pick, Requirement, WorkloadId, WorkloadImportance,
} from "./types";
import type { DevSubprofile, GamingSubprofile } from "./types";

export interface QuickAnswers {
  workloads: Array<{ id: WorkloadId; importance?: WorkloadImportance; subprofile?: DevSubprofile | GamingSubprofile | null }>;
  gamingSubtype?: GamingSubprofile | null;
  devHeavy?: boolean | null;
  region: string;
  currency: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  noMax?: boolean;
  priorities?: Q3Pick[];
  ramGB?: number | null;
  ramMust?: boolean;
  storageGB?: number | null;
  storageMust?: boolean;
  osMust?: string | null;
  osPrefer?: string | null;
  gpuMust?: boolean;
  gpuPrefer?: boolean;
  weightMaxKg?: number | null;
  weightMust?: boolean;
}

/** Conditional matrix: which Advanced sections apply per workload. */
export const ADVANCED_MATRIX: Record<WorkloadId, string[]> = {
  dev: ["cpu", "ram", "storage", "thermals", "ports", "upgrade"],
  gaming: ["gpu", "vram", "refresh", "resolution", "thermals"],
  "ai-ml": ["gpu", "vram", "ram", "storage"],
  "video-photo": ["display", "ram", "storage", "ports"],
  "cad-3d": ["gpu", "vram", "display-size", "ram", "ports"],
  "study-office": ["battery", "weight", "display-size"],
};

export function advancedSectionsFor(workloads: WorkloadId[]): string[] {
  const s = new Set<string>();
  for (const w of workloads) for (const sec of ADVANCED_MATRIX[w] ?? []) s.add(sec);
  return [...s];
}

export function quickToProfile(q: QuickAnswers): CanonicalProfile {
  const workloads = q.workloads.map((w, i) => {
    let sub: DevSubprofile | GamingSubprofile | null = w.subprofile ?? null;
    if (w.id === "gaming" && !sub) sub = q.gamingSubtype ?? "both";
    if (w.id === "dev" && !sub) sub = q.devHeavy ? "heavy" : "standard";
    return {
      id: w.id,
      importance: w.importance ?? (q.workloads.length > 1 ? (i === 0 ? "primary" : "secondary") : "primary"),
      subprofile: sub,
    };
  });
  const requirements: Requirement[] = [];
  const R = (r: Requirement) => requirements.push(r);

  // Budget hard (min and/or max; noMax ⇒ max=null).
  if ((q.budgetMin != null || (q.budgetMax != null && !q.noMax))) {
    R({ id: "budget", kind: "hard", importance: 2, min: q.budgetMin ?? null, max: q.noMax ? null : (q.budgetMax ?? null), provenance: { source: "quick", reason: "User budget" }, userMust: true });
  } else if (q.budgetMax != null && !q.noMax) {
    R({ id: "budget", kind: "hard", importance: 2, min: null, max: q.budgetMax, provenance: { source: "quick", reason: "User budget max" }, userMust: true });
  }

  // RAM/storage — default Prefer (Type-A target), Must on escalation.
  if (q.ramGB != null) {
    R(q.ramMust
      ? { id: "ram", kind: "hard", importance: 2, min: q.ramGB, target: q.ramGB, provenance: { source: "quick", reason: `RAM must-have ≥${q.ramGB}GB` }, userMust: true }
      : { id: "ram", kind: "target", targetClass: "A", importance: 2, target: q.ramGB, provenance: { source: "quick", reason: `RAM preferred ≥${q.ramGB}GB` }, userMust: false });
  }
  if (q.storageGB != null) {
    R(q.storageMust
      ? { id: "storage", kind: "hard", importance: 2, min: q.storageGB, target: q.storageGB, provenance: { source: "quick", reason: `Storage must-have ≥${q.storageGB}GB` }, userMust: true }
      : { id: "storage", kind: "target", targetClass: "A", importance: 2, target: q.storageGB, provenance: { source: "quick", reason: `Storage preferred ≥${q.storageGB}GB` }, userMust: false });
  }
  if (q.osMust) {
    R({ id: "os", kind: "hard", importance: 2, min: q.osMust, provenance: { source: "quick", reason: `OS must be ${q.osMust}` }, userMust: true });
  } else if (q.osPrefer) {
    R({ id: "os-prefer", kind: "target", targetClass: "B", importance: 2, target: q.osPrefer, provenance: { source: "quick", reason: `OS preferred ${q.osPrefer}` }, userMust: false });
  }
  const gpuWorkload = workloads.some((w) => w.id === "gaming" || w.id === "ai-ml" || w.id === "cad-3d" || w.id === "video-photo");
  if (gpuWorkload && q.gpuMust) {
    R({ id: "gpu", kind: "hard", importance: 2, target: "dedicated", provenance: { source: "quick", reason: "Dedicated GPU must-have" }, userMust: true });
  } else if (gpuWorkload && q.gpuPrefer) {
    R({ id: "gpu", kind: "target", importance: 2, target: "dedicated", provenance: { source: "quick", reason: "Dedicated GPU preferred" }, userMust: false });
  }
  if (q.weightMaxKg != null) {
    R(q.weightMust
      ? { id: "weight", kind: "hard", importance: 2, max: q.weightMaxKg, provenance: { source: "quick", reason: `Weight must be ≤${q.weightMaxKg}kg` }, userMust: true }
      : { id: "weight", kind: "target", targetClass: "A", importance: 2, max: q.weightMaxKg, provenance: { source: "quick", reason: `Weight preferred ≤${q.weightMaxKg}kg` }, userMust: false });
  }

  return {
    schemaVersion: "v3",
    region: q.region,
    currency: q.currency,
    workloads,
    budget: { min: q.budgetMin ?? null, max: q.noMax ? null : (q.budgetMax ?? null), noMax: q.noMax ?? false, currency: q.currency },
    priorities: (q.priorities ?? []).slice(0, 2),
    requirements,
  };
}
