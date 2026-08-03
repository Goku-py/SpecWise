import type { Metadata } from "next"
import dynamic from "next/dynamic"
import { getRegionFromCookies } from "@/lib/region"

export const metadata: Metadata = {
  title: "Laptop Quiz — Find the Right Laptop | SpecWise",
  description:
    "Answer a few quick questions about your budget, workload, and preferences to get personalized laptop recommendations.",
}

const QuizFlow = dynamic(
  () => import("@/components/quiz/quiz-flow").then(m => m.QuizFlow),
  {
    loading: QuizFlowLoading,
  }
)

function QuizFlowLoading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <div className="h-3 w-24 animate-pulse rounded bg-card-hover" />
          <div className="h-3 w-16 animate-pulse rounded bg-card-hover" />
        </div>
        <div className="h-2 w-full animate-pulse rounded bg-card-hover" />
      </div>
      <div className="space-y-6">
        <div className="h-8 w-2/3 animate-pulse rounded bg-card-hover" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-card-hover" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function QuizPage() {
  const region = await getRegionFromCookies()
  return <QuizFlow region={region} />
}
