/**
 * Authoritative recommendation engine (Phases 2E–2M). Single entrypoint.
 * score = Σ(weight × capability) − penalties + bonuses. Deterministic, no RNG/LLM.
 */
import type { ScorableLaptop } from "../types"
import type { CanonicalAnswers } from "./questionnaire"
import { capabilitiesFor, type CapabilitySet } from "./capabilities"
import { SCORING_VERSION, WEIGHTS_VERSION, DIMS_9, type Dim9 } from "./weights"
import type { UserProfile } from "./profile"

export interface RelaxEntry { requirement: string; from: string; to: string; reason: string }
export interface MissedEntry { id: string; required: string; actual: string; relaxed: boolean }

export interface RankedItem {
  laptop: ScorableLaptop
  score: number
  caps: CapabilitySet
  weights: Record<Dim9, number>
  penalties: number
  bonuses: number
  satisfied: string[]
  missed: MissedEntry[]
  structuralNotes: string[]
  explanation: {
    why: Dim9[]
    strengths: Array<{ dim: Dim9; evidence: string }>
    compromises: Dim9[]
    whyAbove: { vsId: string | null; won: Array<{ dim: Dim9; delta: number }>; lost: Array<{ dim: Dim9; delta: number }> } | null
  }
}

export interface EngineResult {
  items: RankedItem[]
  ledger: RelaxEntry[]
  relaxed: boolean
  exhausted: boolean
  scoringVersion: string
  weightsVersion: string
}

export function isPriceMissing(l: Pick<ScorableLaptop, "price" | "priceMissing">): boolean {
  return l.priceMissing ?? l.price <= 0
}

interface HardState {
  budgetMin: number | null; budgetMax: number | null; os: string | null
  minRam: number | null; minStorage: number | null; cpuBrand: string | null
  gpuDedicated: boolean; ports: string[]
}

function portsMissing(laptop: ScorableLaptop, required: string[]): string[] {
  if (required.length === 0) return []
  const have = new Set(laptop.ports.map(p => p.toLowerCase()))
  return required.filter(p => !have.has(p.toLowerCase()))
}

function osMatch(laptopOs: string, pref: string): boolean {
  const lo = laptopOs.toLowerCase(), p = pref.toLowerCase()
  if (p === "linux") return lo === "linux" || lo === "windows" // legacy compat
  return lo === p
}

/** Reasons a laptop fails the current hard state (empty = passes). */
function hardFailures(l: ScorableLaptop, h: HardState): MissedEntry[] {
  const out: MissedEntry[] = []
  const missing = isPriceMissing(l)
  if ((h.budgetMin != null && (missing || l.price < h.budgetMin)) || (h.budgetMax != null && (missing || l.price > h.budgetMax))) {
    out.push({
      id: "budget",
      required: `${h.budgetMin ?? 0}–${h.budgetMax ?? "∞"}`,
      actual: missing ? "price unavailable" : String(l.price),
      relaxed: false,
    })
  }
  if (h.os && !osMatch(l.os, h.os)) out.push({ id: "os", required: h.os, actual: l.os, relaxed: false })
  if (h.minRam != null && l.ramAmount < h.minRam) out.push({ id: "ram", required: `≥${h.minRam}GB`, actual: `${l.ramAmount}GB`, relaxed: false })
  if (h.minStorage != null && l.storageAmount < h.minStorage) out.push({ id: "storage", required: `≥${h.minStorage}GB`, actual: `${l.storageAmount}GB`, relaxed: false })
  if (h.cpuBrand && l.cpuBrand.toLowerCase() !== h.cpuBrand.toLowerCase()) {
    out.push({ id: "cpuBrand", required: h.cpuBrand, actual: l.cpuBrand, relaxed: false })
  }
  if (h.gpuDedicated && l.gpuType !== "dedicated") out.push({ id: "gpu", required: "dedicated", actual: l.gpuType, relaxed: false })
  const pm = portsMissing(l, h.ports)
  if (pm.length > 1) out.push({ id: "ports", required: h.ports.join("+"), actual: `missing ${pm.join(",")}`, relaxed: false })
  return out
}

