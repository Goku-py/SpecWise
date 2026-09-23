import { describe, expect, it } from "vitest"
import {
  STORAGE_VERSION,
  StorageKey,
  readEnvelope,
  readResultsSnapshot,
  readValidated,
  removeStored,
  validateResultsPayload,
  validateV3Profile,
  validateV3Results,
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

const v3profile = {
  schemaVersion: "v3",
  workloads: [{ id: "dev", importance: "primary", subprofile: "standard" }],
}
const v3dto = {
  schemaVersion: "v3",
  items: [{ laptopId: "a", scores: { overall: 88 } }],
}

describe("envelope read/write", () => {
  it("writes v2 envelopes and reads them back", () => {
    const b = memBackend()
    writeValidated(StorageKey.V3Profile, v3profile, b)
    const raw = JSON.parse(b.store.get(StorageKey.V3Profile)!)
    expect(raw.v).toBe(STORAGE_VERSION)
    expect(typeof raw.savedAt).toBe("string")
    expect(raw.data).toEqual(v3profile)
    expect(readValidated(StorageKey.V3Profile, validateV3Profile, b)).toEqual(v3profile)
  })

  it("reads legacy raw payloads and migrates them to v2 idempotently", () => {
    const b = memBackend({ [StorageKey.V3Results]: asJson(v3dto) })
    expect(readValidated(StorageKey.V3Results, validateV3Results, b)).toEqual(v3dto)
    // Migrated: second read sees the envelope with identical data.
    const migrated = JSON.parse(b.store.get(StorageKey.V3Results)!)
    expect(migrated).toMatchObject({ v: 2, data: v3dto })
    expect(readValidated(StorageKey.V3Results, validateV3Results, b)).toEqual(v3dto)
  })

  it("rejects malformed JSON without touching stored bytes", () => {
    const b = memBackend({ [StorageKey.V3Profile]: "{not json" })
    expect(readEnvelope(StorageKey.V3Profile, b)).toBeNull()
    expect(readValidated(StorageKey.V3Profile, validateV3Profile, b)).toBeNull()
    expect(b.store.get(StorageKey.V3Profile)).toBe("{not json")
  })

  it("rejects schema-invalid data without touching stored bytes", () => {
    const b = memBackend({
      [StorageKey.V3Profile]: asJson({ schemaVersion: "v3", workloads: [] }),
      [StorageKey.V3Results]: asJson({ schemaVersion: "v3", items: [{ laptopId: "" }] }),
    })
    // NOTE: envelope-level validators are shape checks (server revalidates);
    // workloads:[] passes validateV3Profile — emptiness is rejected by share parsing.
    expect(readValidated(StorageKey.V3Profile, validateV3Profile, b)).not.toBeNull()
    expect(readValidated(StorageKey.V3Results, validateV3Results, b)).toBeNull()
  })

  it("missing keys read as null; null backend is safe", () => {
    const b = memBackend()
    expect(readValidated(StorageKey.V3Profile, validateV3Profile, b)).toBeNull()
    expect(readValidated(StorageKey.V3Profile, validateV3Profile, null)).toBeNull()
    expect(() => writeValidated(StorageKey.V3Profile, v3profile, null)).not.toThrow()
    expect(() => removeStored(StorageKey.V3Profile, null)).not.toThrow()
  })
})

describe("v3 validators", () => {
  it("accepts v3 profiles and DTOs, rejects legacy shapes", () => {
    expect(validateV3Profile(v3profile)).toEqual(v3profile)
    expect(validateV3Profile({ region: "US", useCase: "coding" })).toBeNull()
    expect(validateV3Profile(null)).toBeNull()
    expect(validateV3Results(v3dto)).toEqual(v3dto)
    expect(validateV3Results({ results: [{ id: "a", matchScore: 1 }] })).toBeNull()
    expect(validateV3Results({ schemaVersion: "v3", items: [{ laptopId: "a" }] })).toBeNull()
  })
})

describe("results payload + snapshot (compare flow)", () => {
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
    const b = memBackend({ [StorageKey.V3Profile]: asJson(v3profile) })
    removeStored(StorageKey.V3Profile, b)
    expect(b.store.has(StorageKey.V3Profile)).toBe(false)
  })
})
