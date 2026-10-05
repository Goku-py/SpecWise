import { describe, expect, it } from "vitest";
import { selectPersonalization } from "@/components/compare/compare-personalization";
import type { RecommendationDTO } from "@/lib/recommend/v3/types";

function dto(): RecommendationDTO {
  return {
    schemaVersion: "v3",
    scoringVersion: "v3.1",
    weightsVersion: "v3.1",
    region: "US",
    currency: "USD",
    relaxed: false,
    exhausted: false,
    awaitingUser: false,
    relaxationLedger: [],
    contradictions: [],
    notes: [],
    items: [
      {
        laptopId: "a",
        brand: "A",
        model: "One",
        variant: null,
        price: 1000,
        currency: "USD",
        priceStale: false,
        priceMissing: false,
        scores: { overall: 87.5, W: 0.9, C: 0.8, V: 0.4 },
        confidence: "high",
        confidenceFactors: [],
        dataCompleteness: 1,
        strengths: [
          { dim: "ram", evidence: "16 GB RAM" },
          { dim: "cpu", evidence: "8 cores" },
        ],
        compromises: ["build"],
        missedPreferred: [],
        whyAbove: null,
        capabilities: {},
        specs: {},
      },
      {
        laptopId: "b",
        brand: "B",
        model: "Two",
        variant: null,
        price: null,
        currency: "USD",
        priceStale: false,
        priceMissing: true,
        scores: { overall: 72, W: 0.5, C: 0.6, V: null },
        confidence: "medium",
        confidenceFactors: [],
        dataCompleteness: 0.8,
        strengths: [{ dim: "battery", evidence: "10 hours" }],
        compromises: [],
        missedPreferred: [],
        whyAbove: null,
        capabilities: {},
        specs: {},
      },
    ],
  } as RecommendationDTO;
}

describe("selectPersonalization", () => {
  it("copies stored overall/W/C/V + strengths verbatim (no recompute)", () => {
    const out = selectPersonalization(["b", "a"], dto(), "bound");
    expect(out).toHaveLength(2);
    // Requested order preserved; values equal the stored inputs exactly.
    expect(out![0]).toEqual({
      laptopId: "b",
      rank: 2,
      total: 2,
      overall: 72,
      w: 0.5,
      c: 0.6,
      v: null,
      strengths: [{ dim: "battery", evidence: "10 hours" }],
    });
    expect(out![1]).toMatchObject({
      laptopId: "a",
      rank: 1,
      overall: 87.5,
      w: 0.9,
      c: 0.8,
      v: 0.4,
      strengths: [
        { dim: "ram", evidence: "16 GB RAM" },
        { dim: "cpu", evidence: "8 cores" },
      ],
    });
  });

  it("skips ids with no stored item", () => {
    expect(selectPersonalization(["zzz"], dto(), "bound")).toEqual([]);
  });

  it("returns null unless bound (stale/unbound render elsewhere-or-nothing)", () => {
    expect(selectPersonalization(["a"], dto(), "stale")).toBeNull();
    expect(selectPersonalization(["a"], dto(), "unbound")).toBeNull();
    expect(selectPersonalization(["a"], null, "bound")).toBeNull();
  });
});
