/**
 * Unit tests for the results-presentation helpers (Phase 4 — Results V2).
 * Fixtures below are fixture-only shapes mirroring the real DTO; they assert
 * mapping behavior, never engine scoring.
 */
import { describe, expect, it } from "vitest";
import {
  asRecommendationDTO,
  bindingStatus,
  detailHref,
  dimLabel,
  DIM_LABELS,
  formatPriceShort,
  overallGap,
  relaxSummary,
  resultImageSrc,
  tierLabel,
  topItem,
  verdictFor,
} from "@/lib/results-presentation";
import type {
  RankedItemDTO,
  RecommendationDTO,
} from "@/lib/recommend/v3/types";

function item(over: Partial<RankedItemDTO> = {}): RankedItemDTO {
  return {
    laptopId: "laptop-abc123",
    brand: "Acme",
    model: "Ultra 14",
    variant: null,
    price: 999,
    currency: "USD",
    priceStale: false,
    priceMissing: false,
    scores: { overall: 88, W: 96, C: 84, V: 72 },
    confidence: "high",
    confidenceFactors: ["f1", "f2", "f3", "f4", "f5"],
    dataCompleteness: 92,
    strengths: [{ dim: "cpu", evidence: "8 cores ≥ 6 required" }],
    compromises: ["battery"],
    missedPreferred: [{ id: "battery", required: "10h", actual: "7h" }],
    whyAbove: { vsId: "laptop-def456", won: [{ dim: "cpu", delta: 0.05 }], lost: [] },
    capabilities: {},
    specs: {},
    ...over,
  };
}

function dto(over: Partial<RecommendationDTO> = {}): RecommendationDTO {
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
    items: [item()],
    contradictions: [],
    notes: [],
    ...over,
  };
}

describe("DIM_LABELS", () => {
  it("covers all 9 dims", () => {
    expect(Object.keys(DIM_LABELS).sort()).toEqual(
      ["battery", "build", "cpu", "display", "gpu", "portability", "ram", "storage", "vram"].sort(),
    );
    expect(DIM_LABELS.cpu).toBe("Processing");
    expect(DIM_LABELS.vram).toBe("Video memory");
  });

  it("dimLabel falls back to the raw id and never crashes", () => {
    expect(dimLabel("thermals")).toBe("thermals");
    expect(dimLabel(null)).toBe("Unknown");
    expect(dimLabel(undefined)).toBe("Unknown");
    expect(dimLabel(42)).toBe("Unknown");
  });
});

describe("tierLabel + verdictFor", () => {
  it("high → Best fit + closest-match verdict", () => {
    expect(tierLabel("high")).toBe("Best fit");
    expect(verdictFor(item({ confidence: "high" }))).toBe(
      "Acme Ultra 14 is the closest match for your answers.",
    );
  });

  it("medium → Strong alternative verdict", () => {
    expect(tierLabel("medium")).toBe("Strong alternative");
    expect(verdictFor(item({ confidence: "medium" }))).toBe(
      "Acme Ultra 14 is a strong alternative for your answers.",
    );
  });

  it("limited → closest-available verdict with caveats", () => {
    expect(tierLabel("limited")).toBe("Partial fit");
    expect(verdictFor(item({ confidence: "limited" }))).toBe(
      "Acme Ultra 14 is the closest available option, with caveats below.",
    );
  });

  it("unknown tier fails safe to Partial fit / caveats verdict", () => {
    expect(tierLabel("bogus")).toBe("Partial fit");
    expect(tierLabel(null)).toBe("Partial fit");
    expect(verdictFor(item({ confidence: "bogus" as never }))).toContain("caveats below");
  });

  it("verdicts never contain marketing claims", () => {
    for (const tier of ["high", "medium", "limited"] as const) {
      const v = verdictFor(item({ confidence: tier })).toLowerCase();
      for (const banned of ["best laptop", "perfect", "guaranteed", "future-proof"]) {
        expect(v).not.toContain(banned);
      }
    }
  });

  it("verdictFor is total on malformed input", () => {
    expect(verdictFor(null)).toBe("This laptop is the closest available option, with caveats below.");
    expect(verdictFor({})).toContain("This laptop");
  });
});

