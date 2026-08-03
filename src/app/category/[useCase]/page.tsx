import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { ResultsGrid } from "@/components/results/results-grid"
import { getActiveCatalog, toScorable } from "@/lib/catalog-cache"
import { USE_CASE_LABELS } from "@/lib/questions"
import { getRegionFromCookies } from "@/lib/region"
import { scoreLaptops } from "@/lib/scoring"
import { defaultQuizAnswers, type QuizAnswers, type UseCase } from "@/lib/types"

// Force dynamic: reads the region cookie for scoring and pricing.
export const dynamic = "force-dynamic"

type CategoryPageProps = { params: Promise<{ useCase: string }> }

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { useCase } = await params
  if (!Object.hasOwn(USE_CASE_LABELS, useCase)) return { title: "Category not found" }
  const label = USE_CASE_LABELS[useCase]
  return {
    title: `Best ${label} Laptops — SpecWise`,
    description: `Top ${label.toLowerCase()} laptops ranked by our spec-matching engine. Compare specs and regional prices.`,
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { useCase } = await params
  // Valid slugs are the USE_CASE_LABELS keys (e.g. "coding"); "developer" is not.
  if (!Object.hasOwn(USE_CASE_LABELS, useCase)) notFound()

  // Same data pipeline as POST /api/quiz so recommendations are identical:
  // catalog → scorable → scoreLaptops with default answers + use case.
  const region = await getRegionFromCookies()
  const rawCatalog = await getActiveCatalog(region.code)
  const scorable = rawCatalog.map(l => toScorable(l, region.code))
  const answers: QuizAnswers = { ...defaultQuizAnswers, useCase: useCase as UseCase, region: region.code }
  const results = scoreLaptops(scorable, answers)

  const label = USE_CASE_LABELS[useCase]

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
