/**
 * Phase 3 — presentation-only interpretation layer.
 * CanonicalProfile → RequirementInterpretation for the pre-match review screen.
 * Pure + deterministic. Never touches engine semantics, ranking, or POST shape.
 *
 * Client-safe imports ONLY (verified): ./types (types), ./requirements →
 * ./workloads (pure consts + math, no server deps), ../../regions (no imports).
 * - buildRequirements contradiction predicates mirrored via direct call
 *   (requirements.ts:108-111 demotion; :116-128 macOS verbatim).
 * - intentHardBlocks mirrored inline (engine.ts:367-378).
 * - RELAX_OPS order mirrored (engine.ts:101-143).
 * - Inert-drop rule: gpu-target and displaySize-target are fully inert —
 *   no hard reader (hardStateFrom reads kind=hard only), no targetFit reader
 *   (scoring.ts:83-107 reads targetClass==="B" only; both ids fall to the
 *   inert default), no missedPreferred reader (engine.ts:344-363 covers only
 *   battery/weight/refresh/vram/ram/storage) — so they are dropped silently.
 */
import type { CanonicalProfile, Requirement, WorkloadId } from "./types";
import { buildRequirements } from "./requirements";
import { REGIONS } from "../../regions";

export interface WorkloadSummary {
  id: WorkloadId;
  label: string;
  importance: "Primary" | "Secondary" | "Occasional";
  subprofileLabel: string | null;
}

export interface MustHave {
  id: Requirement["id"];
  text: string;
}

export interface Preference {
  id: Requirement["id"];
  text: string;
  honestNote: string;
}

export interface FixedConstraint {
  id: Requirement["id"];
  text: string;
}

export interface RelaxableConstraint {
  id: Requirement["id"];
  text: string;
  order: number;
}

export interface RequirementInterpretation {
  region: string;
  currency: string;
  budget: { min: number | null; max: number | null; noMax: boolean };
  workloads: WorkloadSummary[];
  mustHaves: MustHave[];
  preferences: Preference[];
  fixedConstraints: FixedConstraint[];
  relaxableConstraints: RelaxableConstraint[];
  contradictions: string[];
  occasionalNote: string | null;
}

// User-facing workload names — mirrors WORKLOAD_CARDS (V3Quiz.tsx:23-30).
const WORKLOAD_LABELS: Record<WorkloadId, string> = {
  dev: "Coding & software",
  gaming: "Gaming",
  "ai-ml": "AI & machine learning",
  "video-photo": "Video & photo editing",
  "cad-3d": "3D & design work",
  "study-office": "Study, work & everyday use",
};

const IMPORTANCE_LABELS = {
  primary: "Primary",
  secondary: "Secondary",
  occasional: "Occasional",
} as const;

function subprofileLabelFor(w: CanonicalProfile["workloads"][number]): string | null {
  if (w.id === "gaming") {
    if (w.subprofile === "esports") return "Competitive & fast";
    if (w.subprofile === "aaa") return "Story & visuals";
    return "A mix of both";
  }
  if (w.id === "dev") {
    return w.subprofile === "heavy" ? "Heavy — VMs, containers, large builds" : "Standard";
  }
  return null;
}

