"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { BuyButton } from "@/components/product/buy-button";
import { ProductImage } from "@/components/ui/product-image";
import { compareHref, removeCompareId } from "@/lib/compare-select";
import type { VisibleCompareRow } from "./compare-rows";

// Arrow keys scroll the horizontally scrollable table region so keyboard-only
// users can reach off-screen columns (WCAG 2.1.1, kept from legacy compare).
function handleTableScrollKeyDown(e: KeyboardEvent<HTMLDivElement>) {
  if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
  e.preventDefault();
  e.currentTarget.scrollBy({ left: e.key === "ArrowLeft" ? -120 : 120 });
}

export interface CompareTableColumn {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  imageUrl: string | null;
  detailHref: string;
  /** Pre-formatted region price ("Price unavailable" when no offer). */
  priceLabel: string;
  priceStale: boolean;
  buyHref: string | null;
}

export interface RivalSuggestion {
  id: string;
  label: string;
  href: string;
}

interface CompareTableProps {
  columns: CompareTableColumn[];
  rows: VisibleCompareRow[];
  hiddenCount: number;
  /** Current column ids (drives remove links). */
  ids: string[];
  /** Render per-column remove links (only when >1 column). */
  allowRemove: boolean;
  suggestions?: RivalSuggestion[];
}

function nameOf(c: CompareTableColumn): string {
  return `${c.brand} ${c.model}${c.variant ? ` (${c.variant})` : ""}`;
}

export function CompareTable({
  columns,
  rows,
  hiddenCount,
  ids,
  allowRemove,
  suggestions,
}: CompareTableProps) {
  return (
    <div>
      {/* Mobile: stacked per-laptop sections (intentional, not a compressed table) */}
      <div className="space-y-4 sm:hidden">
        {columns.map(col => (
          <article
            key={col.id}
            className="rounded border border-border bg-card p-5"
          >
            <div className="mb-3 flex items-center justify-center rounded bg-background/40 p-4">
              <ProductImage
                src={col.imageUrl}
                alt={`${col.brand} ${col.model}`}
                width={240}
                height={150}
                sizes="(max-width: 640px) 80vw, 240px"
                className="max-h-36 object-contain"
              />
            </div>
            <Link
              href={col.detailHref}
              className="text-base font-semibold text-foreground transition hover:text-accent"
            >
              {nameOf(col)}
            </Link>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {col.priceLabel}
              {col.priceStale && (
                <span className="ml-2 text-xs font-normal text-muted">
                  may be outdated
                </span>
              )}
            </p>
            <dl className="mt-4 space-y-0">
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-2 text-sm"
                >
                  <dt className="shrink-0 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                    {row.label}
                  </dt>
                  <dd className="text-right font-mono text-xs text-foreground">
                    {row.cells[i]}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <BuyButton href={col.buyHref} size="sm" label="View Deal" />
              {allowRemove && columns.length > 1 && (
                <Link
                  href={compareHref(removeCompareId(ids, col.id))}
                  aria-label={`Remove ${nameOf(col)} from comparison`}
                  className="inline-flex items-center rounded border border-border px-3 py-1.5 text-xs text-muted transition hover:text-foreground"
                >
                  Remove
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Desktop: sticky-first-column table */}
      <div className="hidden overflow-hidden rounded border border-border bg-card shadow-sm sm:block">
        <div
          role="region"
          aria-label="Laptop comparison table, horizontally scrollable"
          tabIndex={0}
          onKeyDown={handleTableScrollKeyDown}
          className="overflow-x-auto focus-visible:outline-none"
        >
          <table className="w-full min-w-[600px] border-collapse">
            <thead>
              <tr className="bg-elevated">
                <th className="sticky left-0 z-10 min-w-[140px] bg-elevated px-4 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Spec
                </th>
                {columns.map(col => (
                  <th key={col.id} className="min-w-[200px] px-3 pb-4 pt-3 text-left align-top">
                    <div className="mb-2 flex items-center justify-center rounded bg-background/40 p-2">
                      <ProductImage
                        src={col.imageUrl}
                        alt={`${col.brand} ${col.model}`}
                        width={160}
                        height={100}
                        sizes="160px"
                        className="max-h-20 object-contain"
                      />
                    </div>
                    <div className="font-mono text-[10px] text-muted">{col.brand}</div>
                    <Link
                      href={col.detailHref}
                      className="text-sm font-semibold text-foreground transition hover:text-accent"
                    >
                      {col.model}
                      {col.variant && <span className="text-muted"> ({col.variant})</span>}
                    </Link>
                    <div className="mt-1 text-sm font-semibold text-foreground">
                      {col.priceLabel}
                      {col.priceStale && (
                        <span className="ml-1 text-[10px] font-normal text-muted">
                          may be outdated
                        </span>
                      )}
                    </div>
                    {allowRemove && columns.length > 1 && (
                      <Link
                        href={compareHref(removeCompareId(ids, col.id))}
                        aria-label={`Remove ${nameOf(col)} from comparison`}
                        className="mt-1 inline-block text-xs text-muted transition hover:text-foreground hover:underline"
                      >
                        Remove
                      </Link>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.label}
                  className="border-b border-border transition-colors hover:bg-accent/5"
                >
                  <td className="sticky left-0 z-10 bg-card px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-wider text-muted">
                    {row.label}
                  </td>
                  {row.cells.map((cell, i) => (
                    <td key={columns[i].id} className="px-3 py-3 font-mono text-xs text-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="sticky left-0 z-10 bg-card px-4 py-4" />
                {columns.map(col => (
                  <td key={col.id} className="px-3 py-4">
                    <BuyButton
                      href={col.buyHref}
                      size="sm"
                      className="w-full"
                      label="View Deal"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {hiddenCount > 0 && (
        <p className="mt-3 text-xs text-muted">
          {hiddenCount} identical spec{hiddenCount === 1 ? "" : "s"} hidden — every
          laptop compared lists the same value.
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <section
          aria-labelledby="add-rival-heading"
          className="mt-8 rounded border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="add-rival-heading" className="text-base font-semibold text-foreground">
            Add a rival
          </h2>
          <p className="mb-4 mt-1 text-xs text-muted">
            Similar devices you can add to this comparison.
          </p>
          <ul className="space-y-2">
            {suggestions.map(s => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className="text-sm text-accent transition hover:underline"
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
