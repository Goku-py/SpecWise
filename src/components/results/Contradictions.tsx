"use client";

/** Engine contradiction notes, verbatim, under a friendly heading. */
export function Contradictions({ items }: { items: string[] }) {
  const rows = Array.isArray(items) ? items.filter((c) => typeof c === "string" && c.length > 0) : [];
  if (rows.length === 0) return null;
  return (
    <div className="rounded border border-border bg-card p-4">
      <h3 className="mb-1 text-sm font-medium text-foreground">Worth knowing</h3>
      <ul className="space-y-1">
        {rows.map((c, i) => (
          <li key={i} className="text-xs text-muted">
            {c}
          </li>
        ))}
      </ul>
    </div>
  );
}
