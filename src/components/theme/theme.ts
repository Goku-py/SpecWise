/**
 * Theme preference logic (pure, unit-tested).
 *
 * Contract:
 * - Stored values: "light" | "dark" | "system". Anything else (missing,
 *   corrupt, legacy) reads as "system".
 * - Effective theme: explicit light/dark wins; "system" follows the OS
 *   `prefers-color-scheme` signal passed in by the caller.
 * - Persistence uses a single plain `specwise-theme` localStorage string.
 *   The v2 envelope in `src/lib/storage.ts` is deliberately NOT used here:
 *   a 1-string UI preference needs no versioning/migration machinery, and
 *   the theme module must stay dependency-free so the no-flash inline script
 *   can mirror this logic byte-for-byte without imports.
 */

export const THEME_STORAGE_KEY = "specwise-theme" as const

export type ThemeChoice = "light" | "dark" | "system"
export type EffectiveTheme = "light" | "dark"

const CHOICES: readonly ThemeChoice[] = ["light", "dark", "system"]

export function parseStoredTheme(raw: string | null | undefined): ThemeChoice {
  if (raw != null && (CHOICES as readonly string[]).includes(raw)) {
    return raw as ThemeChoice
  }
  return "system"
}

export function resolveEffectiveTheme(stored: ThemeChoice, systemDark: boolean): EffectiveTheme {
  if (stored === "light") return "light"
  if (stored === "dark") return "dark"
  return systemDark ? "dark" : "light"
}

/** Attribute value applied to <html data-theme="…">. Dark is the default (no attribute). */
export function themeAttribute(effective: EffectiveTheme): string | null {
  return effective === "light" ? "light" : null
}

/**
 * No-flash inline script (stringified into layout). Mirrors parse + resolve
 * above with zero imports: reads localStorage, falls back to matchMedia,
 * sets documentElement.dataset.theme pre-paint. Wrapped in try/catch so
 * private-mode / disabled storage never breaks the page — default (dark)
 * posture is the sane fallback.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=null;try{s=window.localStorage.getItem(k)}catch(e){}var c=(s==="light"||s==="dark"||s==="system")?s:"system";var d=c;if(c==="system"){try{d=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){d="dark"}}if(d==="light"){document.documentElement.setAttribute("data-theme","light")}else{document.documentElement.removeAttribute("data-theme")}}catch(e){}})();`
