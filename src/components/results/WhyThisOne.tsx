"use client";

import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import { dimLabel } from "@/lib/results-presentation";

/**
 * Top-3 strengths as Sans sentences + mono dim tag + verbatim evidence.
 * No adjectives beyond the data — evidence strings pass through untouched.
 */
export function WhyThisOne({ item }: { item: RankedItemDTO }) {
  if (item.strengths.length === 0) return null;
  return (
    <section aria-label="Why this matches" className="mb-6">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
        Why this matches
      </h3>
      <ul className="space-y-1.5">
        {item.strengths.slice(0, 3).map((s, i) => (
          <li key={i} className="text-sm text-foreground">
            <span className="mr-2 font-mono text-[10px] uppercase tracking-wider text-accent">
              {dimLabel(s.dim)}
            </span>
            {s.evidence}
          </li>
        ))}
      </ul>
    </section>
  );
}
