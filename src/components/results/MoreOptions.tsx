"use client";

import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import { OptionCard } from "./OptionCard";

/** Runners-up in engine order (never re-sorted). Renders nothing when ≤1 item. */
export function MoreOptions({ items }: { items: RankedItemDTO[] }) {
  if (!Array.isArray(items) || items.length <= 1) return null;
  return (
    <section aria-labelledby="more-options-heading" className="mb-6">
      <h2 id="more-options-heading" className="mb-4 text-lg font-bold text-foreground">
        More options
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.slice(1).map((item, idx) => (
          <OptionCard key={item.laptopId} item={item} rank={idx + 2} />
        ))}
      </div>
    </section>
  );
}
