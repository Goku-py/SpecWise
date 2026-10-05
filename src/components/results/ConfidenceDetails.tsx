"use client";

import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import { tierLabel } from "@/lib/results-presentation";

/** Collapsible confidence detail: tier, completeness %, factors, freshness. */
export function ConfidenceDetails({ item }: { item: RankedItemDTO }) {
  const factors = Array.isArray(item.confidenceFactors)
    ? item.confidenceFactors.slice(0, 4)
    : [];
  const freshness = item.priceMissing
    ? "No price data was available for this laptop."
    : item.priceStale
      ? "Price data may be outdated."
      : "Price data is current.";
  return (
    <details className="rounded border border-border bg-card p-4">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        Confidence: {tierLabel(item.confidence)}
      </summary>
      <div className="mt-2 space-y-1">
        <p className="font-mono text-xs text-muted">
          Data completeness: {item.dataCompleteness}%
        </p>
        {factors.length > 0 && (
          <ul className="space-y-0.5">
            {factors.map((f, i) => (
              <li key={i} className="font-mono text-[10px] text-muted">
                · {f}
              </li>
            ))}
          </ul>
        )}
        <p className="font-mono text-[10px] text-muted">{freshness}</p>
      </div>
    </details>
  );
}
