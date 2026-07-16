import type { QuizAnswers, RecommendedLaptop, ScorableLaptop } from "./types"

// ── Per-dimension quality scores (reused from original) ──

function gpuScore(laptop: ScorableLaptop): number {
  if (laptop.gpuType === "dedicated") {
    const vram = laptop.gpuVRAM || 4
    return Math.min(1, 0.6 + vram / 32)
  }
  return 0.3
}

function cpuScore(laptop: ScorableLaptop): number {
  const cores = laptop.cpuCores || 4
  return Math.min(1, 0.4 + cores / 24)
}

function ramScore(laptop: ScorableLaptop): number {
  if (laptop.ramAmount >= 32) return 1.0
  if (laptop.ramAmount >= 16) return 0.85
  if (laptop.ramAmount >= 8) return 0.6
  return 0.3
}

function storageScore(laptop: ScorableLaptop): number {
  if (laptop.storageAmount >= 1024) return 1.0
  if (laptop.storageAmount >= 512) return 0.85
  if (laptop.storageAmount >= 256) return 0.6
  return 0.4
}

function batteryScore(laptop: ScorableLaptop, priority: string): number {
  if (priority === "low" || priority === "medium") return laptop.batteryLife ? 0.7 : 0.5
  if (priority === "high") return laptop.batteryLife && laptop.batteryLife >= 8 ? 1.0 : 0.3
  if (priority === "top") return laptop.batteryLife && laptop.batteryLife >= 10 ? 1.0 : 0.1
  return 0.5
}

function portabilityScore(laptop: ScorableLaptop, preference: string): number {
  if (!laptop.weight) return 0.5
  if (preference === "light") return laptop.weight <= 1.5 ? 1.0 : laptop.weight <= 1.8 ? 0.6 : 0.2
  if (preference === "balanced") return laptop.weight >= 1.5 && laptop.weight <= 2.2 ? 1.0 : 0.5
  if (preference === "desktop-replacement") return laptop.weight >= 2.5 ? 1.0 : 0.5
  return 0.5
}

function displayScore(laptop: ScorableLaptop, qualityPref: string | string[] | null): number {
  if (Array.isArray(qualityPref)) {
    if (qualityPref.length === 0) return 1.0
    return Math.max(...qualityPref.map(q => displayScore(laptop, q)))
  }
  if (!qualityPref || qualityPref === "basic") return 1.0
  if (qualityPref === "bright") return laptop.displayBrightness && laptop.displayBrightness >= 400 ? 1.0 : 0.5
  if (qualityPref === "color-accurate") return (laptop.displayColorGamut?.includes("P3") || laptop.displayColorGamut?.includes("100%")) ? 1.0 : 0.4
  if (qualityPref === "oled") return laptop.displayPanelType?.toLowerCase() === "oled" ? 1.0 : 0.2
  if (qualityPref === "high-refresh") return laptop.displayRefreshRate >= 120 ? 1.0 : laptop.displayRefreshRate >= 90 ? 0.7 : 0.3
  if (qualityPref === "touch") return laptop.isTouchscreen ? 1.0 : 0.2
  return 0.5
}

function osScore(laptop: ScorableLaptop, osPref: string): number {
  if (!osPref || osPref === "no-preference") return 1.0
  const laptopOs = laptop.os.toLowerCase()
  if (osPref === "linux") return (laptopOs === "linux" || laptopOs === "windows") ? 1.0 : 0.3
  const pref = osPref.toLowerCase()
  if (pref === "macos") return laptopOs === "macos" ? 1.0 : 0.0
  if (laptopOs === pref) return 1.0
  return 0.0
}

function portsScore(laptop: ScorableLaptop, requiredPorts: string[]): number {
  if (!requiredPorts.length) return 1.0
  const laptopPorts = laptop.ports.map(p => p.toLowerCase())
  const missing = requiredPorts.filter(p => !laptopPorts.includes(p.toLowerCase()))
  if (missing.length === 0) return 1.0
  if (missing.length <= 1) return 0.5
  return 0.0
}

