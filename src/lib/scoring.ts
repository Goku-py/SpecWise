import type { QuizAnswers, RecommendedLaptop, ScorableLaptop } from "./types"
import { toCanonical } from "./recommendation/questionnaire"
import { buildProfile } from "./recommendation/profile"
import { runEngine, type RankedItem, type EngineResult } from "./recommendation/engine"
import { baseWeights } from "./recommendation/weights"

// ── Match reasons / trade-offs (fact-based triggers, unchanged copy) ──
// Derived from profile facts + laptop facts; deterministic projection.

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
  const profile = baseWeights(answers.useCase ?? "general")
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

// ── Public API: the ONE authoritative scoring entrypoint ──
// Legacy QuizAnswers → canonical adapter → engine. Output shape preserved
// (plus additive v2 fields); no competing ranker lives here anymore.

function toRecommended(item: RankedItem, answers: QuizAnswers, result: EngineResult): RecommendedLaptop {
  const l = item.laptop
  const reasons = generateMatchReasons(l, answers)
  const legacyTradeoffs = generateTradeoffs(l, answers)
  const tradeoffs = [...legacyTradeoffs, ...item.structuralNotes.filter(n => !legacyTradeoffs.includes(n))].slice(0, 3)
  const caps: Record<string, number | null> = {}
  for (const d of Object.keys(item.caps) as Array<keyof typeof item.caps>) caps[d] = item.caps[d].value
  return {
    id: l.id,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    price: l.price,
    currency: l.currency,
    region: l.region,
    url: l.url,
    affiliateUrl: l.affiliateUrl,
    os: l.os,
    cpuBrand: l.cpuBrand,
    cpuFamily: l.cpuFamily,
    cpuGeneration: l.cpuGeneration,
    cpuCores: l.cpuCores,
    gpuType: l.gpuType,
    gpuModel: l.gpuModel,
    gpuVRAM: l.gpuVRAM,
    ramAmount: l.ramAmount,
    ramUpgradeable: l.ramUpgradeable,
    storageAmount: l.storageAmount,
    storageType: l.storageType,
    storageExpandable: l.storageExpandable,
    displaySize: l.displaySize,
    displayResolution: l.displayResolution,
    displayRefreshRate: l.displayRefreshRate,
    displayPanelType: l.displayPanelType,
    displayBrightness: l.displayBrightness,
    weight: l.weight,
    batteryLife: l.batteryLife,
    imageUrl: l.imageUrl,
    reviewScore: l.reviewScore,
    isPopular: l.isPopular,
    matchScore: Math.round(item.score * 100),
    matchReasons: reasons,
    tradeoffs,
    retailers: l.retailers ?? [],
    priceMissing: l.priceMissing ?? l.price <= 0,
    priceStale: l.priceStale ?? false,
    scoringVersion: result.scoringVersion,
    weightsVersion: result.weightsVersion,
    relaxed: result.relaxed,
    exhausted: result.exhausted,
    relaxationLedger: result.ledger,
    scoringMeta: { caps, weights: { ...item.weights }, penalties: item.penalties, bonuses: item.bonuses },
    explanation: {
      why: [...item.explanation.why],
      strengths: item.explanation.strengths.map(s => ({ ...s })),
      compromises: [...item.explanation.compromises],
      satisfied: [...item.satisfied],
      missed: item.missed.map(m => ({ ...m })),
      structuralNotes: [...item.structuralNotes],
      whyAbove: item.explanation.whyAbove
        ? { vsId: item.explanation.whyAbove.vsId, won: [...item.explanation.whyAbove.won], lost: [...item.explanation.whyAbove.lost] }
        : null,
    },
  }
}

export function scoreLaptops(
  laptops: ScorableLaptop[],
  answers: QuizAnswers
): RecommendedLaptop[] {
  const canon = toCanonical(answers)
  const profile = buildProfile(canon, answers.budgetMin ?? null)
  const result = runEngine(laptops, profile, canon)
  return result.items.map(item => toRecommended(item, answers, result))
}
