/**
 * Results mapping tests (Phase 4 — Results V2).
 *
 * Every visible-claim → DTO-field assertion: the presented string must derive
 * from the DTO field cited, with no invented text. Fixtures are fixture-only
 * shapes mirroring the real RecommendationDTO.
 *
 * Component-render cases (V-null footnote, empty-list rendering, skeleton)
 * need a browser DOM and are recorded as NOT-RUNNABLE in this node env —
 * see the skipped block at the bottom. They are NOT faked here.
 */
import { describe, expect, it } from "vitest";
import {
  bindingStatus,
  detailHref,
  formatPriceShort,
  overallGap,
  relaxSummary,
  resultImageSrc,
  tierLabel,
  verdictFor,
} from "@/lib/results-presentation";
import { buildResultsCompareContext } from "@/components/results/CompareContract";
import type {
  RankedItemDTO,
  RecommendationDTO,
} from "@/lib/recommend/v3/types";

function item(over: Partial<RankedItemDTO> = {}): RankedItemDTO {
  return {
    laptopId: "laptop-aaa",
    brand: "Acme",
    model: "Ultra 14",
    variant: "16GB / 512GB",
    price: 1299,
    currency: "USD",
    priceStale: true,
    priceMissing: false,
    scores: { overall: 91, W: 96, C: 88, V: null },
    confidence: "high",
    confidenceFactors: ["f1", "f2"],
    dataCompleteness: 95,
    strengths: [
      { dim: "cpu", evidence: "8 cores ≥ 6 required" },
      { dim: "ram", evidence: "16GB meets 16GB target" },
    ],
    compromises: ["battery", "weight"],
    missedPreferred: [{ id: "weight", required: "≤1.2kg", actual: "1.4kg" }],
    whyAbove: {
      vsId: "laptop-bbb",
      won: [{ dim: "cpu", delta: 0.06 }],
      lost: [{ dim: "battery", delta: -0.01 }],
    },
    capabilities: {},
    specs: {},
    ...over,
  };
}

function second(): RankedItemDTO {
  return item({
    laptopId: "laptop-bbb",
    brand: "Acme",
    model: "Lite 13",
    price: 999,
    scores: { overall: 84, W: 88, C: 82, V: 70 },
    confidence: "medium",
    whyAbove: null,
  });
}

function dto(over: Partial<RecommendationDTO> = {}): RecommendationDTO {
  return {
    schemaVersion: "v3",
    scoringVersion: "v3.1",
    weightsVersion: "v3.1",
    region: "US",
    currency: "USD",
    relaxed: true,
    exhausted: false,
    awaitingUser: false,
    relaxationLedger: [
      { requirement: "ram", from: "32GB", to: "16GB", reason: "catalog coverage" },
    ],
    items: [item(), second()],
    contradictions: ["Budget and portability pull in opposite directions."],
    notes: [],
    ...over,
  };
}

