/**
 * Phase 3 interpretation tests. Pure profile → interpretation assertions —
 * no DB, no API. Mirrors tests/v3 style.
 */
import { describe, expect, it } from "vitest";
import type { CanonicalProfile, Requirement } from "@/lib/recommend/v3/types";
import { interpretProfile } from "@/lib/recommend/v3/interpret";

function prof(over: Partial<CanonicalProfile> = {}): CanonicalProfile {
  return {
    schemaVersion: "v3",
    region: "US",
    currency: "USD",
    workloads: [{ id: "study-office", importance: "primary", subprofile: null }],
    budget: { min: null, max: null, noMax: true, currency: "USD" },
    priorities: [],
    requirements: [],
    ...over,
  };
}

function req(r: Requirement): Requirement {
  return r;
}

const hardRam = (gb: number) =>
  req({
    id: "ram",
    kind: "hard",
    importance: 2,
    min: gb,
    target: gb,
    provenance: { source: "quick", reason: `RAM must-have ≥${gb}GB` },
    userMust: true,
  });

describe("workload summaries", () => {
  it("study/office renders with Primary label, no constraints", () => {
    const i = interpretProfile(prof());
    expect(i.workloads).toEqual([
      { id: "study-office", label: "Study, work & everyday use", importance: "Primary", subprofileLabel: null },
    ]);
    expect(i.mustHaves).toEqual([]);
    expect(i.preferences).toEqual([]);
    expect(i.fixedConstraints).toEqual([]);
    expect(i.relaxableConstraints).toEqual([]);
    expect(i.contradictions).toEqual([]);
    expect(i.occasionalNote).toBeNull();
    expect(i.region).toBe("United States");
  });

  it("gaming both-subtype renders mix label", () => {
    const i = interpretProfile(
      prof({ workloads: [{ id: "gaming", importance: "primary", subprofile: "both" }] }),
    );
    expect(i.workloads).toEqual([
      { id: "gaming", label: "Gaming", importance: "Primary", subprofileLabel: "A mix of both" },
    ]);
  });

  it("development heavy renders intensity label", () => {
    const i = interpretProfile(
      prof({ workloads: [{ id: "dev", importance: "primary", subprofile: "heavy" }] }),
    );
    expect(i.workloads[0].label).toBe("Coding & software");
    expect(i.workloads[0].subprofileLabel).toBe("Heavy — VMs, containers, large builds");
  });

  it("ai-ml renders with Secondary label when second", () => {
    const i = interpretProfile(
      prof({
        workloads: [
          { id: "gaming", importance: "primary", subprofile: "both" },
          { id: "ai-ml", importance: "secondary", subprofile: null },
        ],
      }),
    );
    expect(i.workloads[1]).toEqual({
      id: "ai-ml",
      label: "AI & machine learning",
      importance: "Secondary",
      subprofileLabel: null,
    });
  });

  it("mixed gaming+dev keeps both entries in order", () => {
    const i = interpretProfile(
      prof({
        workloads: [
          { id: "gaming", importance: "primary", subprofile: "esports" },
          { id: "dev", importance: "secondary", subprofile: "standard" },
        ],
      }),
    );
    expect(i.workloads.map((w) => w.id)).toEqual(["gaming", "dev"]);
    expect(i.workloads[0].subprofileLabel).toBe("Competitive & fast");
    expect(i.workloads[1].subprofileLabel).toBe("Standard");
  });

  it("all-occasional sets the occasional note", () => {
    const i = interpretProfile(
      prof({
        workloads: [
          { id: "gaming", importance: "occasional", subprofile: "aaa" },
          { id: "dev", importance: "occasional", subprofile: "standard" },
        ],
      }),
    );
    expect(i.workloads[0].subprofileLabel).toBe("Story & visuals");
    expect(i.occasionalNote).toBe(
      "Everything is marked Occasional, so your workloads are balanced evenly.",
    );
  });
});

