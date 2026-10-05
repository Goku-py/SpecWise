/**
 * Unit tests for the profile↔result binding (Phase 5 — refine-and-rerun).
 * Fixtures are fixture-only CanonicalProfile shapes; they assert binding
 * behavior, never engine scoring.
 */
import { describe, expect, it } from "vitest";
import {
  bindingStateFor,
  clearBinding,
  fingerprintProfile,
  readBinding,
  validateBinding,
  writeBinding,
} from "@/lib/result-binding";
import type { StorageBackend } from "@/lib/storage";
import type { CanonicalProfile } from "@/lib/recommend/v3/types";

function profile(over: Partial<CanonicalProfile> = {}): CanonicalProfile {
  return {
    schemaVersion: "v3",
    region: "US",
    currency: "USD",
    workloads: [{ id: "dev", importance: "primary", subprofile: "standard" }],
    budget: { min: 50000, max: 100000, noMax: false, currency: "USD" },
    priorities: ["speed"],
    requirements: [],
    ...over,
  };
}

/** Deep key-order reversal (same content, different insertion order). */
function reverseKeysDeep(u: unknown): unknown {
  if (Array.isArray(u)) return u.map(reverseKeysDeep);
  if (typeof u === "object" && u !== null) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(u).reverse())
      out[k] = reverseKeysDeep((u as Record<string, unknown>)[k]);
    return out;
  }
  return u;
}

/** In-memory backend (mirrors the injectable-backend pattern in storage.ts). */
function memBackend(): StorageBackend {
  const store = new Map<string, string>();
  return {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

describe("fingerprintProfile", () => {
  it("is stable across calls for the same profile", () => {
    const p = profile();
    expect(fingerprintProfile(p)).toBe(fingerprintProfile(profile()));
    expect(fingerprintProfile(p)).toMatch(/^[0-9a-f]{8}$/);
  });

  it("is invariant to object key order", () => {
    const a = profile({ priorities: ["speed", "battery"] });
    const reordered = reverseKeysDeep(a) as CanonicalProfile;
    // Sanity: same content, genuinely different key order.
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(a));
    expect(reordered).toEqual(a);
    expect(fingerprintProfile(a)).toBe(fingerprintProfile(reordered));
  });

  it("differs when priorities differ", () => {
    expect(fingerprintProfile(profile({ priorities: ["speed"] }))).not.toBe(
      fingerprintProfile(profile({ priorities: ["battery"] })),
    );
  });

  it("differs when workloads or budget differ", () => {
    expect(fingerprintProfile(profile())).not.toBe(
      fingerprintProfile(
        profile({
          workloads: [{ id: "gaming", importance: "primary", subprofile: "both" }],
        }),
      ),
    );
    expect(fingerprintProfile(profile())).not.toBe(
      fingerprintProfile(
        profile({
          budget: { min: 50000, max: 200000, noMax: false, currency: "USD" },
        }),
      ),
    );
  });
});

describe("bindingStateFor", () => {
  it("bound when the stored profile fingerprints to the binding", () => {
    const p = profile();
    expect(
      bindingStateFor(p, { fingerprint: fingerprintProfile(p) }),
    ).toBe("bound");
  });

  it("stale when the profile mismatches the binding", () => {
    const binding = { fingerprint: fingerprintProfile(profile()) };
    expect(
      bindingStateFor(profile({ priorities: ["battery"] }), binding),
    ).toBe("stale");
  });

  it("stale when the stored profile is missing (answers cleared after results)", () => {
    const binding = { fingerprint: fingerprintProfile(profile()) };
    expect(bindingStateFor(null, binding)).toBe("stale");
  });

  it("unbound when there is no binding (pre-Phase-5 results)", () => {
    expect(bindingStateFor(profile(), null)).toBe("unbound");
  });
});

describe("write/read/clear round-trip (in-memory backend)", () => {
  it("round-trips the fingerprint of the written profile", () => {
    const backend = memBackend();
    const p = profile();
    writeBinding(p, backend);
    expect(readBinding(backend)).toEqual({
      fingerprint: fingerprintProfile(p),
    });
    expect(bindingStateFor(p, readBinding(backend))).toBe("bound");
  });

  it("clearBinding removes the binding (Start over flow)", () => {
    const backend = memBackend();
    writeBinding(profile(), backend);
    clearBinding(backend);
    expect(readBinding(backend)).toBeNull();
    expect(bindingStateFor(profile(), readBinding(backend))).toBe("unbound");
  });

  it("rejects malformed binding payloads as absent", () => {
    expect(validateBinding(null)).toBeNull();
    expect(validateBinding({})).toBeNull();
    expect(validateBinding({ fingerprint: "" })).toBeNull();
    expect(validateBinding({ fingerprint: 42 })).toBeNull();
  });
});

describe("replacement behavior (re-submit replaces the binding)", () => {
  it("submitting profile B after results A: old result cannot present as new", () => {
    const backend = memBackend();
    const answersA = profile({ priorities: ["speed"] });
    const answersB = profile({ priorities: ["battery"] });

    writeBinding(answersA, backend); // first submit
    writeBinding(answersB, backend); // refine + re-submit overwrites

    const binding = readBinding(backend);
    expect(binding?.fingerprint).toBe(fingerprintProfile(answersB));
    expect(bindingStateFor(answersB, binding)).toBe("bound");
    expect(bindingStateFor(answersA, binding)).toBe("stale");
  });
});

// NOT-RUNNABLE in node env (no DOM/jsdom, no clipboard, no router/fetch):
// recorded, not faked.
describe.skip("browser-only cases (NOT-RUNNABLE in node)", () => {
  it("quiz submit writes the binding for the EXACT profile POSTed", () => {});
  it("Copy answers link writes the absolute share URL to the clipboard", () => {});
  it("results view shows the same StaleNotice for fingerprint-stale bindings", () => {});
});