interface RelaxOp { id: string; applies: (h: HardState) => boolean; apply: (h: HardState) => { h: HardState; entry: RelaxEntry } }

const STORAGE_BANDS = [1024, 512, 256]
const RAM_BANDS = [32, 24, 16, 8]

function lowerRam(floor: number): number | null {
  for (const b of RAM_BANDS) if (b < floor) return b
  return null
}

function lowerBand(floor: number): number | null {
  if (floor > 1024) return 1024
  const i = STORAGE_BANDS.indexOf(floor)
  if (i === -1) return 256
  return STORAGE_BANDS[i + 1] ?? null
}

const RELAX_OPS: RelaxOp[] = [
  {
    id: "gpu",
    applies: h => h.gpuDedicated,
    apply: h => ({ h: { ...h, gpuDedicated: false }, entry: { requirement: "gpu", from: "dedicated", to: "any", reason: "weakest legacy constraint; integrated options included" } }),
  },
  {
    id: "ports",
    applies: h => h.ports.length > 0,
    apply: h => ({ h: { ...h, ports: [] }, entry: { requirement: "ports", from: h.ports.join("+"), to: "any", reason: "no laptop covers the full port set" } }),
  },
  {
    id: "storage",
    applies: h => h.minStorage != null,
    apply: h => {
      const next = lowerBand(h.minStorage!)
      return { h: { ...h, minStorage: next }, entry: { requirement: "storage", from: `≥${h.minStorage}GB`, to: next == null ? "any" : `≥${next}GB`, reason: "least important capacity floor" } }
    },
  },
  {
    id: "ram",
    applies: h => h.minRam != null,
    apply: h => {
      const next = lowerRam(h.minRam!)
      return { h: { ...h, minRam: next }, entry: { requirement: "ram", from: `≥${h.minRam}GB`, to: next == null ? "any" : `≥${next}GB`, reason: "memory floor lowered one step" } }
    },
  },
  {
    id: "budget",
    // Compat deviation from the Phase-1 "+15%" example: preserves the legacy
    // fallback band [0.7×min, 1.3×max] (old tests + UX depend on it), but now
    // ledgered + surfaced instead of silent. See PHASE-2-IMPLEMENTATION.md.
    applies: h => h.budgetMin != null || h.budgetMax != null,
    apply: h => ({
      h: { ...h, budgetMin: h.budgetMin != null ? Math.round(h.budgetMin * 0.7) : null, budgetMax: h.budgetMax != null ? Math.round(h.budgetMax * 1.3) : null },
      entry: { requirement: "budget", from: `${h.budgetMin ?? 0}–${h.budgetMax ?? "∞"}`, to: "widened to 0.7×–1.3×", reason: "budget widened to find near-matches" } }),
  },
  {
    id: "cpuBrand",
    applies: h => h.cpuBrand != null,
    apply: h => ({ h: { ...h, cpuBrand: null }, entry: { requirement: "cpuBrand", from: h.cpuBrand!, to: "any", reason: "brand requirement lifted" } }),
  },
  {
    id: "os",
    applies: h => h.os != null,
    apply: h => ({ h: { ...h, os: null }, entry: { requirement: "os", from: h.os!, to: "any", reason: "OS requirement lifted as last resort before giving up" } }),
  },
]

const PENALTY_REFURB = 0.05
const PENALTY_PRICE_UNKNOWN = 0.15
const PENALTY_LOW_CONF = 0.05 // flat when any scored dim has confidence < 0.5 (bounded by design)
const PENALTY_CAP = 0.25
const BONUS_UPGRADE = 0.03
const BONUS_EXPAND = 0.03
const BONUS_CAP = 0.06
const MET_BONUS = 0.02 // per satisfied hard/need, cap — explicit-fit confirmation
const MET_CAP = 0.06

