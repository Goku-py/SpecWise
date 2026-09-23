/**
 * v3 canonical types — single authoritative representation (locked spec §A).
 * Client and server share this file. Nothing here is UI-specific.
 * All tunable numbers live in workloads.ts / capabilities.ts / scoring.ts, never here.
 */

export const SCHEMA_VERSION_V3 = "v3" as const;
export const SCORING_VERSION_V3 = "v3.1" as const;
export const WEIGHTS_VERSION_V3 = "v3.1" as const;

/** User-facing workload IDs. No additional categories allowed. */
export const WORKLOAD_IDS = [
  "dev",
  "gaming",
  "ai-ml",
  "video-photo",
  "cad-3d",
  "study-office",
] as const;
export type WorkloadId = (typeof WORKLOAD_IDS)[number];

export type DevSubprofile = "standard" | "heavy";
export type GamingSubprofile = "esports" | "aaa" | "both";
export type WorkloadImportance = "primary" | "secondary" | "occasional";

export interface WorkloadSelection {
  id: WorkloadId;
  importance: WorkloadImportance;
  /** dev → standard|heavy (default standard). gaming → esports|aaa|both (default both). Others: null. */
  subprofile: DevSubprofile | GamingSubprofile | null;
}

export type Q3Pick =
  | "speed"
  | "battery"
  | "carry"
  | "screen"
  | "build"
  | "value";

export interface CanonicalProfile {
  schemaVersion: typeof SCHEMA_VERSION_V3;
  region: string;
  currency: string;
  workloads: WorkloadSelection[];
  budget: {
    min: number | null; // major units, profile currency
    max: number | null;
    noMax: boolean;
    currency: string;
  };
  /** Q3 picks, 0–2 entries. Empty = skipped (all Medium). */
  priorities: Q3Pick[];
  requirements: Requirement[];
}

export type RequirementKind = "hard" | "target";
/** Type-A = capability-mapped (scored in W only). Type-B = non-capability (scored in C only). */
export type TargetClass = "A" | "B";

export interface RequirementProvenance {
  source: "workload" | "quick" | "advanced";
  workloadId?: WorkloadId;
  reason: string;
}

export interface Requirement {
  id:
    | "budget"
    | "os"
    | "ram"
    | "storage"
    | "gpu"
    | "vram"
    | "weight"
    | "battery"
    | "refresh"
    | "displaySize"
    | "ports"
    | "upgrade"
    | "refurb"
    | "cpu-cores"
    | "os-prefer"
    | "brand-prefer"
    | "upgrade-prefer"
    | "touch-prefer"
    | "resolution-prefer"
    | "color-prefer"
    | "oled-prefer";
  kind: RequirementKind;
  targetClass?: TargetClass; // set for kind=target
  min?: number | string | null;
  target?: number | string | boolean | null;
  max?: number | string | null;
  /** 1|2|3 — targets only. Hards ignore (elimination is binary). */
  importance: 1 | 2 | 3;
  provenance: RequirementProvenance;
  /** True when the user explicitly escalated Quick Prefer → Must. */
  userMust: boolean;
}

/** 9 scored dims. Thermals is a modifier, value lives in V. */
export const DIMS_V3 = [
  "cpu",
  "gpu",
  "vram",
  "ram",
  "storage",
  "display",
  "battery",
  "portability",
  "build",
] as const;
export type DimV3 = (typeof DIMS_V3)[number];

export type ConfidenceTier = "high" | "medium" | "limited";

export interface RelaxEntry {
  requirement: string;
  from: string;
  to: string;
  reason: string;
}

export interface RankedItemDTO {
  laptopId: string;
  brand: string;
  model: string;
  variant: string | null;
  price: number | null;
  currency: string;
  priceStale: boolean;
  priceMissing: boolean;
  scores: { overall: number; W: number; C: number; V: number | null };
  confidence: ConfidenceTier;
  confidenceFactors: string[];
  dataCompleteness: number;
  strengths: Array<{ dim: string; evidence: string }>;
  compromises: string[];
  missedPreferred: Array<{ id: string; required: string; actual: string }>;
  whyAbove: {
    vsId: string | null;
    won: Array<{ dim: string; delta: number }>;
    lost: Array<{ dim: string; delta: number }>;
  } | null;
  capabilities: Record<string, number | null>;
  specs: Record<string, number | string | boolean | null>;
}

export interface RecommendationDTO {
  schemaVersion: typeof SCHEMA_VERSION_V3;
  scoringVersion: string;
  weightsVersion: string;
  region: string;
  currency: string;
  relaxed: boolean;
  exhausted: boolean;
  awaitingUser: boolean;
  relaxationLedger: RelaxEntry[];
  items: RankedItemDTO[];
  contradictions: string[];
  notes: string[];
}
