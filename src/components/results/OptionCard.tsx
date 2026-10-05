"use client";

import Link from "next/link";
import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import { ProductImage } from "@/components/ui/product-image";
import { detailHref, dimLabel, formatPriceShort, resultImageSrc } from "@/lib/results-presentation";
import { buttonVariants } from "@/components/ui/button";

/**
 * Compact card for a non-top option: rank, name, overall score, one line of
 * evidence (first strength evidence, else first compromise label), details link.
 */
export function OptionCard({ item, rank }: { item: RankedItemDTO; rank: number }) {
  const price = formatPriceShort(item.price, item.currency);
  const strengths = Array.isArray(item.strengths) ? item.strengths : [];
  const compromises = Array.isArray(item.compromises) ? item.compromises : [];
  const evidenceLine =
    strengths.length > 0
      ? strengths[0].evidence
      : compromises.length > 0
        ? `Trade-off: ${dimLabel(compromises[0])}`
        : null;
  return (
    <article className="rounded border border-border bg-card p-5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted">
        #{rank}
      </div>
      <div className="mb-2 flex items-center gap-3">
        <ProductImage
          src={resultImageSrc(item)}
          alt={`${item.brand} ${item.model}`}
          width={96}
          height={64}
          sizes="96px"
          loading="lazy"
          className="max-h-16 object-contain"
        />
        <h3 className="font-semibold text-foreground">
          {item.brand} {item.model}
        </h3>
      </div>
      <p className="mt-1 font-mono text-xs text-muted">
        {price ?? "Price unavailable"} · {item.scores.overall} overall
      </p>
      {evidenceLine && (
        <p className="mt-2 text-xs text-muted">{evidenceLine}</p>
      )}
      <Link
        href={detailHref(item)}
        className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-3" })}
      >
        View details
      </Link>
    </article>
  );
}
