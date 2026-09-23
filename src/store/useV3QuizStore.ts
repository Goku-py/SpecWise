/**
 * v3 quiz store (Zustand). Holds the CanonicalProfile v3 directly — the single
 * representation. No legacy answer schema lives here. Quick and Advanced both
 * mutate the same profile object; the server engine is the only scorer.
 */
"use client";

import { create } from "zustand";
import type {
  CanonicalProfile,
  Q3Pick,
  Requirement,
  WorkloadId,
  WorkloadImportance,
} from "@/lib/recommend/v3/types";
import type { DevSubprofile, GamingSubprofile } from "@/lib/recommend/v3/types";
import { getRegion } from "@/lib/regions";

function emptyProfile(regionCode = "US"): CanonicalProfile {
  const region = getRegion(regionCode);
  return {
    schemaVersion: "v3",
    region: region.code,
    currency: region.currency,
    workloads: [],
    budget: { min: null, max: null, noMax: false, currency: region.currency },
    priorities: [],
    requirements: [],
  };
}

/** Remove all requirements with the given ids, then optionally push replacements. */
function replaceReqs(
  profile: CanonicalProfile,
  ids: Requirement["id"][],
  next: Requirement[],
): Requirement[] {
  return [...profile.requirements.filter((r) => !ids.includes(r.id)), ...next];
}

export const QUICK_STEPS = ["Workload", "Budget", "Priorities", "Must-haves"] as const;

interface V3QuizState {
  profile: CanonicalProfile;
  step: number;
  advancedOpen: boolean;
  submitted: boolean;

  toggleWorkload: (id: WorkloadId) => void;
  setImportance: (id: WorkloadId, importance: WorkloadImportance) => void;
  setGamingSubtype: (sub: GamingSubprofile) => void;
  setDevHeavy: (heavy: boolean) => void;
  setRegion: (code: string) => void;
  setBudget: (min: number | null, max: number | null, noMax: boolean) => void;
  togglePriority: (pick: Q3Pick) => void;
  setRam: (gb: number | null, must: boolean) => void;
  setStorage: (gb: number | null, must: boolean) => void;
  setOs: (mode: "any" | "must" | "prefer", value?: string | null) => void;
  setGpu: (mode: "any" | "must" | "prefer") => void;
  setWeight: (kg: number | null, must: boolean) => void;
  /** Advanced: generic upsert (replaces same id+kind) / removal. */
  upsertRequirement: (req: Requirement) => void;
  removeRequirements: (ids: Requirement["id"][]) => void;
  setPorts: (ports: string[]) => void;
  setRefurbNewOnly: (newOnly: boolean) => void;
  go: (step: number) => void;
  setAdvancedOpen: (open: boolean) => void;
  setSubmitted: (v: boolean) => void;
  /** Replace the whole profile (share-link hydration). Resets navigation. */
  loadProfile: (profile: CanonicalProfile) => void;
  reset: () => void;
}

