"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { useRegion } from "@/components/region-context"
import { fetchRecommendations } from "@/lib/api"
import { ErrorBoundary } from "@/components/error-boundary"
import { ResultsGrid } from "@/components/results/results-grid"
import { USE_CASE_LABELS } from "@/lib/questions"
import { defaultQuizAnswers, type QuizAnswers, type RecommendedLaptop } from "@/lib/types"

const VALID_USE_CASES = Object.keys(USE_CASE_LABELS)

export default function CategoryPage() {
  const params = useParams<{ useCase: string }>()
  const useCase = typeof params.useCase === "string" ? params.useCase : ""
  const { region } = useRegion()
  const isValid = VALID_USE_CASES.includes(useCase)
  const [results, setResults] = useState<RecommendedLaptop[]>([])
  const [loading, setLoading] = useState(isValid)

  useEffect(() => {
    if (!isValid) return
    const controller = new AbortController()
    const answers: QuizAnswers = {
      ...defaultQuizAnswers,
      useCase: useCase as QuizAnswers["useCase"],
      region: region.code,
    }
    setLoading(true)
    fetchRecommendations(answers, controller.signal)
      .then(r => {
        if (controller.signal.aborted) return
        setResults(r.results)
        setLoading(false)
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setLoading(false)
      })
    return () => controller.abort()
  }, [useCase, region.code, isValid])

  if (!isValid) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold">Category not found</h2>
        <p className="mt-2 text-sm text-muted">We don&apos;t have recommendations for that category yet.</p>
        <Link href="/">
          <button className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
            Back home
          </button>
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Finding laptops for you…
      </div>
    )
  }

  const label = USE_CASE_LABELS[useCase] ?? useCase

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <Link href="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground">
          ← Back home
        </Link>
        <h1 className="text-3xl font-bold">{label}</h1>
        <p className="mt-1 text-sm text-muted">
          Top picks tailored to {label.toLowerCase()} use.
        </p>
      </div>
      <ErrorBoundary>
        <ResultsGrid results={results} />
      </ErrorBoundary>
    </div>
  )
}
