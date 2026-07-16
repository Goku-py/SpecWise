import type { QuizAnswers, RecommendedLaptop } from "./types"

export interface RecommendationsResponse {
  results: RecommendedLaptop[]
  total: number
}

export async function fetchRecommendations(
  answers: QuizAnswers,
  signal?: AbortSignal
): Promise<RecommendationsResponse> {
  const res = await fetch("/api/quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answers),
    signal,
  })
  if (!res.ok) throw new Error("Failed to get recommendations")
  return res.json()
}
