"use client";

import Link from "next/link";
import { dimLabel } from "@/lib/results-presentation";
import {
  selectPersonalization,
  usePersonalizationSnapshot,
} from "./compare-personalization";

/**
 * DetailMatchStrip — decision-hierarchy strip on `/laptops/[id]`.
 *
 * Reads the same stored v3 DTO + profile + binding as the compare island.
 * Renders ONLY when bound AND a stored item matches this laptopId: stored
 * overall (verbatim) + top-2 strengths evidence + "Back to results" link.
 * Every other state (catalog browsing, stale, unbound, no match) renders
 * null — zero claims, Mode B honesty.
 */
export function DetailMatchStrip({ laptopId }: { laptopId: string }) {
  const snap = usePersonalizationSnapshot();
  const entry =
    selectPersonalization([laptopId], snap.dto, snap.state)?.[0] ?? null;

  if (!entry) return null;

  return (
    <section
      aria-label="How this fits your answers"
      className="mb-8 rounded border border-accent/30 bg-accent/5 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-[10px] font-semibold uppercase tracking-wider text-accent">
          From your results · Match #{entry.rank} of {entry.total}
        </h2>
        <span className="font-mono text-xl font-bold text-foreground">
          {Number.isInteger(entry.overall) ? String(entry.overall) : entry.overall.toFixed(1)}
        </span>
      </div>
      {entry.strengths.length > 0 && (
        <ul className="mt-2 space-y-1">
          {entry.strengths.slice(0, 2).map(s => (
            <li key={s.dim} className="text-xs text-foreground">
              <span className="font-medium">{dimLabel(s.dim)}:</span>{" "}
              <span className="text-muted">{s.evidence}</span>
            </li>
          ))}
        </ul>
      )}
      <Link
        href="/results"
        className="mt-3 inline-block text-sm text-accent transition hover:underline"
      >
        Back to results
      </Link>
    </section>
  );
}
