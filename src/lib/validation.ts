import { z } from "zod"

const useCases = [
  "student",
  "office",
  "coding",
  "gaming",
  "video-editing",
  "graphic-design",
  "travel",
  "general",
  "ai-ml",
  "mixed",
] as const

const osOptions = [
  "windows",
  "macos",
  "chromeos",
  "linux",
  "no-preference",
] as const

const cpuBrandOptions = ["intel", "amd", "apple", "no-preference"] as const
const gpuOptions = ["integrated", "dedicated", "maybe"] as const
const batteryOptions = ["low", "medium", "high", "top"] as const
const portabilityOptions = ["light", "balanced", "desktop-replacement"] as const
const displaySizeOptions = ["13-14", "15-16", "17+", "no-preference"] as const
const displayQualityOptions = [
  "basic",
  "bright",
  "color-accurate",
  "oled",
  "high-refresh",
  "touch",
] as const
const gamingOptions = ["none", "casual", "esports", "aaa"] as const
const upgradeOptions = ["must-have", "nice-to-have", "not-important"] as const
const importanceOptions = ["not-important", "nice-to-have", "very-important"] as const

function stringEnum<T extends string>(values: readonly T[]) {
  return z.enum(values as [T, ...T[]])
}

function nullableStringEnum<T extends string>(values: readonly T[]) {
  return z.preprocess(
    val => (val === "" || val === undefined || val === null ? null : val),
    z.enum(values as [T, ...T[]]).nullable().default(null)
  )
}

function nullableNumber() {
  return z.preprocess(
    val => {
      if (val === "" || val === undefined || val === null) return null
      const n = Number(val)
      return Number.isNaN(n) ? val : n
    },
    z.number().min(0).max(10_000_000).nullable().default(null)
  )
}

function nullableBoolean() {
  return z.preprocess(
    val => {
      if (val === "true") return true
      if (val === "false") return false
      return val
    },
    z.boolean().nullable().default(null)
  )
}

export const QuizAnswersSchema = z.object({
  region: z.string().default("US"),

  // Required
  useCase: stringEnum(useCases),
  budgetMin: nullableNumber(),
  budgetMax: nullableNumber(),

  // Optional scalars
  os: nullableStringEnum(osOptions),
  cpuBrand: nullableStringEnum(cpuBrandOptions),
  minRam: nullableNumber(),
  minStorage: nullableNumber(),
  gpu: nullableStringEnum(gpuOptions),
  battery: nullableStringEnum(batteryOptions),
  portability: nullableStringEnum(portabilityOptions),
  displaySize: nullableStringEnum(displaySizeOptions),
  displayQuality: z.array(z.enum(displayQualityOptions)).max(3).default([]),
  gaming: nullableStringEnum(gamingOptions),
  upgradeability: nullableStringEnum(upgradeOptions),
  buildQuality: nullableStringEnum(importanceOptions),
  ports: z.array(z.string()).max(6).default([]),
  webcam: nullableStringEnum(importanceOptions),
  security: z.array(z.string()).max(5).default([]),
  refurbished: nullableBoolean(),

  // Email is sent alongside answers but is not part of QuizAnswers
  email: z.preprocess(
    val => (typeof val === "string" ? val.trim() : val),
    z.union([z.literal(""), z.string().email().max(254)]).optional()
  ),
})

export type QuizRequest = z.infer<typeof QuizAnswersSchema>
