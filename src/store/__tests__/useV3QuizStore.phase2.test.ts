/**
 * Phase-2 store tests: region-sticky reset, stale-requirement pruning on
 * deselect, budgetRangeError, and the max-2 priorities safety net.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { budgetRangeError, useV3QuizStore } from "@/store/useV3QuizStore";

function fresh(region = "US") {
  useV3QuizStore.getState().setRegion(region);
  useV3QuizStore.getState().reset();
  return useV3QuizStore.getState();
}

function reqIds() {
  return useV3QuizStore.getState().profile.requirements.map((r) => r.id);
}

beforeEach(() => {
  fresh("US");
});

describe("reset preserves region", () => {
  it("keeps the current region, clears everything else", () => {
    const s = fresh("IN");
    s.toggleWorkload("dev");
    s.togglePriority("speed");
    s.setRam(32, true);
    useV3QuizStore.getState().reset();
    const p = useV3QuizStore.getState().profile;
    expect(p.region).toBe("IN");
    expect(p.workloads).toEqual([]);
    expect(p.priorities).toEqual([]);
    expect(p.requirements).toEqual([]);
  });
});

describe("toggleWorkload pruning", () => {
  it("removing gaming drops the gpu req but never ram/storage/os/budget", () => {
    const s = fresh();
    s.toggleWorkload("gaming");
    s.setGpu("must");
    s.setRam(32, false);
    s.setStorage(1024, false);
    s.setOs("prefer", "windows");
    s.setBudget(null, 2000, false);
    expect(reqIds()).toContain("gpu");
    useV3QuizStore.getState().toggleWorkload("gaming");
    const ids = reqIds();
    expect(ids).not.toContain("gpu");
    expect(ids).toEqual(expect.arrayContaining(["ram", "storage", "os-prefer", "budget"]));
  });

  it("removing the last gpu-workload drops vram; keeping one keeps gpu", () => {
    const s = fresh();
    s.toggleWorkload("gaming");
    s.toggleWorkload("cad-3d");
    s.setGpu("must");
    s.upsertRequirement({
      id: "vram", kind: "target", targetClass: "A", importance: 3, target: 8,
      provenance: { source: "advanced", reason: "t" }, userMust: false,
    });
    useV3QuizStore.getState().toggleWorkload("gaming");
    expect(reqIds()).toContain("gpu");
    expect(reqIds()).toContain("vram");
    useV3QuizStore.getState().toggleWorkload("cad-3d");
    expect(reqIds()).not.toContain("gpu");
    expect(reqIds()).not.toContain("vram");
  });

  it("removing dev drops cpu-cores/ports/upgrade", () => {
    const s = fresh();
    s.toggleWorkload("dev");
    s.upsertRequirement({
      id: "cpu-cores", kind: "hard", importance: 2, target: 8,
      provenance: { source: "advanced", reason: "t" }, userMust: true,
    });
    s.setPorts(["hdmi"]);
    expect(reqIds()).toEqual(expect.arrayContaining(["cpu-cores", "ports"]));
    useV3QuizStore.getState().toggleWorkload("dev");
    expect(reqIds()).not.toContain("cpu-cores");
    expect(reqIds()).not.toContain("ports");
  });
});

describe("togglePriority pruning", () => {
  it("removing carry drops the weight req", () => {
    const s = fresh();
    s.togglePriority("carry");
    s.setWeight(1.5, false);
    expect(reqIds()).toContain("weight");
    useV3QuizStore.getState().togglePriority("carry");
    expect(reqIds()).not.toContain("weight");
  });

  it("removing carry keeps weight when study-office is selected", () => {
    const s = fresh();
    s.toggleWorkload("study-office");
    s.togglePriority("carry");
    s.setWeight(1.5, true);
    useV3QuizStore.getState().togglePriority("carry");
    expect(reqIds()).toContain("weight");
  });

  it("third pick stays at 2 (store safety net)", () => {
    const s = fresh();
    s.togglePriority("speed");
    s.togglePriority("battery");
    useV3QuizStore.getState().togglePriority("carry");
    const p = useV3QuizStore.getState().profile.priorities;
    expect(p).toHaveLength(2);
    expect(p).not.toContain("carry");
  });
});

describe("budgetRangeError", () => {
  it("flags min above max", () => {
    expect(budgetRangeError(1000, 500, false)).toBe(
      "Minimum (1000) is above maximum (500) — swap them or clear one.",
    );
  });

  it("passes valid, empty, and no-max ranges", () => {
    expect(budgetRangeError(500, 1000, false)).toBeNull();
    expect(budgetRangeError(null, 500, false)).toBeNull();
    expect(budgetRangeError(500, null, false)).toBeNull();
    expect(budgetRangeError(null, null, false)).toBeNull();
    expect(budgetRangeError(1000, 500, true)).toBeNull();
  });
});