export const useV3QuizStore = create<V3QuizState>()((set) => ({
  profile: emptyProfile(),
  step: 0,
  advancedOpen: false,
  submitted: false,

  toggleWorkload: (id) =>
    set((s) => {
      const exists = s.profile.workloads.some((w) => w.id === id);
      let workloads = exists
        ? s.profile.workloads.filter((w) => w.id !== id)
        : [
            ...s.profile.workloads,
            {
              id,
              importance: (s.profile.workloads.length === 0 ? "primary" : "secondary") as WorkloadImportance,
              subprofile: (id === "gaming" ? "both" : id === "dev" ? "standard" : null) as
                | DevSubprofile
                | GamingSubprofile
                | null,
            },
          ];
      // First-picked stays primary; single selection ignores importance downstream.
      workloads = workloads.map((w, i) => ({
        ...w,
        importance: i === 0 ? "primary" : w.importance === "primary" ? "secondary" : w.importance,
      }));
      return { profile: { ...s.profile, workloads } };
    }),

  setImportance: (id, importance) =>
    set((s) => ({
      profile: {
        ...s.profile,
        workloads: s.profile.workloads.map((w) => (w.id === id ? { ...w, importance } : w)),
      },
    })),

  setGamingSubtype: (sub) =>
    set((s) => ({
      profile: {
        ...s.profile,
        workloads: s.profile.workloads.map((w) => (w.id === "gaming" ? { ...w, subprofile: sub } : w)),
      },
    })),

  setDevHeavy: (heavy) =>
    set((s) => ({
      profile: {
        ...s.profile,
        workloads: s.profile.workloads.map((w) =>
          w.id === "dev" ? { ...w, subprofile: (heavy ? "heavy" : "standard") as DevSubprofile } : w,
        ),
      },
    })),

  setRegion: (code) =>
    set((s) => {
      const region = getRegion(code);
      return {
        profile: {
          ...s.profile,
          region: region.code,
          currency: region.currency,
          budget: { ...s.profile.budget, currency: region.currency },
        },
      };
    }),

  setBudget: (min, max, noMax) =>
    set((s) => {
      let requirements = s.profile.requirements.filter((r) => r.id !== "budget");
      if (min != null || (max != null && !noMax)) {
        requirements = [
          ...requirements,
          {
            id: "budget",
            kind: "hard",
            importance: 2,
            min,
            max: noMax ? null : max,
            provenance: { source: "quick", reason: "User budget" },
            userMust: true,
          },
        ];
      }
      return {
        profile: {
          ...s.profile,
          budget: { min, max: noMax ? null : max, noMax, currency: s.profile.currency },
          requirements,
        },
      };
    }),

  togglePriority: (pick) =>
    set((s) => {
      const has = s.profile.priorities.includes(pick);
      const priorities = has
        ? s.profile.priorities.filter((p) => p !== pick)
        : [...s.profile.priorities, pick].slice(0, 2);
      return { profile: { ...s.profile, priorities } };
    }),

  setRam: (gb, must) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["ram"],
          gb == null
            ? []
            : must
              ? [{ id: "ram", kind: "hard", importance: 2, min: gb, target: gb, provenance: { source: "quick", reason: `RAM must-have ≥${gb}GB` }, userMust: true }]
              : [{ id: "ram", kind: "target", targetClass: "A", importance: 2, target: gb, provenance: { source: "quick", reason: `RAM preferred ≥${gb}GB` }, userMust: false }],
        ),
      },
    })),

  setStorage: (gb, must) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["storage"],
          gb == null
            ? []
            : must
              ? [{ id: "storage", kind: "hard", importance: 2, min: gb, target: gb, provenance: { source: "quick", reason: `Storage must-have ≥${gb}GB` }, userMust: true }]
              : [{ id: "storage", kind: "target", targetClass: "A", importance: 2, target: gb, provenance: { source: "quick", reason: `Storage preferred ≥${gb}GB` }, userMust: false }],
        ),
      },
    })),

  setOs: (mode, value) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["os", "os-prefer"],
          mode === "any" || !value
            ? []
            : mode === "must"
              ? [{ id: "os", kind: "hard", importance: 2, min: value, provenance: { source: "quick", reason: `OS must be ${value}` }, userMust: true }]
              : [{ id: "os-prefer", kind: "target", targetClass: "B", importance: 2, target: value, provenance: { source: "quick", reason: `OS preferred ${value}` }, userMust: false }],
        ),
      },
    })),

  setGpu: (mode) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["gpu"],
          mode === "any"
            ? []
            : mode === "must"
              ? [{ id: "gpu", kind: "hard", importance: 2, target: "dedicated", provenance: { source: "quick", reason: "Dedicated GPU must-have" }, userMust: true }]
              : [{ id: "gpu", kind: "target", importance: 2, target: "dedicated", provenance: { source: "quick", reason: "Dedicated GPU preferred" }, userMust: false }],
        ),
      },
    })),

  setWeight: (kg, must) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["weight"],
          kg == null
            ? []
            : must
              ? [{ id: "weight", kind: "hard", importance: 2, max: kg, provenance: { source: "quick", reason: `Weight must be ≤${kg}kg` }, userMust: true }]
              : [{ id: "weight", kind: "target", targetClass: "A", importance: 2, max: kg, provenance: { source: "quick", reason: `Weight preferred ≤${kg}kg` }, userMust: false }],
        ),
      },
    })),

  upsertRequirement: (req) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: [
          ...s.profile.requirements.filter((r) => !(r.id === req.id && r.kind === req.kind)),
          req,
        ],
      },
    })),

  removeRequirements: (ids) =>
    set((s) => ({
      profile: { ...s.profile, requirements: s.profile.requirements.filter((r) => !ids.includes(r.id)) },
    })),

  setPorts: (ports) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["ports"],
          ports.length === 0
            ? []
            : [{ id: "ports", kind: "hard", importance: 2, target: ports.join("+"), provenance: { source: "advanced", reason: `Ports required: ${ports.join(", ")}` }, userMust: true }],
        ),
      },
    })),

  setRefurbNewOnly: (newOnly) =>
    set((s) => ({
      profile: {
        ...s.profile,
        requirements: replaceReqs(
          s.profile,
          ["refurb"],
          newOnly
            ? [{ id: "refurb", kind: "hard", importance: 2, target: "new-only", provenance: { source: "advanced", reason: "New laptops only" }, userMust: true }]
            : [],
        ),
      },
    })),

  go: (step) => set({ step }),
  setAdvancedOpen: (open) => set({ advancedOpen: open }),
  setSubmitted: (v) => set({ submitted: v }),
  loadProfile: (profile) => set({ profile, step: 0, advancedOpen: false, submitted: false }),
  reset: () => set({ profile: emptyProfile(), step: 0, advancedOpen: false, submitted: false }),
}));