describe("must-haves, preferences, fixed + relaxable", () => {
  it("hard OS is a must-have and never loosened", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "os",
            kind: "hard",
            importance: 2,
            min: "windows",
            provenance: { source: "quick", reason: "OS must be windows" },
            userMust: true,
          }),
        ],
      }),
    );
    expect(i.mustHaves).toEqual([{ id: "os", text: "Windows" }]);
    expect(i.fixedConstraints).toEqual([{ id: "os", text: "Windows" }]);
    expect(i.relaxableConstraints).toEqual([]);
  });

  it("budget min+max renders a range and stays fixed", () => {
    const i = interpretProfile(
      prof({
        budget: { min: 50000, max: 80000, noMax: false, currency: "USD" },
        requirements: [
          req({
            id: "budget",
            kind: "hard",
            importance: 2,
            min: 50000,
            max: 80000,
            provenance: { source: "quick", reason: "User budget" },
            userMust: true,
          }),
        ],
      }),
    );
    expect(i.mustHaves).toEqual([{ id: "budget", text: "$50,000–$80,000" }]);
    expect(i.fixedConstraints).toEqual([{ id: "budget", text: "$50,000–$80,000" }]);
    expect(i.relaxableConstraints).toEqual([]);
  });

  it("no-maximum budget renders min-or-more and stays fixed", () => {
    const i = interpretProfile(
      prof({
        region: "IN",
        currency: "INR",
        budget: { min: 80000, max: null, noMax: true, currency: "INR" },
        requirements: [
          req({
            id: "budget",
            kind: "hard",
            importance: 2,
            min: 80000,
            max: null,
            provenance: { source: "quick", reason: "User budget" },
            userMust: true,
          }),
        ],
      }),
    );
    expect(i.region).toBe("India");
    expect(i.mustHaves[0].text).toContain("80,000");
    expect(i.mustHaves[0].text).toContain("or more");
    expect(i.fixedConstraints.map((f) => f.id)).toEqual(["budget"]);
  });

  it("new-only refurb is a must-have and never loosened", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "refurb",
            kind: "hard",
            importance: 2,
            target: "new-only",
            provenance: { source: "advanced", reason: "New laptops only" },
            userMust: true,
          }),
        ],
      }),
    );
    expect(i.mustHaves).toEqual([{ id: "refurb", text: "New laptops only" }]);
    expect(i.fixedConstraints).toEqual([{ id: "refurb", text: "New laptops only" }]);
  });

  it("weight hard is must-have plus ordered relaxable row", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "weight",
            kind: "hard",
            importance: 2,
            max: 1.5,
            provenance: { source: "quick", reason: "Weight must be ≤1.5kg" },
            userMust: true,
          }),
        ],
      }),
    );
    expect(i.mustHaves).toEqual([{ id: "weight", text: "No heavier than 1.5 kg" }]);
    expect(i.fixedConstraints).toEqual([]);
    expect(i.relaxableConstraints).toEqual([
      { id: "weight", text: "No heavier than 1.5 kg — Dropped if needed.", order: 8 },
    ]);
  });

  it("macOS + dedicated-GPU conflict surfaces verbatim", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "os",
            kind: "hard",
            importance: 2,
            min: "macos",
            provenance: { source: "quick", reason: "OS must be macos" },
            userMust: true,
          }),
          req({
            id: "gpu",
            kind: "hard",
            importance: 2,
            target: "dedicated",
            provenance: { source: "quick", reason: "Dedicated GPU must-have" },
            userMust: true,
          }),
        ],
      }),
    );
    expect(i.mustHaves.map((m) => m.id)).toEqual(["os", "gpu"]);
    expect(i.contradictions).toEqual([
      "macOS laptops in this catalog use integrated graphics — dedicated-GPU requirement conflicts with macOS; OS kept, GPU treated as preferred.",
    ]);
  });

  it("prefer honest notes: os-prefer ranks higher, ram-prefer flags", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "os-prefer",
            kind: "target",
            targetClass: "B",
            importance: 2,
            target: "macos",
            provenance: { source: "quick", reason: "OS preferred macos" },
            userMust: false,
          }),
          req({
            id: "ram",
            kind: "target",
            targetClass: "A",
            importance: 2,
            target: 16,
            provenance: { source: "quick", reason: "RAM preferred ≥16GB" },
            userMust: false,
          }),
        ],
      }),
    );
    expect(i.preferences).toEqual([
      { id: "os-prefer", text: "macOS", honestNote: "Laptops with macOS rank higher." },
      { id: "ram", text: "16 GB RAM or more", honestNote: "We'll flag picks that fall short." },
    ]);
  });

  it("workload-sourced hard demotes to a preference with friendly contradiction", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          {
            ...hardRam(16),
            provenance: { source: "workload", workloadId: "dev", reason: "Dev floor" },
          },
        ],
      }),
    );
    expect(i.mustHaves).toEqual([]);
    expect(i.preferences).toEqual([
      { id: "ram", text: "16 GB RAM or more", honestNote: "We'll flag picks that fall short." },
    ]);
    expect(i.contradictions).toEqual([
      "ram from your workload is treated as a preference, not a strict filter.",
    ]);
  });
});

describe("stale removal (pure re-interpret of snapshots)", () => {
  it("removing a workload drops its summary entry", () => {
    const before = prof({
      workloads: [
        { id: "gaming", importance: "primary", subprofile: "both" },
        { id: "dev", importance: "secondary", subprofile: "standard" },
      ],
    });
    const after = prof({
      workloads: [{ id: "gaming", importance: "primary", subprofile: "both" }],
    });
    expect(interpretProfile(before).workloads.map((w) => w.id)).toEqual(["gaming", "dev"]);
    expect(interpretProfile(after).workloads.map((w) => w.id)).toEqual(["gaming"]);
  });

  it("removing must/prefer requirements drops dependent entries", () => {
    const before = prof({
      requirements: [
        hardRam(16),
        req({
          id: "os-prefer",
          kind: "target",
          targetClass: "B",
          importance: 2,
          target: "linux",
          provenance: { source: "quick", reason: "OS preferred linux" },
          userMust: false,
        }),
      ],
    });
    const after = prof({ requirements: [] });
    expect(interpretProfile(before).mustHaves).toEqual([{ id: "ram", text: "16 GB RAM or more" }]);
    expect(interpretProfile(before).preferences).toHaveLength(1);
    expect(interpretProfile(after).mustHaves).toEqual([]);
    expect(interpretProfile(after).preferences).toEqual([]);
    expect(interpretProfile(after).relaxableConstraints).toEqual([]);
  });
});

describe("inert targets are dropped silently", () => {
  it("gpu-target produces no preference entry", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "gpu",
            kind: "target",
            importance: 2,
            target: "dedicated",
            provenance: { source: "quick", reason: "Dedicated GPU preferred" },
            userMust: false,
          }),
        ],
      }),
    );
    expect(i.preferences).toEqual([]);
    expect(i.mustHaves).toEqual([]);
  });

  it("displaySize-target produces no preference entry", () => {
    const i = interpretProfile(
      prof({
        requirements: [
          req({
            id: "displaySize",
            kind: "target",
            targetClass: "A",
            importance: 2,
            target: 15,
            provenance: { source: "advanced", reason: "Display preferred" },
            userMust: false,
          }),
        ],
      }),
    );
    expect(i.preferences).toEqual([]);
    expect(i.mustHaves).toEqual([]);
  });
});
