import type { WorkloadId } from "@/lib/recommend/v3/types";

/**
 * P1 procedural-storytelling vocab. Pure data, no rendering imports.
 * Descriptive only: which physical parts light up per workload, plus one
 * plain-language line per part. No figures, no ranking, no matching.
 */

export const PART_IDS = [
  "cpu",
  "gpu",
  "vram",
  "ram",
  "storage",
  "display",
  "battery",
  "chassis",
] as const;

export type PartId = (typeof PART_IDS)[number];

export interface WorkloadHighlight {
  label: string;
  blurb: string;
  parts: readonly PartId[];
}

export const WORKLOAD_HIGHLIGHTS: Record<WorkloadId, WorkloadHighlight> = {
  dev: {
    label: "Development",
    blurb: "Compiles, containers, and long multitasking sessions.",
    parts: ["cpu", "ram", "display"],
  },
  gaming: {
    label: "Gaming",
    blurb: "Fluid frames, rich scenes, and high refresh panels.",
    parts: ["gpu", "vram", "display"],
  },
  "ai-ml": {
    label: "AI & ML",
    blurb: "Local models and sustained compute sessions.",
    parts: ["gpu", "vram", "ram"],
  },
  "video-photo": {
    label: "Video & Photo",
    blurb: "Timelines, grades, and color-critical finishing.",
    parts: ["display", "gpu", "cpu", "storage"],
  },
  "cad-3d": {
    label: "CAD & 3D",
    blurb: "Large assemblies and viewport-heavy modelling.",
    parts: ["gpu", "cpu", "ram"],
  },
  "study-office": {
    label: "Study & Office",
    blurb: "Light carry and quiet all-day portability.",
    parts: ["battery", "chassis", "display"],
  },
};

export const HARDWARE_VOCAB: Record<PartId, { label: string; line: string }> = {
  cpu: { label: "Processor", line: "Processor — how fast compiles and renders run." },
  gpu: { label: "Graphics", line: "Graphics — how smoothly games and viewports play." },
  vram: { label: "Video memory", line: "Video memory — how large a scene or model fits on the card." },
  ram: { label: "Memory", line: "Memory — how many apps and tabs stay smooth at once." },
  storage: { label: "Storage", line: "Storage — how quickly projects open and how much fits." },
  display: { label: "Display", line: "Display — how sharp text looks and how true colors read." },
  battery: { label: "Battery", line: "Battery — how long real work lasts away from the plug." },
  chassis: { label: "Chassis", line: "Chassis — how the weight and build feel in daily carry." },
};
