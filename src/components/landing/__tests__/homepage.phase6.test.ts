import { describe, expect, it } from "vitest"
import { buildWorkloadPrefillPath } from "@/components/landing/lib/prefill"
import { WORKLOAD_IDS } from "@/components/landing/data/illustrative-picks"
import { parseV3ShareParams } from "@/lib/share"
import {
  SAMPLE_PROOF_BADGE,
  SAMPLE_PROOF_FIXTURE,
  SAMPLE_PROOF_LABEL,
  SAMPLE_PROOF_SCORE,
} from "@/components/landing/sample-proof"
import { honestLimitsCopy } from "@/components/landing/trust"

describe("workload prefill paths", () => {
  for (const id of WORKLOAD_IDS) {
    it(`builds a /quiz?s=… path decoding to a primary ${id} profile`, () => {
      const path = buildWorkloadPrefillPath(id, "US", "USD")
      expect(path.startsWith("/quiz?s=")).toBe(true)
      const profile = parseV3ShareParams({ s: path.slice("/quiz?s=".length) })
      expect(profile).not.toBeNull()
      expect(profile!.workloads).toHaveLength(1)
      expect(profile!.workloads[0].id).toBe(id)
      expect(profile!.workloads[0].importance).toBe("primary")
    })
  }
})

describe("sample-proof fixture", () => {
  it("stays a labeled demonstration with fixed values", () => {
    expect(SAMPLE_PROOF_SCORE).toBe(92)
    expect(SAMPLE_PROOF_LABEL).toBe("Closest match")
    expect(SAMPLE_PROOF_LABEL).not.toMatch(/best|perfect/i)
    expect(SAMPLE_PROOF_BADGE).toMatch(/demonstration/i)
    expect(SAMPLE_PROOF_BADGE).toMatch(/not live data/i)
    expect(SAMPLE_PROOF_FIXTURE.score).toBe(92)
    expect(SAMPLE_PROOF_FIXTURE.bars.map((b) => b.label)).toEqual([
      "Workload fit",
      "Requirements fit",
      "Value",
    ])
  })
})

describe("honestLimitsCopy", () => {
  it("notes the growing catalog when empty", () => {
    expect(honestLimitsCopy(0)).toMatch(/growing/i)
  })

  it("reports live counts without the growing note otherwise", () => {
    const copy = honestLimitsCopy(42)
    expect(copy).toMatch(/live/)
    expect(copy).not.toMatch(/growing/i)
  })
})
