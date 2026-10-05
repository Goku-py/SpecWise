"use client";

import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import { dimLabel, overallGap } from "@/lib/results-presentation";

interface WhyAboveProps {
  top: RankedItemDTO;
  second: RankedItemDTO | null;
}

/**
 * "Why above #N" — up to 2 won rows (+delta), up to 2 lost rows, plus the
 * overall-gap line. Renders only when whyAbove is non-null AND at least one
 * of won/lost is non-empty.
 */
export function WhyAbove({ top, second }: WhyAboveProps) {
  const why = top.whyAbove;
  if (!why) return null;
  const won = Array.isArray(why.won) ? why.won.slice(0, 2) : [];
  const lost = Array.isArray(why.lost) ? why.lost.slice(0, 2) : [];
  if (won.length === 0 && lost.length === 0) return null;
  const gap = second ? overallGap(top, second) : null;
  return (
    <section aria-label="Why ranked above the next option" className="mb-6">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        Why above #{2}
      </h3>
      <ul className="space-y-0.5">
        {won.map((w, i) => (
          <li key={`w${i}`} className="font-mono text-xs text-foreground">
            + {dimLabel(w.dim)} ({typeof w.delta === "number" ? `+${w.delta.toFixed(2)}` : "—"})
          </li>
        ))}
        {lost.map((l, i) => (
          <li key={`l${i}`} className="font-mono text-xs text-muted">
            − {dimLabel(l.dim)} ({typeof l.delta === "number" ? l.delta.toFixed(2) : "—"})
          </li>
        ))}
      </ul>
      {typeof gap === "number" && (
        <p className="mt-1 font-mono text-[10px] text-muted">
          Overall gap: +{gap.toFixed(2)} over the next option.
        </p>
      )}
    </section>
  );
}