function evidenceFor(dim: Dim9, l: ScorableLaptop): string {
  switch (dim) {
    case "cpu": return `${l.cpuCores ?? "?"}-core ${l.cpuFamily}`
    case "gpu": return l.gpuType === "dedicated" ? `dedicated ${l.gpuModel ?? ""} ${l.gpuVRAM ?? "?"}GB`.trim() : "integrated graphics"
    case "ram": return `${l.ramAmount} GB RAM`
    case "storage": return `${l.storageAmount} GB ${l.storageType}`
    case "battery": return l.batteryLife != null ? `${l.batteryLife}h battery` : "battery unlisted"
    case "portability": return l.weight != null ? `${l.weight} kg` : "weight unlisted"
    case "display": return `${l.displayRefreshRate} Hz ${l.displayPanelType ?? "display"}`
    case "build": return l.buildMaterial ?? "build unlisted"
    case "value": return isPriceMissing(l) ? "price unavailable" : `${l.price} ${l.currency}`
  }
}

function softScore(l: ScorableLaptop, profile: UserProfile, canon: CanonicalAnswers): { score: number; caps: CapabilitySet; weights: Record<Dim9, number>; penalties: number; bonuses: number; satisfied: string[] } {
  const caps = capabilitiesFor(l, { carry: canon.carry, screen: canon.screen }) as CapabilitySet
  const weights = { ...profile.weights }
  // Pool-relative value is injected by the caller (needs pool context).
  const avail = (Object.keys(weights) as Dim9[]).filter(d => caps[d].value != null)
  const wSum = avail.reduce((s, d) => s + weights[d], 0) || 1
  let penalties = 0
  if (l.isRefurbished) penalties += PENALTY_REFURB
  if (isPriceMissing(l)) penalties += PENALTY_PRICE_UNKNOWN
  if (avail.some(d => caps[d].confidence < 0.5)) penalties += PENALTY_LOW_CONF
  penalties = Math.min(penalties, PENALTY_CAP)
  let bonuses = 0
  if (l.ramUpgradeable) bonuses += BONUS_UPGRADE
  if (l.storageExpandable) bonuses += BONUS_EXPAND
  bonuses = Math.min(bonuses, BONUS_CAP)
  const satisfied: string[] = []
  const h = profile.hard
  if (h.budgetMin == null && h.budgetMax == null) {
    // no budget ask → no confirmation either way
  } else if (!isPriceMissing(l) && (h.budgetMin == null || l.price >= h.budgetMin) && (h.budgetMax == null || l.price <= h.budgetMax)) satisfied.push("budget")
  if (h.os && osMatch(l.os, h.os)) satisfied.push("os")
  if (h.minRam != null && l.ramAmount >= h.minRam) satisfied.push("ram")
  if (h.minStorage != null && l.storageAmount >= h.minStorage) satisfied.push("storage")
  if (h.cpuBrand && l.cpuBrand.toLowerCase() === h.cpuBrand.toLowerCase()) satisfied.push("cpuBrand")
  if (h.gpuDedicated && l.gpuType === "dedicated") satisfied.push("gpu")
  // Soft-need confirmations (battery/portability explicitly met).
  if (canon.powerTrade === "battery" && l.batteryLife != null && l.batteryLife >= 8) satisfied.push("battery-need")
  if (canon.powerTrade === "performance" && (l.cpuCores ?? 0) >= 8) satisfied.push("power-need")
  if (canon.carry === "always" && l.weight != null && l.weight <= 1.5) satisfied.push("portability-need")
  const metBonus = Math.min(satisfied.length * MET_BONUS, MET_CAP)
  const raw = avail.reduce((s, d) => s + weights[d] * caps[d].value!, 0) / wSum
  const score = Math.max(0, Math.min(1, raw - penalties + bonuses + metBonus))
  return { score, caps, weights, penalties, bonuses: bonuses + metBonus, satisfied }
}

function structuralNotes(l: ScorableLaptop, profile: UserProfile, canon: CanonicalAnswers): string[] {
  const notes: string[] = []
  if (profile.weights.gpu >= 0.15 && l.gpuType !== "dedicated" && !canon.legacyGpuDedicated) {
    notes.push("Integrated graphics — not suitable for AAA gaming or heavy GPU work")
  }
  const trade = profile.tradeOffs.find(t => t.id === "battery-for-power")
  if (trade && l.batteryLife != null && l.batteryLife < 8) notes.push("Trades battery life for performance")
  return notes
}

