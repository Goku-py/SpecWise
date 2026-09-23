import type { WorkloadId } from "@/lib/recommend/v3/types";
import { toIllustrativeMachine, type IllustrativeMachine, type ScorableLaptopWithSlug } from "../illustrative-machine";

/**
 * P0 illustrative picks — curated slug lists per workload, resolved against
 * the live catalog at render time. Pure predicates, no ranking: when a slug
 * is missing from the catalog the slot is filled from the fallback filter
 * in slug-sorted order so every workload always shows 3 machines.
 */

export const WORKLOAD_IDS: readonly WorkloadId[] = [
  "dev",
  "gaming",
  "ai-ml",
  "video-photo",
  "cad-3d",
  "study-office",
] as const;

export const ILLUSTRATIVE_PICKS: Record<WorkloadId, string[]> = {
  dev: [
    "apple-macbook-pro-14-m4-pro-24gb",
    "lenovo-thinkpad-t14s-gen-6",
    "asus-zenbook-14-oled",
  ],
  gaming: [
    "hp-omen-16",
    "asus-rog-zephyrus-g14",
    "lenovo-legion-5-16",
  ],
  "ai-ml": [
    "asus-rog-strix-scar-17",
    "razer-blade-16",
    "samsung-galaxy-book4-ultra",
  ],
  "video-photo": [
    "apple-macbook-pro-16-m4-max",
    "samsung-galaxy-book4-pro-14",
    "asus-zenbook-16-oled",
  ],
  "cad-3d": [
    "lenovo-legion-7i-16",
    "msi-stealth-16-studio",
    "acer-predator-helios-16",
  ],
  "study-office": [
    "apple-macbook-air-m3-13-inch",
    "lenovo-thinkpad-x1-carbon-gen-13",
    "microsoft-surface-pro-11",
  ],
};

type FallbackPredicate = (l: ScorableLaptopWithSlug) => boolean;

/** Null-tolerant: a null spec never disqualifies (null passes). */
export const FALLBACK_FILTERS: Record<WorkloadId, FallbackPredicate> = {
  dev: (l) => l.ramAmount >= 16,
  gaming: (l) => l.gpuType === "dedicated" && l.displayRefreshRate >= 120,
  "ai-ml": (l) => (l.gpuVRAM ?? 8) >= 8 || l.gpuType === "dedicated",
  "video-photo": (l) =>
    /4k|qhd|uhd|2880|3024|3200|3456|3840/i.test(l.displayResolution ?? "") ||
    (l.displayColorGamut != null && l.displayColorGamut.length > 0),
  "cad-3d": (l) => l.gpuType === "dedicated" && l.ramAmount >= 16,
  "study-office": (l) => (l.weight ?? 1.0) <= 1.5 && (l.batteryLife ?? 8) >= 8,
};

function slugOf(l: ScorableLaptopWithSlug): string {
  return l.slug ?? l.id;
}

/**
 * Empty record for safe initial state. Unlike resolving against an empty
 * catalog, this logs no missing-slug warnings (nothing is actually missing —
 * the catalog simply hasn't loaded yet).
 */
export function emptyIllustrativeMachines(): Record<WorkloadId, IllustrativeMachine[]> {
  return {
    dev: [],
    gaming: [],
    "ai-ml": [],
    "video-photo": [],
    "cad-3d": [],
    "study-office": [],
  };
}

/**
 * Resolve illustrative machines per workload: curated slugs in order,
 * missing slugs warn and are backfilled from the fallback filter in
 * slug-sorted order until each workload has 3. Never ranks, never scores.
 */
export function resolveIllustrativeMachines(
  catalog: ScorableLaptopWithSlug[],
  picks: Record<WorkloadId, string[]> = ILLUSTRATIVE_PICKS
): Record<WorkloadId, IllustrativeMachine[]> {
  const bySlug = new Map(catalog.map((l) => [slugOf(l), l]));
  const out = {} as Record<WorkloadId, IllustrativeMachine[]>;
  for (const workloadId of WORKLOAD_IDS) {
    const seen = new Set<string>();
    const resolved: IllustrativeMachine[] = [];
    for (const slug of picks[workloadId] ?? []) {
      const entry = bySlug.get(slug);
      if (entry && !seen.has(slugOf(entry))) {
        seen.add(slugOf(entry));
        resolved.push(toIllustrativeMachine(entry));
      } else if (!entry) {
        console.warn(`[illustrative-picks] missing slug for ${workloadId}: ${slug}`);
      }
    }
    if (resolved.length < 3) {
      const predicate = FALLBACK_FILTERS[workloadId];
      const fallbacks = catalog
        .filter((l) => predicate(l) && !seen.has(slugOf(l)))
        .sort((a, b) => slugOf(a).localeCompare(slugOf(b)));
      for (const entry of fallbacks) {
        if (resolved.length >= 3) break;
        seen.add(slugOf(entry));
        resolved.push(toIllustrativeMachine(entry));
      }
    }
    out[workloadId] = resolved.slice(0, 3);
  }
  return out;
}
