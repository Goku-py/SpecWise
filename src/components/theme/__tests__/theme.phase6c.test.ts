import { describe, expect, it } from "vitest"
import {
  NO_FLASH_SCRIPT,
  THEME_STORAGE_KEY,
  parseStoredTheme,
  resolveEffectiveTheme,
  themeAttribute,
} from "@/components/theme/theme"
import { heroCatalogNote } from "@/components/landing/lib/catalog-note"

describe("parseStoredTheme", () => {
  it("accepts the three known choices", () => {
    expect(parseStoredTheme("light")).toBe("light")
    expect(parseStoredTheme("dark")).toBe("dark")
    expect(parseStoredTheme("system")).toBe("system")
  })

  it("falls back to system for missing/corrupt/legacy values", () => {
    expect(parseStoredTheme(null)).toBe("system")
    expect(parseStoredTheme(undefined)).toBe("system")
    expect(parseStoredTheme("")).toBe("system")
    expect(parseStoredTheme("DARK")).toBe("system")
    expect(parseStoredTheme("true")).toBe("system")
    expect(parseStoredTheme("night-mode")).toBe("system")
  })
})

describe("resolveEffectiveTheme", () => {
  it("explicit choice overrides the OS signal", () => {
    expect(resolveEffectiveTheme("light", true)).toBe("light")
    expect(resolveEffectiveTheme("light", false)).toBe("light")
    expect(resolveEffectiveTheme("dark", true)).toBe("dark")
    expect(resolveEffectiveTheme("dark", false)).toBe("dark")
  })

  it("system follows the OS preference", () => {
    expect(resolveEffectiveTheme("system", true)).toBe("dark")
    expect(resolveEffectiveTheme("system", false)).toBe("light")
  })
})

describe("themeAttribute", () => {
  it("marks light explicitly; dark is the default (no attribute)", () => {
    expect(themeAttribute("light")).toBe("light")
    expect(themeAttribute("dark")).toBeNull()
  })
})

describe("NO_FLASH_SCRIPT", () => {
  it("reads the same storage key and sets data-theme pre-paint", () => {
    expect(THEME_STORAGE_KEY).toBe("specwise-theme")
    expect(NO_FLASH_SCRIPT).toContain(THEME_STORAGE_KEY)
    expect(NO_FLASH_SCRIPT).toContain("prefers-color-scheme")
    expect(NO_FLASH_SCRIPT).toContain('data-theme')
    // Self-contained: no imports, guarded storage access.
    expect(NO_FLASH_SCRIPT).not.toMatch(/\bimport\b|\brequire\b/)
    expect(NO_FLASH_SCRIPT).toContain("try")
  })
})

describe("heroCatalogNote", () => {
  it("shows the live count when the catalog answers", () => {
    expect(heroCatalogNote(56)).toMatch(/56/)
    expect(heroCatalogNote(56)).toMatch(/live catalog/i)
  })

  it("shows an honest syncing state instead of a fake zero", () => {
    expect(heroCatalogNote(0)).toMatch(/syncing/i)
    expect(heroCatalogNote(0)).not.toMatch(/0 machines/)
    expect(heroCatalogNote(NaN)).toMatch(/syncing/i)
  })
})