function tieBreak(a: RankedItem, b: RankedItem): number {
  if (b.score !== a.score) return b.score - a.score
  const ap = isPriceMissing(a.laptop) ? Infinity : a.laptop.price
  const bp = isPriceMissing(b.laptop) ? Infinity : b.laptop.price
  if (ap !== bp) return ap - bp
  const aw = a.laptop.weight ?? Infinity, bw = b.laptop.weight ?? Infinity
  if (aw !== bw) return aw - bw
  return a.laptop.id < b.laptop.id ? -1 : a.laptop.id > b.laptop.id ? 1 : 0
}

/** Shared scorer used by both the pipeline and the slider overlay. */
export function scoreWithWeights(
  laptops: ScorableLaptop[],
  profile: UserProfile,
  canon: CanonicalAnswers,
  weights: Record<Dim9, number>,
  valueByPoolId?: Map<string, number>
): RankedItem[] {
  return laptops.map(l => {
    const base = softScore(l, { ...profile, weights }, canon)
    const caps = { ...base.caps } as CapabilitySet
    if (valueByPoolId?.has(l.id)) {
      caps.value = { value: valueByPoolId.get(l.id)!, confidence: 0.8, source: "inferred" }
    } else if (valueByPoolId) {
      caps.value = { value: null, confidence: 0, source: "missing" }
    }
    // Recompute with final caps (value injected).
    const avail = DIMS_9.filter(d => caps[d].value != null)
    const wSum = avail.reduce((s, d) => s + weights[d], 0) || 1
    const raw = avail.reduce((s, d) => s + weights[d] * caps[d].value!, 0) / wSum
    const score = Math.max(0, Math.min(1, raw - base.penalties + base.bonuses))
    const contrib = DIMS_9.filter(d => caps[d].value != null)
      .map(d => ({ d, c: weights[d] * caps[d].value! }))
      .sort((x, y) => y.c - x.c)
    const why = contrib.slice(0, 2).map(x => x.d)
    const strengths = [...contrib]
      .sort((x, y) => (caps[y.d].value! - caps[x.d].value!))
      .slice(0, 3)
      .map(x => ({ dim: x.d, evidence: evidenceFor(x.d, l) }))
    const compromises = [...contrib].slice(-2).map(x => x.d)
    return {
      laptop: l,
      score,
      caps,
      weights: { ...weights },
      penalties: base.penalties,
      bonuses: base.bonuses,
      satisfied: base.satisfied,
      missed: [] as MissedEntry[],
      structuralNotes: structuralNotes(l, profile, canon),
      explanation: { why, strengths, compromises, whyAbove: null },
    } satisfies RankedItem
  })
}

function valueMap(pool: ScorableLaptop[]): Map<string, number> {
  const priced = pool.filter(l => !isPriceMissing(l)).sort((a, b) => a.price - b.price)
  const m = new Map<string, number>()
  // Dense ranking: identical prices share one value, so input order can never
  // split a tie (tie-break stays score → price → weight → id).
  const distinct = [...new Set(priced.map(l => l.price))]
  for (const l of priced) {
    const rank = distinct.indexOf(l.price)
    m.set(l.id, distinct.length === 1 ? 1 : 1 - (0.8 * rank) / (distinct.length - 1))
  }
  return m
}

