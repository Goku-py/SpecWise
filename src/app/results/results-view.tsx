"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { BarChart3 } from "lucide-react"
import { fetchRecommendations } from "@/lib/api"
import {
  readValidated,
  validateResultsPayload,
  validateStoredAnswers,
  writeValidated,
} from "@/lib/storage"
import { FScoreMeter } from "@/components/charts/f-score-meter"
import { RadarChart } from "@/components/charts/radar-chart"
import { LaptopResultCard } from "@/components/results/result-card"
import { WeightSlider } from "@/components/ui/weight-slider"
import { buttonVariants } from "@/components/ui/button"
import { weightsForUseCase, rescoreWithOverlay } from "@/lib/decomposition"
import { computeRankedBreakdown, RADAR_DIMS } from "@/lib/view-models"
import type { QuizAnswers, RecommendedLaptop } from "@/lib/types"
import type { DimName } from "@/lib/view-models"

const DIM_LABELS: Record<DimName, string> = {
  cpu: "CPU",
  gpu: "GPU",
  display: "DISPLAY",
  ram: "RAM",
  storage: "STORAGE",
  battery: "BATTERY",
  portability: "PORTABILITY",
  build: "BUILD",
}

export function ResultsView({ initialRegion }: { initialRegion: string }) {
  const router = useRouter()
  const [results, setResults] = useState<RecommendedLaptop[]>([])
  const [loading, setLoading] = useState(true)
  const [answers, setAnswers] = useState<QuizAnswers | null>(null)
  const [compareList, setCompareList] = useState<string[]>([])

  // Default weights from use-case
  const defaultWeights = useMemo(
    () => (answers ? weightsForUseCase(answers.useCase) : weightsForUseCase(null)),
    [answers]
  )
  const [sliderWeights, setSliderWeights] = useState<Record<DimName, number>>(defaultWeights)

  // Load from localStorage + region re-fetch
  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const storedResults = readValidated("specwise-results", validateResultsPayload)
    const storedAnswers = readValidated("specwise-answers", validateStoredAnswers)
    if (!storedResults || !storedAnswers) {
      router.replace("/quiz")
      return
    }
    // Validated payloads (v2 envelope or legacy raw, migrated on read).
    const parsedAnswers: Record<string, unknown> = storedAnswers
    const data: { results: RecommendedLaptop[] } = storedResults
    const qAnswers = parsedAnswers as Partial<QuizAnswers>

    async function resolve() {
      const fresh =
        qAnswers.region !== initialRegion
          ? await fetchRecommendations(
              { ...qAnswers, region: initialRegion } as QuizAnswers,
              controller.signal
            ).catch(() => null)
          : await Promise.resolve(null)
      if (cancelled) return
      if (fresh) {
        writeValidated("specwise-results", fresh)
        writeValidated("specwise-answers", { ...qAnswers, region: initialRegion })
        const nextAnswers = { ...qAnswers, region: initialRegion } as QuizAnswers
        setResults(fresh.results)
        setAnswers(nextAnswers)
        // Sync the sliders to the use-case weights for the resolved answers
        // (this effect's closure predates answers resolving, so derive here)
        setSliderWeights(weightsForUseCase(nextAnswers.useCase))
      } else {
        setResults(data.results || [])
        setAnswers(qAnswers as QuizAnswers)
        setSliderWeights(weightsForUseCase(qAnswers.useCase))
      }
      setLoading(false)
    }
    void resolve()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [initialRegion, router])

  const toggleCompare = useCallback((id: string) => {
    setCompareList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  // What-if overlay: SAME authoritative scorer, caller-supplied weights.
  // Stored matchScore is never overwritten silently — overlay is labeled.
  const adjusted = useMemo(
    () => RADAR_DIMS.some(d => sliderWeights[d] !== defaultWeights[d]),
    [sliderWeights, defaultWeights]
  )
  const rescored = useMemo(() => {
    if (!answers || results.length === 0) return results
    const wTotal = RADAR_DIMS.reduce((s, d) => s + sliderWeights[d], 0)
    if (wTotal === 0 || !adjusted) return results
    return rescoreWithOverlay(results, answers, sliderWeights)
  }, [results, sliderWeights, answers, adjusted])

  // Ranked breakdown for delta panels
  const breakdowns = useMemo(() => {
    if (!answers || rescored.length === 0) return []
    return computeRankedBreakdown(rescored, answers)
  }, [rescored, answers])

  const topBreakdown = breakdowns.length > 0 ? breakdowns[0] : null
  const topLaptop = rescored.length > 0 ? rescored[0] : null

  // Radar data for top match
  const radarDims = useMemo(() => {
    if (!topBreakdown) return []
    return topBreakdown.dimensions.map((d) => ({
      label: DIM_LABELS[d.dim],
      value: d.score,
    }))
  }, [topBreakdown])

  if (loading) return null

  if (rescored.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold text-foreground">No results found</h2>
        <p className="mt-2 text-sm text-muted">
          Try adjusting your criteria or broadening your budget.
        </p>
        <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
          Find Laptops
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push("/quiz")}
          className="mb-4 flex items-center gap-1 text-xs text-muted transition hover:text-foreground font-mono"
        >
          &larr; REFINE ANSWERS
        </button>
        <h1 className="text-2xl font-bold text-foreground">Your Matches</h1>
        <p className="mt-1 text-sm text-muted font-mono">
          {rescored.length} laptop{rescored.length > 1 ? "s" : ""} matched your criteria
        </p>
      </div>

      {/* 25/75 split */}
      <div className="flex gap-8">
        {/* Left panel — weight sliders */}
        <aside className="w-1/4 min-w-[280px] shrink-0">
          <div className="sticky top-20 rounded border border-border bg-card p-4">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
              ADJUST WEIGHTS
            </h3>
            <p className="mb-4 text-[10px] text-muted font-mono">
              {adjusted ? "Adjusted view — not saved" : "Adjust weights to explore trade-offs"}
            </p>
            <div className="space-y-4">
              {RADAR_DIMS.map((dim) => (
                <WeightSlider
                  key={dim}
                  label={DIM_LABELS[dim]}
                  value={sliderWeights[dim]}
                  onChange={(v) =>
                    setSliderWeights((prev) => ({ ...prev, [dim]: v }))
                  }
                />
              ))}
            </div>
            <button
              onClick={() => setSliderWeights(defaultWeights)}
              className="mt-4 w-full rounded border border-border bg-secondary px-3 py-2 text-xs font-medium text-muted hover:text-foreground transition-colors"
            >
              Reset Weights
            </button>
          </div>
        </aside>

        {/* Right panel — workspace */}
        <div className="flex-1 min-w-0">
          {/* Persistent F-score-meter + radar for top match */}
          {topLaptop && (
            <div className="mb-8 flex flex-col items-center gap-6 rounded border border-border bg-card p-6 sm:flex-row sm:items-start sm:justify-center">
              <FScoreMeter score={topLaptop.matchScore} size={132} />
              {radarDims.length > 0 && (
                <RadarChart dims={radarDims} size={300} />
              )}
            </div>
          )}

          {/* Top match card */}
          {topLaptop && topBreakdown && (
            <div className="mb-6">
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">
                BEST MATCH
              </div>
              <LaptopResultCard
                laptop={topLaptop}
                rank={1}
                breakdown={topBreakdown}
                isTop={true}
                compared={compareList.includes(topLaptop.id)}
                onToggleCompare={toggleCompare}
              />
            </div>
          )}

          {/* Alternative recommendations */}
          {rescored.length > 1 && (
            <div>
              <h2 className="mb-4 text-lg font-bold text-foreground">More Options</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {rescored.slice(1).map((laptop, idx) => {
                  const bd = breakdowns.find((b) => b.laptopId === laptop.id)
                  return (
                    <LaptopResultCard
                      key={laptop.id}
                      laptop={laptop}
                      rank={idx + 2}
                      breakdown={bd}
                      isTop={false}
                      compared={compareList.includes(laptop.id)}
                      onToggleCompare={toggleCompare}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare bar */}
      {compareList.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <span className="text-sm text-muted font-mono">
              {compareList.length} laptop{compareList.length > 1 ? "s" : ""} selected
            </span>
            <Link
              href={`/compare?ids=${compareList.join(",")}`}
              className={buttonVariants({ className: "gap-2" })}
            >
              <span className="font-mono text-xs">COMPARE NOW</span>{" "}
              <BarChart3 className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
