import { describe, expect, it } from "vitest";
import { apiBase, getJson, uniqueIp, xffHeader } from "./helpers";
import type { ApiResponse } from "./helpers";
import type { CanonicalProfile } from "@/lib/recommend/v3/types";

interface V3Ok {
  schemaVersion: string;
  scoringVersion: string;
  weightsVersion: string;
  region: string;
  currency: string;
  relaxed: boolean;
  exhausted: boolean;
  awaitingUser: boolean;
  relaxationLedger: Array<{ requirement: string; from: string; to: string; reason: string }>;
  items: Array<{
    laptopId: string;
    brand: string;
    model: string;
    price: number | null;
    currency: string;
    scores: { overall: number; W: number; C: number; V: number | null };
    confidence: string;
    confidenceFactors: string[];
    capabilities: Record<string, number | null>;
  }>;
  total: number;
}

interface V3Err { error: string; issues?: string[] }

function baseProfile(): CanonicalProfile {
  return {
    schemaVersion: "v3",
    region: "US",
    currency: "USD",
    workloads: [{ id: "study-office", importance: "primary", subprofile: null }],
    budget: { min: null, max: null, noMax: true, currency: "USD" },
    priorities: [],
    requirements: [],
  };
}

function postV3(profile: unknown): Promise<ApiResponse<V3Ok | V3Err>> {
  return getJson<V3Ok | V3Err>(`${apiBase}/api/quiz`, {
    method: "POST",
    headers: { "content-type": "application/json", ...xffHeader(uniqueIp()) },
    body: JSON.stringify({ schemaVersion: "v3", profile }),
  });
}

describe("POST /api/quiz v3", () => {
  it("accepts a valid v3 profile and returns the versioned DTO", async () => {
    const res = await postV3(baseProfile());
    expect(res.status).toBe(200);
    const body = res.body as V3Ok;
    expect(body.schemaVersion).toBe("v3");
    expect(body.region).toBe("US");
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.length).toBeLessThanOrEqual(12);
    for (const item of body.items) {
      expect(item.laptopId.length).toBeGreaterThan(0);
      expect(item.scores.overall).toBeGreaterThanOrEqual(0);
      expect(item.scores.overall).toBeLessThanOrEqual(100);
      expect(["high", "medium", "limited"]).toContain(item.confidence);
      expect(Array.isArray(item.confidenceFactors)).toBe(true);
    }
  });

  it("rejects a malformed profile with a validation error", async () => {
    const res = await postV3({ schemaVersion: "v3", region: "US", workloads: [] });
    expect(res.status).toBe(400);
    expect((res.body as V3Err).error).toBe("Invalid v3 profile");
  });

  it("relaxes or exhausts on an impossible budget instead of failing", async () => {
    const p = baseProfile();
    p.budget = { min: null, max: 1, noMax: false, currency: "USD" };
    p.requirements = [
      { id: "budget", kind: "hard", importance: 2, min: null, max: 1, provenance: { source: "quick", reason: "t" }, userMust: true },
    ];
    const res = await postV3(p);
    expect(res.status).toBe(200);
    const body = res.body as V3Ok;
    expect(body.relaxed || body.exhausted).toBe(true);
    expect(body.relaxationLedger.length).toBeLessThanOrEqual(3);
  });

  it("reaches awaiting-user on an intent-hard combination (chromeos)", async () => {
    const p = baseProfile();
    p.requirements = [
      { id: "os", kind: "hard", importance: 2, min: "chromeos", provenance: { source: "quick", reason: "t" }, userMust: true },
    ];
    const res = await postV3(p);
    expect(res.status).toBe(200);
    const body = res.body as V3Ok;
    expect(body.exhausted).toBe(true);
    expect(body.awaitingUser).toBe(true);
    expect(body.relaxationLedger.every((e) => e.requirement !== "os")).toBe(true);
  });

  it("rejects an unsupported region", async () => {
    const p = baseProfile();
    p.region = "XX";
    const res = await postV3(p);
    expect(res.status).toBe(400);
  });
});