export function capitalizeOs(v: string): string {
  const l = v.toLowerCase();
  if (l === "macos") return "macOS";
  if (l === "windows") return "Windows";
  if (l === "linux") return "Linux";
  if (l === "chromeos") return "ChromeOS";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export function formatStorage(gb: number): string {
  if (gb >= 1024 && gb % 1024 === 0) return `${gb / 1024} TB`;
  return `${gb} GB`;
}

const BUDGET_LOCALES: Record<string, string> = {
  USD: "en-US",
  INR: "en-IN",
  GBP: "en-GB",
  EUR: "de-DE",
  CAD: "en-CA",
  AUD: "en-AU",
};

export function formatBudgetRange(
  min: number | null,
  max: number | null,
  noMax: boolean,
  currency: string,
): string | null {
  const hi = noMax ? null : max;
  if (min == null && hi == null) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat(BUDGET_LOCALES[currency] ?? "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min != null && hi != null) return `${fmt(min)}–${fmt(hi)}`;
  if (min != null) return `${fmt(min)} or more`;
  return `Up to ${fmt(hi!)}`;
}

/** Numeric value carried by a requirement (target wins, then min, then max). */
function numVal(r: Requirement): number | null {
  if (typeof r.target === "number") return r.target;
  if (typeof r.min === "number") return r.min;
  if (typeof r.max === "number") return r.max;
  return null;
}

/** Plain-language line for a hard or (non-inert) target requirement. */
function humanText(r: Requirement, currency: string): string | null {
  switch (r.id) {
    case "budget": {
      const t = formatBudgetRange(
        typeof r.min === "number" ? r.min : null,
        typeof r.max === "number" ? r.max : null,
        r.max == null,
        currency,
      );
      return t;
    }
    case "os":
      return typeof r.min === "string" ? capitalizeOs(r.min) : null;
    case "os-prefer":
      return typeof r.target === "string" ? capitalizeOs(r.target) : null;
    case "ram": {
      const v = numVal(r);
      return v == null ? null : `${v} GB RAM or more`;
    }
    case "storage": {
      const v = numVal(r);
      return v == null ? null : `${formatStorage(v)} storage or more`;
    }
    case "gpu":
      return "Dedicated graphics";
    case "vram": {
      const v = numVal(r);
      return v == null ? null : `${v} GB or more graphics memory`;
    }
    case "weight":
      return typeof r.max === "number" ? `No heavier than ${r.max} kg` : null;
    case "battery": {
      const v = numVal(r);
      return v == null ? null : `${v} hours or more battery`;
    }
    case "refresh": {
      const v = numVal(r);
      return v == null ? null : `${v} Hz or faster display`;
    }
    case "displaySize": {
      const v = numVal(r);
      return v == null ? null : `${v}" screen or larger`;
    }
    case "ports":
      return typeof r.target === "string"
        ? `Ports: ${r.target.split("+").filter(Boolean).map((p) => p.toUpperCase()).join(", ")}`
        : null;
    case "upgrade":
    case "upgrade-prefer": {
      if (typeof r.target !== "string") return null;
      const parts: string[] = [];
      if (r.target.includes("ram")) parts.push("RAM upgradable");
      if (r.target.includes("storage")) parts.push("Storage expandable");
      return parts.length > 0 ? parts.join(" / ") : null;
    }
    case "refurb":
      return "New laptops only";
    case "cpu-cores": {
      const v = numVal(r);
      return v == null ? null : `${v} or more CPU cores`;
    }
    case "brand-prefer":
      return typeof r.target === "string"
        ? `${r.target.charAt(0).toUpperCase()}${r.target.slice(1)}`
        : null;
    case "touch-prefer":
      return "Touchscreen";
    case "resolution-prefer":
      return typeof r.target === "string" && r.target ? `${r.target} display` : "Sharper display";
    case "color-prefer":
      return "Color-accurate display";
    case "oled-prefer":
      return "OLED display";
    default:
      return null;
  }
}

// The six Type-A prefers surfaced via missedPreferredFor explanation flags
// (engine.ts:344-363) — flag language only, never boost language.
const FLAG_IDS: ReadonlySet<string> = new Set([
  "ram",
  "storage",
  "weight",
  "vram",
  "refresh",
  "battery",
]);

function honestNoteFor(r: Requirement): string {
  if (r.id === "os-prefer" && typeof r.target === "string") {
    // os-prefer is the only user-authored Prefer with a genuine ranking
    // effect (scoring.ts:83-107).
    return `Laptops with ${capitalizeOs(r.target)} rank higher.`;
  }
  if (FLAG_IDS.has(r.id)) return "We'll flag picks that fall short.";
  return "We'll keep this in mind when comparing picks.";
}

// RELAX_OPS id order (engine.ts:101-143); "cores" op relaxes the cpu-cores req.
const RELAX_ORDER: Array<Requirement["id"]> = [
  "budget",
  "storage",
  "ram",
  "gpu",
  "vram",
  "refresh",
  "displaySize",
  "ports",
  "weight",
  "battery",
  "cpu-cores",
  "upgrade",
];

// Verified against RELAX_OPS reasons (engine.ts:101-143).
const RELAX_TEXT: Record<string, string> = {
  budget: "Budget may be widened in steps if needed (first +10%, then up to +25% total).",
  storage: "Lowered one step if needed.",
  ram: "Lowered one step if needed.",
  gpu: "Dedicated graphics treated as a preference.",
  vram: "Dropped if needed.",
  refresh: "Dropped if needed.",
  displaySize: "Dropped if needed.",
  ports: "Loosened one port at a time.",
  weight: "Dropped if needed.",
  battery: "Dropped if needed.",
  "cpu-cores": "Dropped if needed.",
  upgrade: "Treated as a preference.",
};

/** Mirrors intentHardBlocks (engine.ts:367-378). */
function isFixedHard(r: Requirement): boolean {
  return (
    r.kind === "hard" &&
    (r.id === "os" ||
      r.id === "refurb" ||
      (r.id === "budget" && typeof r.min === "number"))
  );
}

export function interpretProfile(profile: CanonicalProfile): RequirementInterpretation {
  const region = REGIONS.find((r) => r.code === profile.region)?.label ?? profile.region;

  const workloads: WorkloadSummary[] = profile.workloads.map((w) => ({
    id: w.id,
    label: WORKLOAD_LABELS[w.id],
    importance: IMPORTANCE_LABELS[w.importance],
    subprofileLabel: subprofileLabelFor(w),
  }));

  const mustHaves: MustHave[] = [];
  const preferences: Preference[] = [];
  const userHards: Requirement[] = [];

  for (const r of profile.requirements) {
    if (r.kind === "hard" && r.provenance.source === "workload") {
      // requirements.ts:108-111 — workload-sourced hards never harden;
      // demoted to target. gpu/displaySize targets are fully inert (see
      // header comment), so they are dropped silently here too.
      if (r.id === "gpu" || r.id === "displaySize") continue;
      const text = humanText(r, profile.currency);
      if (text == null) continue;
      preferences.push({ id: r.id, text, honestNote: honestNoteFor(r) });
      continue;
    }
    if (r.kind === "hard") {
      const text = humanText(r, profile.currency);
      if (text == null) continue;
      mustHaves.push({ id: r.id, text });
      userHards.push(r);
      continue;
    }
    // Targets: gpu-target and displaySize-target are fully inert — drop
    // silently (no hard/targetFit/missedPreferred reader; see header).
    if (r.id === "gpu" || r.id === "displaySize") continue;
    const text = humanText(r, profile.currency);
    if (text == null) continue;
    preferences.push({ id: r.id, text, honestNote: honestNoteFor(r) });
  }

  const fixedConstraints: FixedConstraint[] = [];
  const relaxableConstraints: RelaxableConstraint[] = [];
  for (const r of userHards) {
    const text = humanText(r, profile.currency);
    if (text == null) continue;
    if (isFixedHard(r)) {
      fixedConstraints.push({ id: r.id, text });
    } else {
      const order = RELAX_ORDER.indexOf(r.id);
      relaxableConstraints.push({
        id: r.id,
        text: RELAX_TEXT[r.id] ? `${text} — ${RELAX_TEXT[r.id]}` : text,
        order: order === -1 ? RELAX_ORDER.length : order,
      });
    }
  }
  relaxableConstraints.sort((a, b) => a.order - b.order);

  // Friendly-mapped buildRequirements contradictions. The macOS string is
  // already plain so it passes through verbatim (requirements.ts:116-128);
  // demotions become a plain preference sentence (:108-111). Internal
  // proposal-override notes are intentionally skipped (mechanics, not UX).
  const contradictions = buildRequirements(profile).contradictions.map((c) => {
    const m = c.match(/^Workload-sourced hard requirement for (\S+) demoted/);
    if (m) return `${m[1]} from your workload is treated as a preference, not a strict filter.`;
    return c;
  });

  const allOccasional =
    profile.workloads.length > 0 &&
    profile.workloads.every((w) => w.importance === "occasional");
  const occasionalNote = allOccasional
    ? "Everything is marked Occasional, so your workloads are balanced evenly."
    : null;

  return {
    region,
    currency: profile.currency,
    budget: {
      min: profile.budget.min,
      max: profile.budget.noMax ? null : profile.budget.max,
      noMax: profile.budget.noMax,
    },
    workloads,
    mustHaves,
    preferences,
    fixedConstraints,
    relaxableConstraints,
    contradictions,
    occasionalNote,
  };
}
