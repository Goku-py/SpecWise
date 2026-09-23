import { describe, expect, it } from "vitest";
import {
  buildV3SharePath,
  parseV3ShareParams,
  type QuizSearchParams,
} from "@/lib/share";
import { quickToProfile } from "@/lib/recommend/v3/quiz";
import type { CanonicalProfile } from "@/lib/recommend/v3/types";

function quickProfile(): CanonicalProfile {
  return quickToProfile({
    workloads: [{ id: "gaming", importance: "primary" }],
    gamingSubtype: "aaa",
    region: "US",
    currency: "USD",
    budgetMin: 500,
    budgetMax: 2500,
    priorities: ["speed", "screen"],
    ramGB: 16,
    ramMust: true,
    storageGB: 512,
    osPrefer: "windows",
    gpuPrefer: true,
  });
}

function advancedProfile(): CanonicalProfile {
  const base = quickProfile();
  return {
    ...base,
    requirements: [
      ...base.requirements,
      { id: "vram", kind: "hard", importance: 2, target: 12, provenance: { source: "advanced", reason: "VRAM must have ≥12GB" }, userMust: true },
      { id: "ports", kind: "hard", importance: 2, target: "hdmi+usb-c", provenance: { source: "advanced", reason: "Ports required" }, userMust: true },
      { id: "brand-prefer", kind: "target", targetClass: "B", importance: 3, target: "amd", provenance: { source: "advanced", reason: "AMD preferred" }, userMust: false },
    ],
  };
}

function paramsOf(path: string): QuizSearchParams {
  return Object.fromEntries(
    new URL(path, "http://localhost").searchParams,
  ) as QuizSearchParams;
}

describe("v3 share round trip", () => {
  it("Quick profile survives create/share → open/share", () => {
    const profile = quickProfile();
    const parsed = parseV3ShareParams(paramsOf(buildV3SharePath(profile)));
    expect(parsed).toEqual(profile);
  });

  it("Advanced profile (hards, ports, Type-B) survives round trip", () => {
    const profile = advancedProfile();
    const parsed = parseV3ShareParams(paramsOf(buildV3SharePath(profile)));
    expect(parsed).toEqual(profile);
  });

  it("malformed payloads fail safe to null", () => {
    expect(parseV3ShareParams({})).toBeNull();
    expect(parseV3ShareParams({ s: "" })).toBeNull();
    expect(parseV3ShareParams({ s: "!!!not-base64!!!" })).toBeNull();
    expect(parseV3ShareParams({ s: Buffer.from("[]").toString("base64url") })).toBeNull();
    expect(
      parseV3ShareParams({ s: Buffer.from(JSON.stringify({ foo: 1 })).toString("base64url") }),
    ).toBeNull();
  });

  it("legacy share payloads are NOT reinterpreted (fail safe)", () => {
    expect(
      parseV3ShareParams({ workload: "esports", budget: "1500", refresh: "240+", portability: "always", upgrade: "must" }),
    ).toBeNull();
  });
});
