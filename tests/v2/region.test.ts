import { describe, expect, it } from "vitest"
import { REGION_CODES, isSupportedRegion, normalizeRegion } from "@/lib/regions"

describe("region allowlist", () => {
  it("accepts exactly the six supported regions", () => {
    expect(REGION_CODES).toEqual(["US", "IN", "GB", "DE", "CA", "AU"])
    for (const code of REGION_CODES) {
      expect(isSupportedRegion(code)).toBe(true)
    }
  })

  it("rejects unknown, empty, and non-string regions", () => {
    for (const bad of ["XX", "USA", "", "us ", "U S", 42, null, undefined, {}, []]) {
      expect(isSupportedRegion(bad)).toBe(false)
      expect(normalizeRegion(bad)).toBeNull()
    }
  })

  it("normalizes supported codes to uppercase", () => {
    expect(normalizeRegion("us")).toBe("US")
    expect(normalizeRegion("in")).toBe("IN")
    expect(normalizeRegion("GB")).toBe("GB")
  })
})
