import { describe, expect, it } from "vitest";
import {
  addCompareId,
  compareHref,
  MAX_COMPARE_IDS,
  pairHref,
  parseCompareIds,
  removeCompareId,
  replaceCompareId,
} from "@/lib/compare-select";

describe("parseCompareIds", () => {
  it("returns [] for null/empty/blank", () => {
    expect(parseCompareIds(null)).toEqual([]);
    expect(parseCompareIds("")).toEqual([]);
    expect(parseCompareIds(" , ,")).toEqual([]);
  });

  it("splits, trims, and drops empties", () => {
    expect(parseCompareIds("a, b ,,c ")).toEqual(["a", "b", "c"]);
  });

  it("dedupes preserving first-seen order", () => {
    expect(parseCompareIds("b,a,b,a")).toEqual(["b", "a"]);
  });

  it("caps at MAX_COMPARE_IDS", () => {
    expect(MAX_COMPARE_IDS).toBe(3);
    expect(parseCompareIds("a,b,c,d,e")).toEqual(["a", "b", "c"]);
  });

  it("decodes percent-encoded segments", () => {
    expect(parseCompareIds("MSI-Stealth%2014,a")).toEqual(["MSI-Stealth 14", "a"]);
  });
});

describe("addCompareId", () => {
  it("appends, ignores dups, caps at 3", () => {
    expect(addCompareId([], "a")).toEqual(["a"]);
    expect(addCompareId(["a"], "a")).toEqual(["a"]);
    expect(addCompareId(["a", "b", "c"], "d")).toEqual(["a", "b", "c"]);
    expect(addCompareId(["a"], "")).toEqual(["a"]);
  });
});

describe("removeCompareId", () => {
  it("removes present ids, no-ops otherwise", () => {
    expect(removeCompareId(["a", "b"], "a")).toEqual(["b"]);
    expect(removeCompareId(["a"], "zzz")).toEqual(["a"]);
  });
});

describe("replaceCompareId", () => {
  it("swaps in place, dedupes, no-ops when old absent", () => {
    expect(replaceCompareId(["a", "b"], "a", "c")).toEqual(["c", "b"]);
    expect(replaceCompareId(["a", "b"], "a", "b")).toEqual(["b"]);
    expect(replaceCompareId(["a"], "zzz", "c")).toEqual(["a"]);
  });
});

describe("compareHref", () => {
  it("builds ?ids= and round-trips through parse", () => {
    expect(compareHref([])).toBe("/compare");
    const href = compareHref(["a b", "c"]);
    expect(href).toBe("/compare?ids=a%20b,c");
    expect(parseCompareIds(new URL(href, "http://x").searchParams.get("ids"))).toEqual([
      "a b",
      "c",
    ]);
  });

  it("dedupes and caps", () => {
    expect(compareHref(["a", "a", "b", "c", "d"])).toBe("/compare?ids=a,b,c");
  });
});

describe("pairHref", () => {
  it("delegates to the canonical order-stable path", () => {
    expect(pairHref("zeta", "alpha")).toBe("/compare/alpha-vs-zeta");
    expect(pairHref("alpha", "zeta")).toBe("/compare/alpha-vs-zeta");
  });
});