export function runEngine(catalog: ScorableLaptop[], profile: UserProfile, canon: CanonicalAnswers): EngineResult {
  const active = catalog.filter(l => l.isActive)
  if (active.length === 0) {
    return { items: [], ledger: [], relaxed: false, exhausted: false, scoringVersion: SCORING_VERSION, weightsVersion: WEIGHTS_VERSION }
  }
  let hard: HardState = {
    budgetMin: profile.hard.budgetMin,
    budgetMax: profile.hard.budgetMax,
    os: profile.hard.os,
    minRam: profile.hard.minRam,
    minStorage: profile.hard.minStorage,
    cpuBrand: profile.hard.cpuBrand,
    gpuDedicated: profile.hard.gpuDedicated,
    ports: profile.hard.ports,
  }
  const ledger: RelaxEntry[] = []
  let pool = active.filter(l => hardFailures(l, hard).length === 0)
  let relaxed = false
  if (pool.length === 0) {
    for (const op of RELAX_OPS) {
      if (ledger.length >= 3) break
      if (!op.applies(hard)) continue
      const next = op.apply(hard)
      hard = next.h
      ledger.push(next.entry)
      relaxed = true
      pool = active.filter(l => hardFailures(l, hard).length === 0)
      if (pool.length > 0) break
    }
  }
  const relaxedIds = new Set(ledger.map(e => e.requirement))
  if (pool.length === 0) {
    // Exhausted: closest misses by soft score (graceful, flagged — never silent).
    const vm = valueMap(active)
    const closest = scoreWithWeights(active, profile, canon, profile.weights, vm)
      .sort(tieBreak)
      .slice(0, 12)
    for (const item of closest) {
      item.missed = hardFailures(item.laptop, hard).map(m => ({ ...m, relaxed: relaxedIds.has(m.id) }))
    }
    attachWhyAbove(closest)
    return { items: closest, ledger, relaxed, exhausted: true, scoringVersion: SCORING_VERSION, weightsVersion: WEIGHTS_VERSION }
  }
  const vm = valueMap(pool)
  let items = scoreWithWeights(pool, profile, canon, profile.weights, vm)
  for (const item of items) {
    const fails = hardFailures(item.laptop, hard)
    item.missed = fails.map(m => ({ ...m, relaxed: relaxedIds.has(m.id) }))
  }
  // Diversity: max 2 per brand+model family.
  const seen = new Map<string, number>()
  items = items.filter(item => {
    const k = `${item.laptop.brand} ${item.laptop.model}`.toLowerCase()
    const n = (seen.get(k) ?? 0) + 1
    seen.set(k, n)
    return n <= 2
  })
  items.sort(tieBreak)
  // Price-unknown lane: priced first; missing appended last (max 3). Invariant:
  // unknown-price never ranks #1–3 above a priced passer.
  const priced = items.filter(i => !isPriceMissing(i.laptop))
  const missing = items.filter(i => isPriceMissing(i.laptop)).slice(0, 3)
  items = [...priced, ...missing].slice(0, 12)
  attachWhyAbove(items)
  return { items, ledger, relaxed, exhausted: false, scoringVersion: SCORING_VERSION, weightsVersion: WEIGHTS_VERSION }
}

function attachWhyAbove(items: RankedItem[]): void {
  for (let i = 0; i < items.length; i++) {
    const cur = items[i], nxt = items[i + 1]
    if (!nxt) { cur.explanation.whyAbove = null; continue }
    const deltas = DIMS_9.filter(d => cur.caps[d].value != null && nxt.caps[d].value != null)
      .map(d => ({ dim: d, delta: cur.caps[d].value! - nxt.caps[d].value! }))
      .sort((a, b) => b.delta - a.delta)
    cur.explanation.whyAbove = {
      vsId: nxt.laptop.id,
      won: deltas.filter(d => d.delta > 0).slice(0, 2),
      lost: deltas.filter(d => d.delta < 0).slice(-2).reverse(),
    }
  }
}

/** Slider overlay (Phase 2M): same scorer, caller-supplied weights. */
export function rescoreWithOverlay(ranked: RankedItem[], overlay: Record<Dim9, number>): RankedItem[] {
  const sum = DIMS_9.reduce((s, d) => s + overlay[d], 0) || 1
  const weights = Object.fromEntries(DIMS_9.map(d => [d, overlay[d] / sum])) as Record<Dim9, number>
  const out = ranked.map(item => {
    const avail = DIMS_9.filter(d => item.caps[d].value != null)
    const wSum = avail.reduce((s, d) => s + weights[d], 0) || 1
    const raw = avail.reduce((s, d) => s + weights[d] * item.caps[d].value!, 0) / wSum
    return { ...item, weights, score: Math.max(0, Math.min(1, raw - item.penalties + item.bonuses)) }
  })
  out.sort(tieBreak)
  return out
}
