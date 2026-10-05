"use client";

import type { RelaxEntry } from "@/lib/recommend/v3/types";
import { relaxSummary } from "@/lib/results-presentation";

interface MatchingLedgerProps {
  relaxed: boolean;
  ledger: RelaxEntry[];
}

/**
 * Relaxation ledger, verbatim (no rewording of engine text).
 * Renders NOTHING unless relaxed && ledger non-empty.
 */
export function MatchingLedger({ relaxed, ledger }: MatchingLedgerProps) {
  const rows = relaxSummary(ledger);
  if (!relaxed || rows.length === 0) return null;
  return (
    <div role="status" className="rounded border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-semibold text-foreground">
        Some constraints were adjusted to find matches.
      </p>
      <ul className="mt-2 space-y-1">
        {rows.map((e, i) => (
          <li key={i} className="font-mono text-xs text-muted">
            {e.requirement}: {e.from} → {e.to} — {e.reason}
          </li>
        ))}
      </ul>
    </div>
  );
}