describe("formatPriceShort", () => {
  it("formats price + currency", () => {
    expect(formatPriceShort(999, "USD")).toBe("999 USD");
  });
  it("returns null when price is missing", () => {
    expect(formatPriceShort(null, "USD")).toBeNull();
    expect(formatPriceShort(undefined, "USD")).toBeNull();
    expect(formatPriceShort(NaN, "USD")).toBeNull();
  });
});

describe("detailHref", () => {
  it("links via deterministic laptopId (slug fallback resolves it)", () => {
    expect(detailHref(item())).toBe("/laptops/laptop-abc123");
  });
  it("falls back safely on malformed input", () => {
    expect(detailHref(null)).toBe("/laptops");
    expect(detailHref({})).toBe("/laptops");
  });
});

describe("bindingStatus", () => {
  it("ok when regions match", () => {
    expect(bindingStatus(dto(), { region: "US" })).toBe("ok");
  });
  it("stale on region drift", () => {
    expect(bindingStatus(dto(), { region: "IN" })).toBe("stale");
  });
  it("unbound when profile null/invalid", () => {
    expect(bindingStatus(dto(), null)).toBe("unbound");
    expect(bindingStatus(dto(), {})).toBe("unbound");
    expect(bindingStatus(null, { region: "US" })).toBe("unbound");
  });
});

describe("resultImageSrc", () => {
  it("is null when the DTO item carries no image (frozen v3 shape)", () => {
    expect(resultImageSrc(item())).toBeNull();
    expect(resultImageSrc(null)).toBeNull();
  });
  it("returns server-enriched imageUrls only when allowlisted (read-time gate)", () => {
    const good = "https://images.unsplash.com/photo-1617294864710-ff63b9ea49b6?w=400";
    expect(resultImageSrc({ ...item(), imageUrl: good })).toBe(good);
    expect(resultImageSrc({ ...item(), imageUrl: "https://example.com/x.jpg" })).toBeNull();
    expect(resultImageSrc({ ...item(), imageUrl: "not-a-url" })).toBeNull();
  });
});

describe("relaxSummary", () => {
  it("passes ledger rows through verbatim", () => {
    const ledger = [{ requirement: "ram", from: "32GB", to: "16GB", reason: "catalog coverage" }];
    expect(relaxSummary(ledger)).toEqual(ledger);
  });
  it("returns [] for empty/missing/malformed ledgers", () => {
    expect(relaxSummary([])).toEqual([]);
    expect(relaxSummary(null)).toEqual([]);
    expect(relaxSummary(undefined)).toEqual([]);
    expect(relaxSummary([null, 42])).toEqual([]);
  });
});

describe("overallGap", () => {
  it("computes top − second overall math", () => {
    const a = item({ scores: { overall: 88, W: 1, C: 1, V: 1 } });
    const b = item({ scores: { overall: 81.5, W: 1, C: 1, V: 1 } });
    expect(overallGap(a, b)).toBeCloseTo(6.5, 10);
  });
  it("returns null when either score is missing", () => {
    expect(overallGap(null, item())).toBeNull();
    expect(overallGap(item(), {})).toBeNull();
  });
});

describe("DTO guards", () => {
  it("asRecommendationDTO accepts valid DTO, rejects garbage", () => {
    expect(asRecommendationDTO(dto())).not.toBeNull();
    expect(asRecommendationDTO(null)).toBeNull();
    expect(asRecommendationDTO({ schemaVersion: "v2", items: [] })).toBeNull();
  });
  it("topItem returns first item or null when empty", () => {
    expect(topItem(dto())?.laptopId).toBe("laptop-abc123");
    expect(topItem(dto({ items: [] }))).toBeNull();
  });
});
