"use client";

interface ScoreBarsProps {
  w: number | null;
  c: number | null;
  v: number | null;
}

function Bar({ label, value }: { label: string; value: number }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div role="img" aria-label={`${label} ${clamped}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
          {label}
        </span>
        <span className="font-mono text-xs font-semibold text-foreground">
          {clamped}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-card-hover">
        <div
          className="h-full rounded-full bg-accent"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Parallel W/C/V bars sharing one 0–100 scale. Dual-encoded: the numeric
 * value is always visible text, never color-alone. V omitted gracefully
 * when null (no price data to compare).
 */
export function ScoreBars({ w, c, v }: ScoreBarsProps) {
  return (
    <div className="space-y-3">
      {typeof w === "number" && Number.isFinite(w) && (
        <Bar label="Workload" value={w} />
      )}
      {typeof c === "number" && Number.isFinite(c) && (
        <Bar label="Fit" value={c} />
      )}
      {typeof v === "number" && Number.isFinite(v) ? (
        <Bar label="Value" value={v} />
      ) : (
        <p className="font-mono text-[10px] text-muted">
          Value omitted — no price data to compare.
        </p>
      )}
    </div>
  );
}
