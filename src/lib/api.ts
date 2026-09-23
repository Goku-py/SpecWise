import type { CanonicalProfile, RecommendationDTO } from "./recommend/v3/types"

/** v3 single-path client: posts the canonical profile, returns the authoritative DTO. */
export async function fetchV3Recommendations(
  profile: CanonicalProfile,
  signal?: AbortSignal
): Promise<RecommendationDTO> {
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schemaVersion: "v3", profile }),
    signal,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Failed to get recommendations");
  }
  return res.json();
}
