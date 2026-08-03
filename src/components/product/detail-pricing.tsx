"use client"

import { useMemo } from "react"
import { ExternalLink } from "lucide-react"
import { BuyButton } from "./buy-button"
import { formatPrice, cn } from "@/lib/utils"
import { useClientRegion } from "@/lib/region-store"
import { getRegion } from "@/lib/regions"

/**
 * Region-reactive pricing for the laptop detail page.
 *
 * The page itself stays ISR/static (SEO + canonical URLs), so prices render
 * with the "US" server snapshot during SSR/hydration and switch to the
 * visitor's actual region immediately after mount. When the visitor changes
 * region in the header, both components re-render instantly — no reload, no
 * stale currency (issue #4).
 *
 * Only the SELECTED region's rows are shown, all formatted in that region's
 * currency — never a mix of currencies (issue #3).
 */

export interface DetailPriceRow {
  retailer: string
  region: string
  currency: string
  price: number
  url: string | null
  affiliateUrl: string | null
  href: string | null
}

const US = getRegion("US")

/** Hero price line: min–max of the selected region's offers. */
export function DetailPriceLine({ rows }: { rows: DetailPriceRow[] }) {
  const region = useClientRegion(US)
  const local = useMemo(
    () => rows.filter(r => r.region === region.code),
    [rows, region.code]
  )
  if (local.length === 0) return null

  const prices = local.map(r => r.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const currency = local[0].currency

  return (
    <p className="mt-3 text-lg font-semibold text-foreground">
      {min === max
        ? formatPrice(min, currency)
        : `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`}
    </p>
  )
}

/** "Pricing by Retailer" table, scoped to the selected region. */
export function DetailPricingTable({ rows }: { rows: DetailPriceRow[] }) {
  const region = useClientRegion(US)
  const local = useMemo(
    () => rows.filter(r => r.region === region.code),
    [rows, region.code]
  )
  if (local.length === 0) return null

  return (
    <div className="mt-6 animate-fade-in rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="mb-4 text-base font-semibold text-foreground">Pricing by Retailer</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 pr-4 font-medium">Retailer</th>
              <th className="pb-2 pr-4 font-medium">Price</th>
              <th className="pb-2 pr-4 font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {local.map((p, i) => (
              <tr
                key={`${p.retailer}-${p.region}`}
                className={cn("border-b border-border last:border-0", i % 2 === 0 && "bg-background/30")}
              >
                <td className="py-2.5 pr-4 font-medium text-foreground">{p.retailer}</td>
                <td className="py-2.5 pr-4 font-semibold text-foreground">
                  {formatPrice(p.price, p.currency)}
                </td>
                <td className="py-2.5">
                  <BuyButton
                    plain
                    href={p.href}
                    className="inline-flex items-center gap-1 p-3.5 -m-3.5 text-accent transition hover:underline"
                    label={
                      <>
                        Buy <ExternalLink className="h-3.5 w-3.5" />
                      </>
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
