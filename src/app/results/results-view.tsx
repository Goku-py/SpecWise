"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchRecommendations } from "@/lib/api"
import { ErrorBoundary } from "@/components/error-boundary"
import { ResultsGrid } from "@/components/results/results-grid"
import type { QuizAnswers, RecommendedLaptop } from "@/lib/types"

export function ResultsView({ initialRegion }: { initialRegion: string }) {
  const router = useRouter()
  const [results, setResults] = useState<RecommendedLaptop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const storedResults = localStorage.getItem("specwise-results")
    const storedAnswers = localStorage.getItem("specwise-answers")
    if (!storedResults || !storedAnswers) {
      router.replace("/quiz")
      return
    }
    let answers: Record<string, unknown>
    let data: { results: RecommendedLaptop[] }
    try {
      answers = JSON.parse(storedAnswers) as Record<string, unknown>
      data = JSON.parse(storedResults) as { results: RecommendedLaptop[] }
    } catch {
      router.replace("/quiz")
      return
    }
    const qAnswers = answers as Partial<QuizAnswers>

    async function resolve() {
      // Re-fetch when the active region differs from the one used to generate
      // results, so prices/currency always reflect the user's selected region.
      // (All state writes happen after an await — never synchronously — so the
      // hydration render stays stable.)
      const fresh = qAnswers.region !== initialRegion
        ? await fetchRecommendations({ ...qAnswers, region: initialRegion } as QuizAnswers, controller.signal).catch(() => null)
        : await Promise.resolve(null)
      if (cancelled) return
      if (fresh) {
        localStorage.setItem("specwise-results", JSON.stringify(fresh))
        localStorage.setItem("specwise-answers", JSON.stringify({ ...qAnswers, region: initialRegion }))
        setResults(fresh.results)
      } else {
        setResults(data.results || [])
      }
      setLoading(false)
    }
    void resolve()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [initialRegion, router])

  if (loading) return null

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <button
          onClick={() => router.push("/quiz")}
          className="mb-4 flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
        >
          ← Refine answers
        </button>
        <h1 className="text-3xl font-bold">Your Matches</h1>
        <p className="mt-1 text-sm text-muted">
          {results.length > 0
            ? `${results.length} laptop${results.length > 1 ? "s" : ""} matched your criteria`
            : "Based on your answers, here are the best laptops for you."}
        </p>
      </div>
      <ErrorBoundary>
        <ResultsGrid results={results} />
      </ErrorBoundary>
    </div>
  )
}
