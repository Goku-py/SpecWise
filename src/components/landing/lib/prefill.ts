import type { CanonicalProfile, WorkloadId } from "@/lib/recommend/v3/types";
import { CanonicalProfileSchema } from "@/lib/recommend/v3/validate";
import { buildV3SharePath } from "@/lib/share";

/** Display labels for workload prefill links (P0 static cards). */
export const WORKLOAD_PREFILL_META: Record<WorkloadId, { label: string; blurb: string }> = {
  dev: { label: "Development", blurb: "RAM-heavy multitasking, containers, and long compile sessions." },
  gaming: { label: "Gaming", blurb: "Discrete GPU, high refresh panels, and thermal headroom." },
  "ai-ml": { label: "AI & ML", blurb: "VRAM capacity and sustained compute for local models." },
  "video-photo": { label: "Video & Photo", blurb: "Color-accurate high-resolution displays and fast storage." },
  "cad-3d": { label: "CAD & 3D", blurb: "Certified-class GPUs and memory for large assemblies." },
  "study-office": { label: "Study & Office", blurb: "Light carry, all-day battery, and quiet keyboards." },
};

/**
 * Build a prefilled quiz share path for a workload. Constructs a minimal
 * CanonicalProfile (single primary workload, open budget), validates it
 * with the shared schema, and encodes it via the share helper.
 * Validation/encoding only — no ranking or matching involved.
 */
export function buildWorkloadPrefillPath(
  workloadId: WorkloadId,
  region: string,
  currency: string
): string {
  const profile: CanonicalProfile = {
    schemaVersion: "v3",
    region,
    currency,
    workloads: [
      {
        id: workloadId,
        importance: "primary",
        subprofile: workloadId === "dev" ? "standard" : workloadId === "gaming" ? "both" : null,
      },
    ],
    budget: { min: null, max: null, noMax: true, currency },
    priorities: [],
    requirements: [],
  };
  const parsed = CanonicalProfileSchema.safeParse(profile);
  if (!parsed.success) {
    throw new Error(`Invalid prefill profile for ${workloadId}: ${parsed.error.message}`);
  }
  return buildV3SharePath(parsed.data);
}
