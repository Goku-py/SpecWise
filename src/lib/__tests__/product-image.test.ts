/**
 * Phase 8 image tests: shared allowlist + deterministic resolver, write-time
 * validation gates, and the results-enrichment scoring firewall.
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  PRODUCT_IMAGE_HOSTS,
  isAllowedProductImageUrl,
  productImageAlt,
  resolveProductImage,
} from "@/lib/product-image";
import { LaptopFormSchema } from "@/lib/laptop-fields";
import { validateLaptopPatch } from "@/lib/db/catalog";
import { Category, ProductBaseSchema } from "@/lib/validation/product";
import {
  attachResultImages,
  resultImageSrc,
} from "@/lib/results-presentation";
import { validateV3Results } from "@/lib/storage";
import type { RankedItemDTO } from "@/lib/recommend/v3/types";

const GOOD = "https://images.unsplash.com/photo-1617294864710-ff63b9ea49b6?w=400";
const EVIL = "https://example.com/x.jpg";
const MALFORMED = "not-a-url";

function baseForm(over: Record<string, unknown> = {}) {
  return {
    brand: "Acme",
    model: "Ultra 14",
    os: "Windows 11",
    cpuBrand: "Intel",
    cpuFamily: "Core i7-1360P",
    ramAmount: 16,
    storageAmount: 512,
    storageType: "SSD",
    displaySize: 14,
    ...over,
  };
}

function item(over: Partial<RankedItemDTO> = {}): RankedItemDTO {
  return {
    laptopId: "laptop-aaa",
    brand: "Acme",
    model: "Ultra 14",
    variant: null,
    price: 999,
    currency: "USD",
    priceStale: false,
    priceMissing: false,
    scores: { overall: 88, W: 96, C: 84, V: 72 },
    confidence: "high",
    confidenceFactors: ["f1"],
    dataCompleteness: 92,
    strengths: [{ dim: "cpu", evidence: "8 cores ≥ 6 required" }],
    compromises: ["battery"],
    missedPreferred: [],
    whyAbove: null,
    capabilities: {},
    specs: {},
    ...over,
  };
}

describe("PRODUCT_IMAGE_HOSTS", () => {
  it("mirrors next.config.ts remotePatterns exactly (Unsplash-only)", () => {
    expect([...PRODUCT_IMAGE_HOSTS]).toEqual(["images.unsplash.com"]);
  });
});

describe("isAllowedProductImageUrl", () => {
  it("accepts https Unsplash photo URLs", () => {
    expect(isAllowedProductImageUrl(GOOD)).toBe(true);
  });
  it("rejects non-Unsplash hosts, http, lookalike subdomains, garbage", () => {
    expect(isAllowedProductImageUrl(EVIL)).toBe(false);
    expect(isAllowedProductImageUrl("http://images.unsplash.com/photo-1")).toBe(false);
    expect(isAllowedProductImageUrl("https://evil-images.unsplash.com/x.jpg")).toBe(false);
    expect(isAllowedProductImageUrl("https://images.unsplash.com.evil.com/x.jpg")).toBe(false);
    expect(isAllowedProductImageUrl(MALFORMED)).toBe(false);
    expect(isAllowedProductImageUrl("")).toBe(false);
    expect(isAllowedProductImageUrl(null)).toBe(false);
    expect(isAllowedProductImageUrl("/relative/path.jpg")).toBe(false);
    expect(isAllowedProductImageUrl("https://images.unsplash.com")).toBe(false);
  });
});

describe("resolveProductImage", () => {
  it("returns the trimmed src for valid URLs (deterministic: same input, same output)", () => {
    expect(resolveProductImage(GOOD)).toEqual({ kind: "image", src: GOOD });
    expect(resolveProductImage(`  ${GOOD}  `)).toEqual({ kind: "image", src: GOOD });
    expect(resolveProductImage(GOOD)).toEqual(resolveProductImage(GOOD));
  });
  it("returns fallback for null, evil-host, and malformed — never a guess", () => {
    expect(resolveProductImage(null)).toEqual({ kind: "fallback" });
    expect(resolveProductImage(EVIL)).toEqual({ kind: "fallback" });
    expect(resolveProductImage(MALFORMED)).toEqual({ kind: "fallback" });
  });
});

describe("productImageAlt", () => {
  it('is factual "{brand} {model}"', () => {
    expect(productImageAlt("Dell", "XPS 13")).toBe("Dell XPS 13");
  });
  it("never returns empty", () => {
    expect(productImageAlt("", "")).toBe("Laptop");
    expect(productImageAlt(null, undefined)).toBe("Laptop");
  });
});

describe("LaptopFormSchema imageUrl (admin form + import share this schema)", () => {
  it("accepts Unsplash https, coerces empty/missing to null", () => {
    expect(LaptopFormSchema.safeParse(baseForm({ imageUrl: GOOD })).success).toBe(true);
    const empty = LaptopFormSchema.safeParse(baseForm({ imageUrl: "" }));
    expect(empty.success && empty.data.imageUrl).toBeNull();
    const missing = LaptopFormSchema.safeParse(baseForm());
    expect(missing.success && missing.data.imageUrl).toBeNull();
  });
  it("rejects non-Unsplash and malformed URLs at write time", () => {
    expect(LaptopFormSchema.safeParse(baseForm({ imageUrl: EVIL })).success).toBe(false);
    expect(LaptopFormSchema.safeParse(baseForm({ imageUrl: MALFORMED })).success).toBe(false);
    expect(LaptopFormSchema.safeParse(baseForm({ imageUrl: "http://images.unsplash.com/x" })).success).toBe(false);
  });
});

describe("validateLaptopPatch imageUrl (PATCH /api/laptops/[id])", () => {
  it("accepts allowlisted URLs (trimmed) and empty-string clear", () => {
    const ok = validateLaptopPatch({ imageUrl: ` ${GOOD} ` });
    expect(ok.error).toBeUndefined();
    expect(ok.data.imageUrl).toBe(GOOD);
    expect(validateLaptopPatch({ imageUrl: "" }).error).toBeUndefined();
  });
  it("rejects non-Unsplash and malformed URLs", () => {
    expect(validateLaptopPatch({ imageUrl: EVIL }).error).toMatch(/images\.unsplash\.com/);
    expect(validateLaptopPatch({ imageUrl: MALFORMED }).error).toMatch(/images\.unsplash\.com/);
  });
});

describe("spine ProductBaseSchema imageUrl", () => {
  const base = { category: Category.LAPTOP, brandLabel: "Acme", name: "Ultra 14", slug: "acme-ultra-14" };
  it("accepts Unsplash https / null / absent", () => {
    expect(ProductBaseSchema.safeParse({ ...base, imageUrl: GOOD }).success).toBe(true);
    expect(ProductBaseSchema.safeParse({ ...base, imageUrl: null }).success).toBe(true);
    expect(ProductBaseSchema.safeParse(base).success).toBe(true);
  });
  it("rejects non-Unsplash hosts", () => {
    expect(ProductBaseSchema.safeParse({ ...base, imageUrl: EVIL }).success).toBe(false);
  });
});

describe("resultImageSrc (presentation read)", () => {
  it("is null when the item carries no image (today's frozen DTO)", () => {
    expect(resultImageSrc(item())).toBeNull();
    expect(resultImageSrc(null)).toBeNull();
  });
  it("returns validated enriched URLs, null for invalid ones", () => {
    expect(resultImageSrc({ ...item(), imageUrl: GOOD })).toBe(GOOD);
    expect(resultImageSrc({ ...item(), imageUrl: EVIL })).toBeNull();
  });
});

describe("attachResultImages (scoring firewall)", () => {
  const a = item({ laptopId: "laptop-aaa", scores: { overall: 91, W: 96, C: 88, V: null } });
  const b = item({ laptopId: "laptop-bbb", scores: { overall: 84, W: 88, C: 82, V: 70 } });

  it("attaches validated images; unknown ids and bad URLs become null", () => {
    const out = attachResultImages([a, b], { "laptop-aaa": GOOD, "laptop-bbb": EVIL });
    expect(out[0].imageUrl).toBe(GOOD);
    expect(out[1].imageUrl).toBeNull();
    expect(attachResultImages([a], {})[0].imageUrl).toBeNull();
  });

  it("images NEVER influence scoring: every scoring field is identical before/after", () => {
    const before = [a, b];
    const after = attachResultImages(before, { "laptop-aaa": GOOD, "laptop-bbb": GOOD });
    for (const [i, enriched] of after.entries()) {
      const { imageUrl: _dropped, ...rest } = enriched as unknown as Record<string, unknown>;
      void _dropped;
      expect(rest).toEqual({ ...before[i] });
    }
    // Engine order untouched (sort by overall is stable across enrichment).
    const rank = (xs: { scores: { overall: number } }[]) =>
      [...xs].sort((x, y) => y.scores.overall - x.scores.overall).map(x => x.scores.overall);
    expect(rank(after)).toEqual(rank(before));
  });

  it("enriched items still pass validateV3Results (DTO shape unchanged)", () => {
    const dto = { schemaVersion: "v3", items: attachResultImages([a, b], { "laptop-aaa": GOOD }) };
    expect(validateV3Results(dto)).not.toBeNull();
    expect(validateV3Results({ schemaVersion: "v3", items: [a, b] })).not.toBeNull();
  });
});

describe("fallback + gallery static markup (no DOM needed)", () => {
  it("fallback frame is labeled, aspect-reserved, theme-token styled", async () => {
    const { ProductImageFallback } = await import("@/components/ui/product-image");
    const html = renderToStaticMarkup(
      createElement(ProductImageFallback, { alt: "Acme Ultra 14", width: 200, height: 112 }),
    );
    expect(html).toContain('role="img"');
    expect(html).toContain("Image unavailable for Acme Ultra 14");
    expect(html).toContain("aspect-ratio:200 / 112");
    expect(html).toContain("bg-card");
    expect(html).not.toContain("<img");
  });

  it("compact tiles render icon-only but keep the accessible label", async () => {
    const { ProductImageFallback } = await import("@/components/ui/product-image");
    const html = renderToStaticMarkup(
      createElement(ProductImageFallback, { alt: "Acme Lite 13", width: 96, height: 64 }),
    );
    expect(html).toContain('role="img"');
    expect(html).toContain("Image unavailable for Acme Lite 13");
    expect(html).not.toContain("Image unavailable</span>");
  });

  it("gallery with no valid image renders the honest fallback slot, never thumbnails", async () => {
    const { DetailGallery } = await import("@/components/ui/detail-gallery");
    const html = renderToStaticMarkup(
      createElement(DetailGallery, { images: [], brand: "Acme", model: "Ultra 14" }),
    );
    expect(html).toContain("Image unavailable for Acme Ultra 14");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("thumbnail");
  });

  it("gallery drops invalid URLs and shows a single image with no strip", async () => {
    const { DetailGallery } = await import("@/components/ui/detail-gallery");
    const html = renderToStaticMarkup(
      createElement(DetailGallery, {
        images: [{ src: EVIL }, { src: GOOD }],
        brand: "Acme",
        model: "Ultra 14",
      }),
    );
    // next/image emits the optimizer URL (src URL-encoded) in static markup.
    expect(html).toContain("images.unsplash.com%2Fphoto-1617294864710");
    expect(html).not.toContain("example.com");
    expect(html).not.toContain("of 1");
  });
});
