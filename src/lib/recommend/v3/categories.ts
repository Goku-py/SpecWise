/**
 * Category slugs (SEO identity) + their v3 workload mapping.
 * Slugs and labels are preserved byte-identical from the old USE_CASE_LABELS
 * so existing URLs, metadata, and sitemap entries do not change.
 * Ranking for every slug comes from the v3 engine (no second scorer).
 */
import type { CanonicalProfile, WorkloadId } from "./types";

export const CATEGORY_SLUGS = [
  "student",
  "office",
  "coding",
  "gaming",
  "video-editing",
  "graphic-design",
  "travel",
  "general",
  "ai-ml",
  "mixed",
] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const CATEGORY_LABELS: Record<CategorySlug, string> = {
  student: "Study & College",
  office: "Office & Home",
  coding: "Coding & Development",
  gaming: "Gaming",
  "video-editing": "Video Editing",
  "graphic-design": "Graphic Design",
  travel: "Business Travel",
  general: "General Home Use",
  "ai-ml": "AI & ML",
  mixed: "Mixed Use",
};

export function isCategorySlug(s: string): s is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(s);
}

/**
 * Migration mapping slug → v3 workloads. Explicit and documented:
 * slugs that have no 1:1 workload use the closest blend (travel/study are
 * portability-led; graphic-design shares the creator vector with a screen
 * priority; mixed is a study+dev blend).
 */
export function categoryProfile(
  slug: CategorySlug,
  region: string,
  currency: string,
): CanonicalProfile {
  const base = {
    schemaVersion: "v3" as const,
    region,
    currency,
    budget: { min: null, max: null, noMax: true, currency },
    requirements: [],
  };
  const w = (
    id: WorkloadId,
    importance: "primary" | "secondary" = "primary",
    subprofile: "standard" | "heavy" | "esports" | "aaa" | "both" | null = null,
  ) => ({ id, importance, subprofile });
  switch (slug) {
    case "student":
    case "office":
    case "general":
      return { ...base, workloads: [w("study-office")], priorities: [] };
    case "coding":
      return { ...base, workloads: [w("dev", "primary", "standard")], priorities: [] };
    case "gaming":
      return { ...base, workloads: [w("gaming", "primary", "both")], priorities: [] };
    case "video-editing":
      return { ...base, workloads: [w("video-photo")], priorities: [] };
    case "graphic-design":
      return { ...base, workloads: [w("video-photo")], priorities: ["screen"] };
    case "travel":
      return { ...base, workloads: [w("study-office")], priorities: ["carry", "battery"] };
    case "ai-ml":
      return { ...base, workloads: [w("ai-ml")], priorities: [] };
    case "mixed":
      return {
        ...base,
        workloads: [w("study-office"), w("dev", "secondary", "standard")],
        priorities: [],
      };
  }
}
