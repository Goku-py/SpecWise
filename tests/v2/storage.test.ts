import { describe, expect, it } from "vitest"
import {
  STORAGE_VERSION,
  StorageKey,
  readEnvelope,
  readResultsSnapshot,
  readValidated,
  removeStored,
  validateQuizAnswers,
  validateQuizMode,
  validateResultsPayload,
  validateStepIndex,
  validateStoredAnswers,
  writeValidated,
  type StorageBackend,
} from "@/lib/storage"

function memBackend(seed: Record<string, string> = {}): StorageBackend & { store: Map<string, string> } {
  const store = new Map(Object.entries(seed))
  return {
    store,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => {
      store.set(k, v)
    },
    removeItem: (k: string) => {
      store.delete(k)
    },
  }
}

const asJson = (v: unknown) => JSON.stringify(v)

describe("envelope read/write", () => {
  it("writes v2 envelopes and reads them back", () => {
    const b = memBackend()
    writeValidated(StorageKey.QuizMode, "quick", b)
    const raw = JSON.parse(b.store.get(StorageKey.QuizMode)!)
    expect(raw.v).toBe(STORAGE_VERSION)
    expect(typeof raw.savedAt).toBe("string")
    expect(raw.data).toBe("quick")
    expect(readValidated(StorageKey.QuizMode, validateQuizMode, b)).toBe("quick")
  })

  it("reads legacy raw payloads and migrates them to v2 idempotently", () => {
    const b = memBackend({ [StorageKey.QuizMode]: asJson("advanced") })
    expect(readValidated(StorageKey.QuizMode, validateQuizMode, b)).toBe("advanced")
    // Migrated: second read sees the envelope with identical data.
    const migrated = JSON.parse(b.store.get(StorageKey.QuizMode)!)
    expect(migrated).toMatchObject({ v: 2, data: "advanced" })
    expect(readValidated(StorageKey.QuizMode, validateQuizMode, b)).toBe("advanced")
    expect(JSON.parse(b.store.get(StorageKey.QuizMode)!)).toMatchObject({ v: 2, data: "advanced" })
  })

  it("rejects malformed JSON without touching stored bytes", () => {
    const b = memBackend({ [StorageKey.QuizAnswers]: "{not json" })
    expect(readEnvelope(StorageKey.QuizAnswers, b)).toBeNull()
    expect(readValidated(StorageKey.QuizAnswers, validateQuizAnswers, b)).toBeNull()
    expect(b.store.get(StorageKey.QuizAnswers)).toBe("{not json")
  })

  it("rejects schema-invalid data without touching stored bytes", () => {
    const b = memBackend({
      [StorageKey.QuizMode]: asJson("turbo"),
      [StorageKey.QuizAnswers]: asJson([1, 2, 3]),
      [StorageKey.Results]: asJson({ results: [{ id: 7 }] }),
    })
    expect(readValidated(StorageKey.QuizMode, validateQuizMode, b)).toBeNull()
    expect(readValidated(StorageKey.QuizAnswers, validateQuizAnswers, b)).toBeNull()
    expect(readValidated(StorageKey.Results, validateResultsPayload, b)).toBeNull()
    expect(b.store.get(StorageKey.QuizMode)).toBe(asJson("turbo"))
  })

  it("missing keys read as null; null backend is safe", () => {
    const b = memBackend()
    expect(readValidated(StorageKey.QuizStep, validateStepIndex, b)).toBeNull()
    expect(readValidated(StorageKey.QuizStep, validateStepIndex, null)).toBeNull()
    expect(() => writeValidated(StorageKey.QuizStep, 1, null)).not.toThrow()
    expect(() => removeStored(StorageKey.QuizStep, null)).not.toThrow()
  })
})

