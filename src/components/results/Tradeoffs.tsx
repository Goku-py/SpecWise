"use client";

import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import { dimLabel } from "@/lib/results-presentation";

/**
 * Compromises as dim labels + missed-preferred rows
 * ("You wanted {required}. This laptop has {actual}.").
 * Renders nothing when both lists are empty.
 */
export function Tradeoffs({ item }: { item: RankedItemDTO }) {
  const compromises = Array.isArray(item.compromises) ? item.compromises : [];
  const missed = Array.isArray(item.missedPreferred) ? item.missedPreferred : [];
  if (compromises.length === 0 && missed.length === 0) return null;
  return (
    <section aria-label="Trade-offs" className="mb-6">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        Trade-offs
      </h3>
      {compromises.length > 0 && (
        <ul className="mb-2 space-y-0.5">
          {compromises.map((c, i) => (
            <li key={i} className="font-mono text-xs text-muted">
              ~ {dimLabel(c)}
            </li>
          ))}
        </ul>
      )}
      {missed.length > 0 && (
        <ul className="space-y-1">
          {missed.map((m, i) => (
            <li key={i} className="text-xs text-muted">
              You wanted {m.required}. This laptop has {m.actual}.
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
