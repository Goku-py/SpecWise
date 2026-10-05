"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  defaultBackend,
  readEnvelope,
  readValidated,
  StorageKey,
  validateV3Profile,
  validateV3Results,
} from "@/lib/storage";
import { bindingStateFor, readBinding, type BindingState } from "@/lib/result-binding";
import { asRecommendationDTO } from "@/lib/results-presentation";
import { dimLabel } from "@/lib/results-presentation";
import type { RecommendationDTO } from "@/lib/recommend/v3/types";
import { StaleNotice } from "@/components/results/ResultsStates";

/**
 * ComparePersonalization — display-only island over the STORED v3 DTO.
 *
 * Shows each compared id's stored `scores.overall`, W/C/V, rank position
 * (index in stored items), and strengths + evidence. NOTHING is recomputed:
 * `selectPersonalization` copies stored fields verbatim (unit-tested). Bound
 * binding required; stale reuses `StaleNotice`; unbound renders nothing.
 */

export interface PersonalizationEntry {
  laptopId: string;
  /** 1-based position in the stored engine order (display only). */
  rank: number;
  total: number;
  overall: number;
  w: number;
  c: number;
  v: number | null;
  strengths: Array<{ dim: string; evidence: string }>;
}

function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Pure projection: stored DTO fields in, display entries out. Verbatim copy —
 * no deltas, no ranks computed beyond the stored index, no winners.
 */
export function selectPersonalization(
  ids: readonly string[],
  dto: RecommendationDTO | null | undefined,
  state: BindingState,
): PersonalizationEntry[] | null {
  if (state !== "bound" || !dto) return null;
  const out: PersonalizationEntry[] = [];
  for (const id of ids) {
    const index = dto.items.findIndex(item => item.laptopId === id);
    if (index === -1) continue;
    const item = dto.items[index];
    out.push({
      laptopId: id,
      rank: index + 1,
      total: dto.items.length,
      overall: item.scores.overall,
      w: item.scores.W,
      c: item.scores.C,
      v: item.scores.V,
      strengths: item.strengths.map(s => ({ dim: s.dim, evidence: s.evidence })),
    });
  }
  return out;
}

/**
 * Shared store subscription for the personalization islands (compare table +
 * detail strip + results compare entry). Same `useSyncExternalStore` idiom
 * as the legacy compare + theme provider: SSR/hydration see the empty server
 * snapshot, the client snapshot only after mount.
 */
export interface PersonalizationSnapshot {
  dto: RecommendationDTO | null;
  state: BindingState;
}

const SERVER_SNAPSHOT: PersonalizationSnapshot = { dto: null, state: "unbound" };

let cachedKey: string | null = null;
let cachedSnap: PersonalizationSnapshot | null = null;

function subscribePersonalization(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getPersonalizationSnapshot(): PersonalizationSnapshot {
  const backend = defaultBackend();
  const key = JSON.stringify([
    readEnvelope(StorageKey.V3Results, backend),
    readEnvelope(StorageKey.V3Profile, backend),
    readEnvelope(StorageKey.Binding, backend),
  ]);
  if (cachedSnap && cachedKey === key) return cachedSnap;
  const dto = asRecommendationDTO(
    readValidated(StorageKey.V3Results, validateV3Results, backend),
  );
  const profile = readValidated(StorageKey.V3Profile, validateV3Profile, backend);
  const snap: PersonalizationSnapshot = {
    dto,
    state: bindingStateFor(profile, readBinding(backend)),
  };
  cachedKey = key;
  cachedSnap = snap;
  return snap;
}

function getPersonalizationServerSnapshot(): PersonalizationSnapshot {
  return SERVER_SNAPSHOT;
}

export function usePersonalizationSnapshot(): PersonalizationSnapshot {
  return useSyncExternalStore(
    subscribePersonalization,
    getPersonalizationSnapshot,
    getPersonalizationServerSnapshot,
  );
}

export function ComparePersonalization({ ids }: { ids: string[] }) {
  // Store subscription (same idiom as the legacy compare + theme provider):
  // SSR/hydration see the empty server snapshot, the client snapshot only
  // after mount — no hydration mismatch, no setState-in-effect.
  const snap = usePersonalizationSnapshot();
  if (snap.state === "stale") return <StaleNotice />;
  const entries = selectPersonalization(ids, snap.dto, snap.state);
  if (!entries || entries.length === 0) return null;

  return (
    <section
      aria-label="How these fit your answers"
      className="mb-8 rounded border border-border bg-card p-5 sm:p-6"
    >
      <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
        How these fit your answers
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {entries.map(e => (
          <div key={e.laptopId} className="rounded border border-border p-4">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-2xl font-bold text-foreground">
                {formatScore(e.overall)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                Match #{e.rank} of {e.total}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">
              W {formatScore(e.w)} · C {formatScore(e.c)}
              {e.v != null ? ` · V ${formatScore(e.v)}` : ""}
            </p>
            {e.strengths.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {e.strengths.slice(0, 2).map(s => (
                  <li key={s.dim} className="text-xs text-foreground">
                    <span className="font-medium">{dimLabel(s.dim)}:</span>{" "}
                    <span className="text-muted">{s.evidence}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      <Link
        href="/results"
        className="mt-4 inline-block text-sm text-accent transition hover:underline"
      >
        Back to results
      </Link>
    </section>
  );
}