describe("quiz validators", () => {
  it("accepts quick/advanced, rejects anything else", () => {
    expect(validateQuizMode("quick")).toBe("quick")
    expect(validateQuizMode("advanced")).toBe("advanced")
    expect(validateQuizMode("QUICK")).toBeNull()
    expect(validateQuizMode("")).toBeNull()
    expect(validateQuizMode(null)).toBeNull()
    expect(validateQuizMode(2)).toBeNull()
  })

  it("accepts legacy step strings and v2 numbers; rejects empty/corrupt", () => {
    expect(validateStepIndex("2")).toBe(2)
    expect(validateStepIndex(3)).toBe(3)
    expect(validateStepIndex("2.7")).toBe(2.7)
    expect(validateStepIndex("")).toBeNull()
    expect(validateStepIndex("   ")).toBeNull()
    expect(validateStepIndex("not-a-number")).toBeNull()
    expect(validateStepIndex(null)).toBeNull()
    expect(validateStepIndex(NaN)).toBeNull()
    expect(validateStepIndex(Infinity)).toBeNull()
  })

  it("keeps known answer keys, drops unknown keys, rejects bad arrays", () => {
    expect(
      validateQuizAnswers({ useCase: "coding", minRam: 16, ports: ["hdmi"], __proto__: "x", future: 1 })
    ).toEqual({ useCase: "coding", minRam: 16, ports: ["hdmi"] })
    expect(validateQuizAnswers({ ports: ["hdmi", 7] })).toBeNull()
    expect(validateQuizAnswers({ useCase: { nested: true } })).toBeNull()
    expect(validateQuizAnswers("coding")).toBeNull()
    expect(validateQuizAnswers(null)).toBeNull()
    expect(validateQuizAnswers([])).toBeNull()
  })

  it("stored-answers blob passes plain objects through", () => {
    expect(validateStoredAnswers({ region: "IN", useCase: "gaming" })).toEqual({ region: "IN", useCase: "gaming" })
    expect(validateStoredAnswers([1])).toBeNull()
    expect(validateStoredAnswers("x")).toBeNull()
  })
})

describe("results payload + snapshot", () => {
  const good = { results: [{ id: "a", matchScore: 88 }, { id: "b", matchScore: 0 }] }

  it("validates items by id + finite matchScore", () => {
    expect(validateResultsPayload(good)?.results).toHaveLength(2)
    expect(validateResultsPayload({ results: [] })?.results).toEqual([])
    expect(validateResultsPayload({ results: [{ id: "", matchScore: 5 }] })).toBeNull()
    expect(validateResultsPayload({ results: [{ id: "a", matchScore: NaN }] })).toBeNull()
    expect(validateResultsPayload({ results: [{ id: "a" }] })).toBeNull()
    expect(validateResultsPayload({})).toBeNull()
  })

  it("snapshot returns canonical JSON for v2 and passes legacy raw through", () => {
    const legacy = memBackend({ [StorageKey.Results]: asJson(good) })
    expect(readResultsSnapshot(legacy)).toBe(asJson(good))
    const v2 = memBackend()
    writeValidated(StorageKey.Results, good, v2)
    expect(readResultsSnapshot(v2)).toBe(asJson(good))
    // Malformed / legacy-unparseable bytes pass through untouched so the
    // compare flow keeps its exact existing catch behavior.
    const bad = memBackend({ [StorageKey.Results]: "{oops" })
    expect(readResultsSnapshot(bad)).toBe("{oops")
    expect(readResultsSnapshot(null)).toBeNull()
    const empty = memBackend()
    expect(readResultsSnapshot(empty)).toBeNull()
    // A v2 envelope with an invalid payload reads as absent.
    const badV2 = memBackend()
    badV2.store.set(
      StorageKey.Results,
      asJson({ v: 2, savedAt: new Date().toISOString(), data: { results: [{ id: 7 }] } })
    )
    expect(readResultsSnapshot(badV2)).toBeNull()
  })

  it("removeStored deletes the key", () => {
    const b = memBackend({ [StorageKey.QuizStep]: asJson(1) })
    removeStored(StorageKey.QuizStep, b)
    expect(b.store.has(StorageKey.QuizStep)).toBe(false)
  })
})
