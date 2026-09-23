/**
 * v3 validation — Zod schemas for CanonicalProfile (server-authoritative).
 * Quick and Advanced submit the same shape; skipped = absent/null.
 */
import { z } from "zod";
import { WORKLOAD_IDS } from "./types";

const workloadSelection = z.object({
  id: z.enum(WORKLOAD_IDS),
  importance: z.enum(["primary", "secondary", "occasional"]).default("secondary"),
  subprofile: z.enum(["standard", "heavy", "esports", "aaa", "both"]).nullable().default(null),
});

const requirement = z.object({
  id: z.enum([
    "budget", "os", "ram", "storage", "gpu", "vram", "weight", "battery",
    "refresh", "displaySize", "ports", "upgrade", "refurb", "cpu-cores",
    "os-prefer", "brand-prefer", "upgrade-prefer", "touch-prefer",
    "resolution-prefer", "color-prefer", "oled-prefer",
  ]),
  kind: z.enum(["hard", "target"]),
  targetClass: z.enum(["A", "B"]).optional(),
  min: z.union([z.number(), z.string()]).nullable().optional(),
  target: z.union([z.number(), z.string(), z.boolean()]).nullable().optional(),
  max: z.union([z.number(), z.string()]).nullable().optional(),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
  provenance: z.object({
    source: z.enum(["workload", "quick", "advanced"]),
    workloadId: z.enum(WORKLOAD_IDS).optional(),
    reason: z.string().min(1).max(300),
  }),
  userMust: z.boolean().default(false),
});

export const CanonicalProfileSchema = z.object({
  schemaVersion: z.literal("v3"),
  region: z.string().min(2).max(8).default("US"),
  currency: z.string().min(2).max(8).default("USD"),
  workloads: z.array(workloadSelection).min(1).max(6),
  budget: z.object({
    min: z.number().min(0).max(10_000_000).nullable().default(null),
    max: z.number().min(0).max(10_000_000).nullable().default(null),
    noMax: z.boolean().default(false),
    currency: z.string().min(2).max(8).default("USD"),
  }).refine(
    (b) => b.min == null || b.max == null || b.min <= b.max,
    { message: "budget.min must be ≤ budget.max" },
  ),
  priorities: z.array(z.enum(["speed", "battery", "carry", "screen", "build", "value"])).max(2).default([]),
  requirements: z.array(requirement).max(40).default([]),
});

export type CanonicalProfileInput = z.infer<typeof CanonicalProfileSchema>;
