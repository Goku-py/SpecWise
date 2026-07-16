"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useRegion } from "@/components/region-context"
import { fetchRecommendations } from "@/lib/api"
import { ErrorBoundary } from "@/components/error-boundary"
import { ResultsGrid } from "@/components/results/results-grid"
import type { QuizAnswers, RecommendedLaptop } from "@/lib/types"

export default function ResultsPage() {
  const router = useRouter()
  const { region } = useRegion()
  const [results, setResults] = useState<RecommendedLaptop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedResults = localStorage.getItem("specwise-results")
    const storedAnswers = localStorage.getItem("specwise-answers")
    if (!storedResults || !storedAnswers) {
      router.replace("/quiz")
      return
    }
    let answers: Record<string, unknown>
    let data: { results: RecommendedLaptop[] }
    try {
      answers = JSON.parse(storedAnswers)
      data = JSON.parse(storedResults)
    } catch {
      router.replace("/quiz")
      return
    }
    const qAnswers = answers as Partial<QuizAnswers>

    // Re-fetch when the active region differs from the one used to generate results,
    // so prices/currency always reflect the user's selected region.
    if (qAnswers.region !== region.code) {
      const controller = new AbortController()
      fetchRecommendations({ ...qAnswers, region: region.code } as QuizAnswers, controller.signal)
        .then(r => {
          if (controller.signal.aborted) return
          localStorage.setItem("specwise-results", JSON.stringify(r))
          localStorage.setItem("specwise-answers", JSON.stringify({ ...qAnswers, region: region.code }))
          setResults(r.results)
          setLoading(false)
        })
        .catch(() => {
          if (controller.signal.aborted) return
          setResults(data.results || [])
          setLoading(false)
        })
      return () => controller.abort()
    } else {
      setResults(data.results || [])
      setLoading(false)
    }
  }, [region.code, router])

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