// ── Per-use-case feature priorities (F-score weights) ──
// ponytail: flat list of dimension weights per use case, ordered by importance
const PRIORITIES: Record<string, Record<string, number>> = {
  student:     { budget: 0.25, battery: 0.18, portability: 0.15, cpu: 0.10, ram: 0.10, storage: 0.08, display: 0.05, gpu: 0.02, upgradeability: 0.02, build: 0.05 },
  office:      { budget: 0.25, battery: 0.18, portability: 0.10, cpu: 0.12, ram: 0.10, storage: 0.08, display: 0.08, gpu: 0.02, upgradeability: 0.02, build: 0.05 },
  coding:      { ram: 0.22, cpu: 0.22, storage: 0.12, budget: 0.12, battery: 0.10, portability: 0.08, gpu: 0.05, display: 0.05, upgradeability: 0.02, build: 0.02 },
  gaming:      { gpu: 0.30, cpu: 0.15, ram: 0.15, storage: 0.10, display: 0.10, budget: 0.12, upgradeability: 0.02, battery: 0.03, portability: 0.02, build: 0.01 },
  "video-editing": { cpu: 0.20, gpu: 0.20, ram: 0.18, storage: 0.12, display: 0.10, budget: 0.10, battery: 0.05, portability: 0.03, upgradeability: 0.01, build: 0.01 },
  "graphic-design": { display: 0.22, cpu: 0.15, gpu: 0.15, ram: 0.15, storage: 0.10, budget: 0.10, battery: 0.05, portability: 0.05, upgradeability: 0.01, build: 0.02 },
  travel:      { battery: 0.25, portability: 0.25, budget: 0.15, cpu: 0.10, ram: 0.08, storage: 0.08, display: 0.03, gpu: 0.02, upgradeability: 0.01, build: 0.03 },
  general:     { budget: 0.20, battery: 0.15, cpu: 0.10, ram: 0.10, storage: 0.10, display: 0.10, portability: 0.10, build: 0.10, upgradeability: 0.03, gpu: 0.02 },
  "ai-ml":     { gpu: 0.30, ram: 0.20, cpu: 0.20, storage: 0.10, budget: 0.08, upgradeability: 0.03, display: 0.03, build: 0.02, battery: 0.02, portability: 0.02 },
  mixed:       { cpu: 0.15, ram: 0.15, budget: 0.15, storage: 0.10, gpu: 0.10, battery: 0.10, portability: 0.08, display: 0.08, upgradeability: 0.04, build: 0.05 },
}

const DIMS = ["cpu", "gpu", "ram", "storage", "battery", "portability", "display", "budget", "upgradeability", "build"] as const

// ── Filter pipeline ──
// Each step: (laptops, answers) → filtered laptops ([] means "all filtered out")
// Run all steps sequentially. If a step yields empty, re-run from step 1 with that step's fallback.

interface FilterStep {
  name: string
  filter: (l: ScorableLaptop[], a: QuizAnswers) => ScorableLaptop[]
  fallback: (l: ScorableLaptop[], a: QuizAnswers) => ScorableLaptop[]
}

const FILTER_STEPS: FilterStep[] = [
  {
    name: "budget",
    filter: (l, a) => a.budgetMin != null || a.budgetMax != null
      ? l.filter(x => x.price >= (a.budgetMin ?? 0) && x.price <= (a.budgetMax ?? Infinity))
      : l,
    fallback: (l, a) => a.budgetMin != null || a.budgetMax != null
      ? l.filter(x => x.price >= (a.budgetMin ?? 0) * 0.7 && x.price <= (a.budgetMax ?? Infinity) * 1.3)
      : l,
  },
  {
    name: "os",
    filter: (l, a) => a.os && a.os !== "no-preference" ? l.filter(x => osScore(x, a.os!) > 0) : l,
    fallback: (l) => l, // skip OS filter entirely
  },
  {
    name: "cpuBrand",
    filter: (l, a) => a.cpuBrand && a.cpuBrand !== "no-preference"
      ? l.filter(x => x.cpuBrand.toLowerCase() === a.cpuBrand!.toLowerCase())
      : l,
    fallback: (l) => l,
  },
  {
    name: "minRam",
    filter: (l, a) => a.minRam ? l.filter(x => x.ramAmount >= a.minRam!) : l,
    fallback: (l, a) => a.minRam ? l.filter(x => x.ramAmount >= Math.max(8, a.minRam! - 4)) : l,
  },
  {
    name: "minStorage",
    filter: (l, a) => a.minStorage ? l.filter(x => x.storageAmount >= a.minStorage!) : l,
    fallback: (l) => l,
  },
  {
    name: "gpu",
    filter: (l, a) => a.gpu === "dedicated" ? l.filter(x => x.gpuType === "dedicated") : l,
    fallback: (l) => l,
  },
  {
    name: "ports",
    filter: (l, a) => a.ports.length ? l.filter(x => portsScore(x, a.ports) > 0) : l,
    fallback: (l) => l,
  },
]

