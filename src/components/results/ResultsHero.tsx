"use client";

import Link from "next/link";
import { FScoreMeter } from "@/components/charts/f-score-meter";
import { ProductImage } from "@/components/ui/product-image";
import { buttonVariants } from "@/components/ui/button";
import type { RankedItemDTO } from "@/lib/recommend/v3/types";
import {
  detailHref,
  formatPriceShort,
  resultImageSrc,
  tierLabel,
  verdictFor,
} from "@/lib/results-presentation";
import { ScoreBars } from "./ScoreBars";

interface ResultsHeroProps {
  item: RankedItemDTO;
  rank: number;
  total: number;
}

/**
 * Best-match hero: eyebrow, H2 name, tier-keyed verdict (Sans advises),
 * FScoreMeter + W/C/V bars (mono cites), price line, modest image slot,
 * primary actions [View details] + [Refine answers].
 */
export function ResultsHero({ item, rank, total }: ResultsHeroProps) {
  const price = formatPriceShort(item.price, item.currency);
  return (
    <section
      aria-labelledby="best-match-heading"
      className="mb-6 rounded border border-border bg-card p-6"
    >
      <div className="mb-2 font-mono text-xs uppercase tracking-widest text-accent">
        Best match · #{rank} of {total}
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-3">
          <FScoreMeter score={item.scores.overall} size={132} />
          <ProductImage
            src={resultImageSrc(item)}
            alt={`${item.brand} ${item.model}`}
            width={120}
            height={90}
            sizes="120px"
            className="h-[90px] w-[120px]"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="best-match-heading" className="text-xl font-semibold text-foreground">
            {item.brand} {item.model}
          </h2>
          <p className="mt-1 text-sm text-foreground">{verdictFor(item)}</p>
          <p className="mt-2 font-mono text-sm text-muted">
            {price ?? "Price unavailable"}
            {item.priceStale && price != null && " (stale)"}
            {item.variant ? ` · ${item.variant}` : ""}
          </p>
          <div className="mt-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {tierLabel(item.confidence)} confidence
            </span>
            {item.confidenceFactors.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {item.confidenceFactors.slice(0, 4).map((f, i) => (
                  <li key={i} className="font-mono text-[10px] text-muted">
                    · {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="mt-4 max-w-sm">
            <ScoreBars w={item.scores.W} c={item.scores.C} v={item.scores.V} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={detailHref(item)} className={buttonVariants()}>
              View details
            </Link>
            <Link
              href="/quiz"
              className={buttonVariants({ variant: "secondary" })}
            >
              Refine answers
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
