"use client"

import React, { useState, useCallback, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, ArrowRight, Monitor, Zap, Cpu, Smartphone,
  Gamepad2,
  Code, Palette, Video, GraduationCap, Briefcase, Home, Brain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import {
  simpleQuestions,
  advancedQuestions,
} from "@/lib/questions"
import type { QuizAnswers, QuestionMode } from "@/lib/types"
import { defaultQuizAnswers } from "@/lib/types"
import { fetchRecommendations } from "@/lib/api"
import { useRegion } from "@/components/region-context"
import { usdToLocal } from "@/lib/regions"
import { formatPrice } from "@/lib/utils"
import { RangeSlider } from "@/components/ui/range-slider"

const useCaseIconMap: Record<string, React.ElementType> = {
  student: GraduationCap,
  office: Briefcase,
  coding: Code,
  gaming: Gamepad2,
  "video-editing": Video,
  "graphic-design": Palette,
  travel: Smartphone,
  general: Home,
  "ai-ml": Brain,
  mixed: Zap,
}

const ANSWERS_KEY = "specwise-quiz-answers"
const STEP_KEY = "specwise-quiz-step"

function isAnswerEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true
  if (Array.isArray(value) && value.length === 0) return true
  return false
}

export function QuizFlow() {
  const router = useRouter()
  const { region } = useRegion()
  const [mode, setMode] = useState<QuestionMode | null>(null)
  const [step, setStep] = useState(() => {
    if (typeof window === "undefined") return 0
    try {
      const saved = localStorage.getItem(STEP_KEY)
      return saved ? Number(saved) : 0
    } catch {
      return 0
    }
  })
  const [answers, setAnswers] = useState<QuizAnswers>(() => {
    if (typeof window === "undefined") return { ...defaultQuizAnswers }
    try {
      const saved = localStorage.getItem(ANSWERS_KEY)
      return saved ? { ...defaultQuizAnswers, ...JSON.parse(saved) } : { ...defaultQuizAnswers }
    } catch {
      return { ...defaultQuizAnswers }
    }
  })
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  // Persist progress whenever answers or step change
  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(ANSWERS_KEY, JSON.stringify(answers))
  }, [answers])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(STEP_KEY, String(step))
  }, [step])

  const allQuestions = useMemo(() => {
    if (!mode) return []
    const base = mode === "simple" ? simpleQuestions : [...simpleQuestions, ...advancedQuestions]
    return base.filter(q => q.mode === "both" || q.mode === mode)
  }, [mode])

  const totalQuestions = allQuestions.length

  const currentQuestion = allQuestions[step] ?? null

  const progress = totalQuestions > 0 ? ((step) / totalQuestions) * 100 : 0

  const updateAnswer = useCallback((key: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleArrayAnswer = useCallback((key: string, value: string) => {
    setAnswers(prev => {
      const arr = (prev[key as keyof QuizAnswers] as string[]) || []
      return {
        ...prev,
        [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value],
      }
    })
  }, [])

  const isCurrentAnswerEmpty = useMemo(() => {
    if (!currentQuestion) return false
    if (currentQuestion.key === "budget") {
      return answers.budgetMin == null || answers.budgetMax == null
    }
    const value = answers[currentQuestion.key as keyof QuizAnswers]
    return isAnswerEmpty(value)
  }, [currentQuestion, answers])

  const handleNext = useCallback(() => {
    if (step < totalQuestions - 1) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [step, totalQuestions])

  const handleBack = useCallback(() => {
    if (step > 0) setStep(s => s - 1)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [step])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    setSubmitError("")
    try {
      const quizRegion = region.code
      const body = { ...answers, region: quizRegion, email: email.trim() }
      const data = await fetchRecommendations(body as QuizAnswers)
      localStorage.setItem("specwise-results", JSON.stringify(data))
      localStorage.setItem("specwise-answers", JSON.stringify({ ...answers, region: quizRegion }))
      localStorage.removeItem(ANSWERS_KEY)
      localStorage.removeItem(STEP_KEY)
      router.push("/results")
    } catch (err) {
      console.error("Quiz submit error:", err)
      setSubmitError("Something went wrong. Please check your connection and try again.")
      setSubmitting(false)
    }
  }, [answers, email, router, region.code])

  if (!mode) {
    return <ModeSelector onSelect={setMode} />
  }

  if (!currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted">All done! Getting your recommendations...</p>
      </div>
    )
  }

  const isLast = step >= totalQuestions - 1
  const currentValue = answers[currentQuestion.key as keyof QuizAnswers]

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between text-xs text-muted">
          <span>Step {step + 1} of {totalQuestions}</span>
          <span className={cn(mode === "simple" ? "text-accent" : "text-blue-500")}>
            {mode === "simple" ? "Quick mode" : "Advanced mode"}
          </span>
        </div>
        <Progress value={progress} />
      </div>

      <div key={step} className="animate-fade-in">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted">
          {answers.useCase ? (() => {
            const Icon = useCaseIconMap[answers.useCase!]
            return Icon ? (
              <span className="flex items-center gap-1">
                <Icon className="h-3 w-3" />
                <span>{answers.useCase!.replace("-", " ")}</span>
                <span className="mx-1">•</span>
              </span>
            ) : null
          })() : null}
          {currentQuestion.required && <span className="text-red-500">Required</span>}
        </div>

        <h2 className="mb-1 text-2xl font-semibold tracking-tight">
          {currentQuestion.question}
        </h2>
        {currentQuestion.description && (
          <p className="mb-6 text-sm leading-relaxed text-muted">
            {currentQuestion.description}
          </p>
        )}
        {currentQuestion.max && (
          <p className="mb-4 text-xs text-muted">
            Select up to {currentQuestion.max}
            {currentQuestion.type === "multiple" && currentValue && Array.isArray(currentValue)
              ? ` (${currentValue.length}/${currentQuestion.max} selected)`
              : ""}
          </p>
        )}

        {currentQuestion.key === "budget" ? (
          <div className="mt-6">
            <RangeSlider
              min={0}
              max={usdToLocal(3000, region.code)}
              step={usdToLocal(50, region.code)}
              valueMin={answers.budgetMin ?? 0}
              valueMax={answers.budgetMax ?? usdToLocal(3000, region.code)}
              onChange={(min, max) => {
                updateAnswer("budgetMin", min)
                updateAnswer("budgetMax", max)
              }}
              formatLabel={v => formatPrice(v, region.currency)}
            />
          </div>
        ) : (
        <div className={cn(
          "mt-6 space-y-2",
          currentQuestion.type === "multiple" && "grid grid-cols-2 gap-2 sm:grid-cols-3"
        )}>
          {currentQuestion.options?.map(opt => {
            const isSelected = currentQuestion.type === "boolean"
              ? currentValue === (opt.value === "true")
              : currentQuestion.type === "multiple"
                ? (currentValue as string[] | undefined)?.includes(opt.value)
                : currentValue === opt.value

            return (
              <button
                key={opt.value}
                onClick={() => {
                  if (currentQuestion.type === "multiple") {
                    if (isSelected) {
                      toggleArrayAnswer(currentQuestion.key, opt.value)
                    } else if (
                      !currentQuestion.max ||
                      ((currentValue as string[] | undefined)?.length ?? 0) < currentQuestion.max
                    ) {
                      toggleArrayAnswer(currentQuestion.key, opt.value)
                    }
                  } else if (currentQuestion.type === "boolean") {
                    updateAnswer(currentQuestion.key, opt.value === "true")
                  } else {
                    updateAnswer(currentQuestion.key, opt.value)
                  }
                }}
                className={cn(
                  "w-full rounded-xl border px-4 py-3.5 text-left transition-all duration-150",
                  isSelected
                    ? "border-accent/50 bg-accent/10 text-foreground"
                    : currentQuestion.max && currentValue && Array.isArray(currentValue) && currentValue.length >= currentQuestion.max
                      ? "border-border bg-card/50 text-muted opacity-50"
                      : "border-border bg-card/50 text-muted hover:border-border hover:bg-card",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm font-medium",
                    isSelected && "text-accent"
                  )}>
                    {opt.label}
                  </span>
                  {isSelected && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs text-white">
                      ✓
                    </span>
                  )}
                </div>
                {opt.description && (
                  <p className="mt-0.5 text-xs text-muted">{opt.description}</p>
                )}
              </button>
            )
          })}
        </div>
      )}
      </div>

      {isLast && (
        <div className="mt-8 rounded-xl border border-border bg-card/50 p-4">
          <label className="text-sm font-medium text-foreground">
            Get these results by email <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:border-accent/50"
          />
        </div>
      )}

      {submitError && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {submitError}
        </div>
      )}

      <div className="mt-8 flex items-center justify-between">
        <div>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!currentQuestion.required && !isLast && (
            <Button variant="ghost" size="sm" onClick={handleNext}>
              Skip
            </Button>
          )}
          {isLast ? (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || isCurrentAnswerEmpty}
              className="gap-2"
            >
              {submitting ? "Finding matches..." : "See My Matches"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleNext}
              disabled={isCurrentAnswerEmpty}
              className="gap-2"
            >
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ModeSelector({ onSelect }: { onSelect: (mode: QuestionMode) => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:py-20">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted">
        <Monitor className="h-3.5 w-3.5 text-accent" />
        Let&apos;s find your laptop
      </div>
      <h1 className="mb-2 text-3xl font-bold">How experienced are you with laptops?</h1>
      <p className="mb-8 text-sm leading-relaxed text-muted">
        We&apos;ll tailor the questions to match your comfort level.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={() => onSelect("simple")}
          className="group rounded-xl border border-border bg-card/50 p-6 text-left transition hover:border-accent/30 hover:bg-card"
        >
          <Zap className="mb-3 h-6 w-6 text-accent" />
          <h3 className="font-semibold text-foreground">Quick & Simple</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Just a few essential questions. No technical specs needed — we handle the details.
          </p>
        </button>
        <button
          onClick={() => onSelect("advanced")}
          className="group rounded-xl border border-border bg-card/50 p-6 text-left transition hover:border-blue-500/30 hover:bg-card"
        >
          <Cpu className="mb-3 h-6 w-6 text-blue-500" />
          <h3 className="font-semibold text-foreground">Advanced</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Full control over CPU, GPU, RAM, display, ports, security, and more.
          </p>
        </button>
      </div>
    </div>
  )
}