function filterPipeline(laptops: ScorableLaptop[], answers: QuizAnswers): ScorableLaptop[] {
  // First pass: strict — each step uses filter. If a step removes all laptops,
  // retry that step with its fallback. If fallback also yields nothing, skip the step.
  let pool = laptops.filter(l => l.isActive)
  for (let i = 0; i < FILTER_STEPS.length; i++) {
    let next = FILTER_STEPS[i].filter(pool, answers)
    if (next.length === 0) next = FILTER_STEPS[i].fallback(pool, answers)
    if (next.length > 0) pool = next
    // ponytail: if both filter+fallback remove everything, skip the step entirely
  }
  if (pool.length > 0) return pool

  // Second pass: more aggressive — relax each step individually and retry
  for (let failIdx = 0; failIdx < FILTER_STEPS.length; failIdx++) {
    pool = laptops.filter(l => l.isActive)
    for (let i = 0; i < FILTER_STEPS.length; i++) {
      const fn = i === failIdx || i === failIdx - 1 ? FILTER_STEPS[i].fallback : FILTER_STEPS[i].filter
      pool = fn(pool, answers)
      if (pool.length === 0) break
    }
    if (pool.length > 0) return pool
  }

  // Last resort: top 10 popular, with budget respected
  let lastResort = laptops.filter(l => l.isActive)
  if (answers.budgetMin != null || answers.budgetMax != null) {
    lastResort = lastResort.filter(x =>
      x.price >= (answers.budgetMin ?? 0) * 0.5 &&
      x.price <= (answers.budgetMax ?? Infinity) * 1.5
    )
  }
  return lastResort.sort((a, b) => Number(b.isPopular) - Number(a.isPopular)).slice(0, 10)
}

// ── F-score ranker ──
function computeScores(laptop: ScorableLaptop, answers: QuizAnswers): Record<string, number> {
  return {
    cpu: cpuScore(laptop),
    gpu: gpuScore(laptop),
    ram: ramScore(laptop),
    storage: storageScore(laptop),
    battery: batteryScore(laptop, answers.battery || "medium"),
    portability: portabilityScore(laptop, answers.portability || "balanced"),
    display: displayScore(laptop, answers.displayQuality || null),
    budget: 1, // ponytail: budget already handled by filter, treat as satisfied
    upgradeability: laptop.ramUpgradeable ? 1.0 : 0.3,
    build: laptop.buildMaterial && ["aluminum", "magnesium", "carbon"].some(m => laptop.buildMaterial!.toLowerCase().includes(m)) ? 1.0 : 0.5,
  }
}

// ── Match reasons (same as original) ──
function generateMatchReasons(laptop: ScorableLaptop, answers: QuizAnswers): string[] {
  const reasons: string[] = []
  if (answers.minRam && laptop.ramAmount >= answers.minRam) {
    reasons.push(`${laptop.ramAmount} GB RAM meets your minimum requirement`)
  }
  if (answers.battery === "high" || answers.battery === "top") {
    if (laptop.batteryLife && laptop.batteryLife >= 8) {
      reasons.push(`Long battery life (${laptop.batteryLife}h) for all-day use`)
    }
  }
  if (answers.gpu === "dedicated" && laptop.gpuType === "dedicated") {
    reasons.push(`Dedicated GPU${laptop.gpuModel ? ` (${laptop.gpuModel})` : ""} for graphics workloads`)
  }
  if (laptop.weight && answers.portability === "light" && laptop.weight <= 1.5) {
    reasons.push(`Ultra-portable at ${laptop.weight} kg — easy to carry daily`)
  }
  if (laptop.displayRefreshRate >= 120 && answers.gaming && answers.gaming !== "none") {
    reasons.push(`${laptop.displayRefreshRate} Hz display for smooth gaming`)
  }
  if (laptop.ramUpgradeable && answers.upgradeability === "must-have") {
    reasons.push("Upgradeable RAM for future-proofing")
  }
  const profile = PRIORITIES[answers.useCase || "general"] ?? PRIORITIES.general
  if ((profile.cpu ?? 0) >= 0.15 && laptop.cpuCores && laptop.cpuCores >= 8) {
    reasons.push(`${laptop.cpuCores}-core processor handles demanding workloads`)
  }
  return reasons.slice(0, 4)
}

function generateTradeoffs(laptop: ScorableLaptop, answers: QuizAnswers): string[] {
  const tradeoffs: string[] = []
  if (laptop.gpuType === "integrated" && (answers.gpu === "dedicated" || answers.gaming === "aaa")) {
    tradeoffs.push("Integrated graphics — not suitable for AAA gaming or heavy GPU work")
  }
  if (laptop.weight && laptop.weight > 2.2 && answers.portability === "light") {
    tradeoffs.push(`Heavier build (${laptop.weight} kg) — less ideal for daily carry`)
  }
  if (laptop.batteryLife && laptop.batteryLife < 6 && (answers.battery === "high" || answers.battery === "top")) {
    tradeoffs.push(`Battery life (${laptop.batteryLife}h) may not last a full day`)
  }
  if (!laptop.ramUpgradeable && answers.upgradeability === "must-have") {
    tradeoffs.push("RAM is soldered — cannot be upgraded later")
  }
  if (laptop.displayRefreshRate < 90 && answers.gaming === "esports") {
    tradeoffs.push("Standard 60 Hz display — consider a higher refresh model for competitive gaming")
  }
  if (answers.os && answers.os !== "no-preference" && laptop.os.toLowerCase() !== answers.os.toLowerCase()) {
    tradeoffs.push(`Runs ${laptop.os}, not ${answers.os} — you may need to adjust to the OS`)
  }
  return tradeoffs.slice(0, 3)
}

