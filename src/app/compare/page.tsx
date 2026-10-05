import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveCatalog, getLaptopById, pickBestOffer } from "@/lib/catalog-cache";
import { prisma } from "@/lib/prisma";
import { getRegionFromCookies } from "@/lib/region";
import { formatPrice } from "@/lib/utils";
import {
  addCompareId,
  compareHref,
  parseCompareIds,
} from "@/lib/compare-select";
import { visibleCompareRows } from "@/components/compare/compare-rows";
import {
  CompareTable,
  type CompareTableColumn,
  type RivalSuggestion,
} from "@/components/compare/compare-table";
import { ComparePersonalization } from "@/components/compare/compare-personalization";
import type { LaptopDetail, PriceEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compare Laptops — SpecWise",
  description:
    "Side-by-side comparison of laptops: specs, prices, and trade-offs.",
};

/**
 * NOTE (Phase 7): the legacy `specwise-results` localStorage snapshot join is
 * INTENTIONALLY RETIRED. That key has no writer (reader-only since the v3
 * migration), so `?ids=` snapshot semantics always rendered empty for v3
 * users. Ids now resolve server-side via `getLaptopById`; misses are skipped
 * and listed honestly. Nothing breaks: absent ids render the empty state.
 */

function detailHrefOf(l: LaptopDetail): string {
  return `/laptops/${l.slug ?? encodeURIComponent(l.id)}`;
}

function priceFor(
  l: LaptopDetail,
  region: string,
): { label: string; stale: boolean; buyHref: string | null } {
  const regional = l.prices.filter((p: PriceEntry) => p.region === region);
  const { best, stale } = pickBestOffer(
    regional.map(p => ({
      price: p.price,
      inStock: p.inStock !== false,
      validUntil: p.validUntil ?? null,
    })),
  );
  if (!best) return { label: "Price unavailable", stale: false, buyHref: null };
  const row = regional
    .filter(p => p.price === best.price)
    .sort((x, y) => x.price - y.price)[0];
  return {
    label: formatPrice(best.price, row?.currency ?? "USD"),
    stale,
    buyHref: row?.affiliateUrl ?? row?.url ?? null,
  };
}

function toColumn(l: LaptopDetail, region: string): CompareTableColumn {
  const offer = priceFor(l, region);
  return {
    id: l.id,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    imageUrl: l.imageUrl,
    detailHref: detailHrefOf(l),
    priceLabel: offer.label,
    priceStale: offer.stale,
    buyHref: offer.buyHref,
  };
}

/**
 * Same-gpu-first, closest-screen-size rival heuristic. Duplicated (~15 lines)
 * from the detail route's local `pickRivals`, which is not importable from
 * that route module — kept in sync by convention, not by import.
 */
function suggestRivals(
  current: Pick<LaptopDetail, "id" | "gpuType" | "displaySize">,
  rows: Array<{
    id: string;
    slug: string | null;
    brand: string;
    model: string;
    displaySize: number;
    gpuType: string;
  }>,
  ids: string[],
  limit = 3,
): RivalSuggestion[] {
  const sameGpu = (gpuType: string) =>
    gpuType.toLowerCase() === current.gpuType.toLowerCase();
  const rank = (
    row: { displaySize: number; gpuType: string },
  ) => (sameGpu(row.gpuType) ? 2 : 0) - Math.abs(row.displaySize - current.displaySize);
  return rows
    .filter(row => Boolean(row.slug) && row.id !== current.id)
    .sort((a, b) => rank(b) - rank(a) || a.model.localeCompare(b.model))
    .slice(0, limit)
    .map(row => ({
      id: row.id,
      label: `${row.brand} ${row.model}`,
      href: compareHref(addCompareId(ids, row.id)),
    }));
}