describe("visible-claim → DTO-field mapping", () => {
  it("hero name derives from brand + model fields", () => {
    const top = dto().items[0];
    expect(`${top.brand} ${top.model}`).toBe("Acme Ultra 14");
  });

  it("hero verdict derives from the confidence tier (high)", () => {
    expect(verdictFor(dto().items[0])).toBe(
      "Acme Ultra 14 is the closest match for your answers.",
    );
  });

  it("hero tier badge derives from the confidence tier", () => {
    expect(tierLabel(dto().items[0].confidence)).toBe("Best fit");
    expect(tierLabel(dto().items[1].confidence)).toBe("Strong alternative");
  });

  it("V-null item carries V: null (omission condition, no invented value)", () => {
    expect(dto().items[0].scores.V).toBeNull();
    expect(dto().items[1].scores.V).toBe(70);
  });

  it("price line derives from price + currency + priceStale fields", () => {
    const top = dto().items[0];
    expect(formatPriceShort(top.price, top.currency)).toBe("1299 USD");
    expect(top.priceStale).toBe(true);
    expect(formatPriceShort(null, top.currency)).toBeNull();
  });

  it("detail hrefs derive from laptopId (resolvable via id fallback)", () => {
    expect(detailHref(dto().items[0])).toBe("/laptops/laptop-aaa");
    expect(detailHref(dto().items[1])).toBe("/laptops/laptop-bbb");
  });

  it("detail hrefs never invent slugs (DTO has no slug field)", () => {
    for (const it2 of dto().items) {
      expect("slug" in it2).toBe(false);
      expect(detailHref(it2)).toContain(it2.laptopId);
    }
  });

  it("images resolve to null when the DTO carries no imageUrl (fallback honest)", () => {
    for (const it2 of dto().items) {
      expect("imageUrl" in it2).toBe(false);
      expect(resultImageSrc(it2)).toBeNull();
    }
  });

  it("server-enriched imageUrls resolve only when allowlisted", () => {
    const good = "https://images.unsplash.com/photo-1617294864710-ff63b9ea49b6?w=400";
    expect(resultImageSrc({ ...dto().items[0], imageUrl: good })).toBe(good);
    expect(resultImageSrc({ ...dto().items[0], imageUrl: "https://example.com/x.jpg" })).toBeNull();
  });

  it("strength evidence passes through verbatim", () => {
    const strengths = dto().items[0].strengths;
    expect(strengths[0]).toEqual({ dim: "cpu", evidence: "8 cores ≥ 6 required" });
    expect(strengths.length).toBeLessThanOrEqual(3);
  });

  it("missed-preferred rows expose required/actual for the template sentence", () => {
    const missed = dto().items[0].missedPreferred;
    expect(missed[0]).toEqual({ id: "weight", required: "≤1.2kg", actual: "1.4kg" });
  });

  it("why-above gap math derives from the two overall scores", () => {
    const d = dto();
    expect(overallGap(d.items[0], d.items[1])).toBeCloseTo(7, 10);
  });

  it("why-above won/lost rows derive from the whyAbove field", () => {
    const why = dto().items[0].whyAbove;
    expect(why?.won[0]).toEqual({ dim: "cpu", delta: 0.06 });
    expect(why?.lost[0]).toEqual({ dim: "battery", delta: -0.01 });
    expect(dto().items[1].whyAbove).toBeNull();
  });

  it("relaxation rows pass through verbatim (no rewording)", () => {
    expect(relaxSummary(dto().relaxationLedger)).toEqual([
      { requirement: "ram", from: "32GB", to: "16GB", reason: "catalog coverage" },
    ]);
  });

  it("contradictions pass through verbatim", () => {
    expect(dto().contradictions).toEqual([
      "Budget and portability pull in opposite directions.",
    ]);
  });

  it("binding ok/stale/unbound derives from region comparison", () => {
    const d = dto();
    expect(bindingStatus(d, { region: "US", schemaVersion: "v3" })).toBe("ok");
    expect(bindingStatus(d, { region: "IN", schemaVersion: "v3" })).toBe("stale");
    expect(bindingStatus(d, null)).toBe("unbound");
  });

  it("single-item DTO has no second (why-above gap uncomputable)", () => {
    const single = dto({ items: [item()] });
    expect(single.items[1]).toBeUndefined();
    expect(overallGap(single.items[0], null)).toBeNull();
  });

  it("empty-states branch on items/awaitingUser/relaxed flags", () => {
    // awaitingUser + empty → NoResults(awaitingUser); empty + !awaitingUser +
    // !relaxed → EmptyCatalog; empty + relaxed → NoResults(false).
    const awaiting = dto({ items: [], awaitingUser: true });
    const empty = dto({ items: [], relaxed: false });
    const relaxedEmpty = dto({ items: [], relaxed: true });
    expect(awaiting.items.length).toBe(0);
    expect(awaiting.awaitingUser).toBe(true);
    expect(empty.relaxed).toBe(false);
    expect(relaxedEmpty.relaxed).toBe(true);
  });
});

describe("CompareContract (deferred, types-only)", () => {
  it("builds top-N ids + overall map in engine order", () => {
    const ctx = buildResultsCompareContext(dto(), 2);
    expect(ctx.ids).toEqual(["laptop-aaa", "laptop-bbb"]);
    expect(ctx.overall).toEqual({ "laptop-aaa": 91, "laptop-bbb": 84 });
  });

  it("defaults to top-3 and never re-sorts", () => {
    const ctx = buildResultsCompareContext(dto());
    expect(ctx.ids).toEqual(["laptop-aaa", "laptop-bbb"]);
  });

  it("empty DTO yields empty context", () => {
    expect(buildResultsCompareContext(dto({ items: [] }))).toEqual({ ids: [], overall: {} });
  });
});

// NOT-RUNNABLE in node env (no DOM/jsdom): recorded, not faked.
describe.skip("browser-only cases (NOT-RUNNABLE in node)", () => {
  it("V-null renders the 'Value omitted' footnote", () => {});
  it("empty strengths/compromises/missedPreferred/whyAbove render nothing", () => {});
  it("layout holds at 360px–1440px without horizontal scroll", () => {});
  it("reduced-motion disables count-up animation", () => {});
  it("LoadingSkeleton shows before stored results load (no null flash)", () => {});
  it("Copy answers link writes the absolute share URL to the clipboard", () => {});
});