// ── Public API ──

export function scoreLaptops(
  laptops: ScorableLaptop[],
  answers: QuizAnswers
): RecommendedLaptop[] {
  const pool = filterPipeline(laptops, answers)
  const profile = PRIORITIES[answers.useCase || "general"] ?? PRIORITIES.general

  // Determine which dimensions the user explicitly answered (for recall)
  const answeredDims = new Set<string>()
  if (answers.budgetMin != null || answers.budgetMax != null) answeredDims.add("budget")
  if (answers.os && answers.os !== "no-preference") answeredDims.add("os")
  if (answers.cpuBrand && answers.cpuBrand !== "no-preference") answeredDims.add("cpu")
  if (answers.minRam) answeredDims.add("ram")
  if (answers.minStorage) answeredDims.add("storage")
  if (answers.gpu) answeredDims.add("gpu")
  if (answers.battery) answeredDims.add("battery")
  if (answers.portability) answeredDims.add("portability")
  if (answers.displayQuality.length) answeredDims.add("display")
  if (answers.upgradeability) answeredDims.add("upgradeability")
  if (answers.buildQuality) answeredDims.add("build")

  const totalPriorityWeight = Object.values(profile).reduce((a, b) => a + b, 0)
  const requestedWeight = DIMS.reduce((sum, d) => sum + (answeredDims.has(d) ? (profile[d] ?? 0) : 0), 0)

  const scored = pool.map(laptop => {
    const scores = computeScores(laptop, answers)

    // Weighted sum (precision numerator)
    const satisfiedWeight = DIMS.reduce((sum, d) => sum + (profile[d] ?? 0) * scores[d], 0)

    // F-score: precision = how well it fits the use case, recall = how well it meets user's explicit asks
    const precision = satisfiedWeight / totalPriorityWeight
    const recall = requestedWeight > 0
      ? DIMS.reduce((sum, d) => sum + (answeredDims.has(d) ? (profile[d] ?? 0) * scores[d] : 0), 0) / requestedWeight
      : precision

    const alpha = 0.5 // ponytail: emphasize recall (user's explicit prefs matter more)
    const fScore = precision + recall > 0
      ? (1 + alpha * alpha) * precision * recall / (alpha * alpha * precision + recall)
      : 0

    const matchPct = Math.round(Math.min(100, fScore * 100))
    const reasons = generateMatchReasons(laptop, answers)
    const tradeoffs = generateTradeoffs(laptop, answers)

    return {
      id: laptop.id,
      brand: laptop.brand,
      model: laptop.model,
      variant: laptop.variant,
      price: laptop.price,
      currency: laptop.currency,
      region: laptop.region,
      url: laptop.url,
      affiliateUrl: laptop.affiliateUrl,
      os: laptop.os,
      cpuBrand: laptop.cpuBrand,
      cpuFamily: laptop.cpuFamily,
      cpuGeneration: laptop.cpuGeneration,
      cpuCores: laptop.cpuCores,
      gpuType: laptop.gpuType,
      gpuModel: laptop.gpuModel,
      gpuVRAM: laptop.gpuVRAM,
      ramAmount: laptop.ramAmount,
      ramUpgradeable: laptop.ramUpgradeable,
      storageAmount: laptop.storageAmount,
      storageType: laptop.storageType,
      storageExpandable: laptop.storageExpandable,
      displaySize: laptop.displaySize,
      displayResolution: laptop.displayResolution,
      displayRefreshRate: laptop.displayRefreshRate,
      displayPanelType: laptop.displayPanelType,
      displayBrightness: laptop.displayBrightness,
      weight: laptop.weight,
      batteryLife: laptop.batteryLife,
      imageUrl: laptop.imageUrl,
      reviewScore: laptop.reviewScore,
      isPopular: laptop.isPopular,
      matchScore: matchPct,
      matchReasons: reasons,
      tradeoffs: tradeoffs,
      retailers: laptop.retailers ?? [],
    } satisfies RecommendedLaptop
  })

  scored.sort((a, b) => b.matchScore - a.matchScore)
  return scored.slice(0, 12)
}