function Shell({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/laptops"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>
      <header className="mb-6">
        <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
          Side-by-side comparison
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{sub}</p>
      </header>
      {children}
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const rawIds = sp.ids;
  const ids = parseCompareIds(
    Array.isArray(rawIds) ? rawIds.join(",") : (rawIds ?? null),
  );
  const region = await getRegionFromCookies();

  if (ids.length === 0) {
    return (
      <Shell
        title="Compare laptops"
        sub="Side-by-side specs and regional prices for up to three laptops."
      >
        <div className="rounded border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">
            No laptops selected
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Take the quiz to get matched laptops, or browse the catalog and
            open any laptop to start a comparison.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/quiz"
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Take the quiz
            </Link>
            <Link
              href="/laptops"
              className="rounded border border-border px-4 py-2 text-sm text-foreground transition hover:text-accent"
            >
              Browse laptops
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // Per-id resolution: misses are skipped (listed honestly below). A total
  // catalog failure (e.g. DB unreachable) throws for every id → honest error
  // state instead of an empty table.
  let catalogDown = false;
  const laptops: LaptopDetail[] = [];
  const missingIds: string[] = [];
  try {
    for (const id of ids) {
      const found = await getLaptopById(id).catch(() => null);
      if (found) laptops.push(found as LaptopDetail);
      else missingIds.push(id);
    }
  } catch {
    catalogDown = true;
  }

  // Total miss may mask a full catalog outage (per-id .catch swallows DB
  // errors). One uncached probe distinguishes outage from truly unlisted ids.
  if (!catalogDown && laptops.length === 0 && missingIds.length === ids.length && ids.length > 0) {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      catalogDown = true;
    }
  }

  if (catalogDown) {
    return (
      <Shell
        title="Compare laptops"
        sub="Side-by-side specs and regional prices for up to three laptops."
      >
        <div className="rounded border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">
            Catalog unavailable right now
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            We could not load laptop details. Please try again later.
          </p>
          <Link
            href="/laptops"
            className="mt-6 inline-block rounded border border-border px-4 py-2 text-sm text-foreground transition hover:text-accent"
          >
            Browse laptops
          </Link>
        </div>
      </Shell>
    );
  }

  if (laptops.length === 0) {
    return (
      <Shell
        title="Compare laptops"
        sub="Side-by-side specs and regional prices for up to three laptops."
      >
        <div className="rounded border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-foreground">
            These laptops are not listed
          </h2>
          <p className="mt-2 text-sm text-muted">Not listed: {missingIds.join(", ")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/results"
              className="rounded bg-accent px-4 py-2 text-sm font-medium text-background transition hover:opacity-90"
            >
              Back to results
            </Link>
            <Link
              href="/laptops"
              className="rounded border border-border px-4 py-2 text-sm text-foreground transition hover:text-accent"
            >
              Browse laptops
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  const { rows, hiddenCount } = visibleCompareRows(laptops);
  const columns = laptops.map(l => toColumn(l, region.code));
  const resolvedIds = laptops.map(l => l.id);

  let suggestions: RivalSuggestion[] = [];
  if (laptops.length === 1) {
    const [only] = laptops;
    const catalog = await getActiveCatalog(region.code).catch(() => []);
    suggestions = suggestRivals(
      only,
      catalog.map(c => ({
        id: c.id,
        slug: c.slug,
        brand: c.brand,
        model: c.model,
        displaySize: c.displaySize,
        gpuType: c.gpuType,
      })),
      resolvedIds,
    );
  }

  return (
    <Shell
      title="Compare laptops"
      sub={`${laptops.length} laptop${laptops.length === 1 ? "" : "s"} · prices for ${region.label}`}
    >
      <ComparePersonalization ids={resolvedIds} />
      <CompareTable
        columns={columns}
        rows={rows}
        hiddenCount={hiddenCount}
        ids={resolvedIds}
        allowRemove
        suggestions={suggestions}
      />
      {missingIds.length > 0 && (
        <p className="mt-3 text-xs text-muted">Not listed: {missingIds.join(", ")}</p>
      )}
      <p className="mt-6 text-xs text-muted">
        Prices shown for {region.label}. Run the{" "}
        <Link href="/quiz" className="text-accent transition hover:underline">
          laptop quiz
        </Link>{" "}
        to see which of these fits your workload.
      </p>
    </Shell>
  );
}
