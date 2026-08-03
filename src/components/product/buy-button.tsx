/**
 * src/components/product/buy-button.tsx — shared purchase-link anchor (phase 2c).
 *
 * Single component for every outbound "Buy" / "View Deal" / "View" retail
 * link. Responsibilities:
 *   - renders an <a> styled via the shared buttonVariants export (or a plain
 *     text-link when `plain` — used by the detail-page table link that keeps
 *     its exact visual classes + 44px hit-area trick),
 *   - ALWAYS sets rel={AFFILIATE_REL} ("noopener noreferrer sponsored" — FTC
 *     per-link disclosure),
 *   - preserves the pre-existing open-in-new-tab behavior (target="_blank",
 *     matching every previous call site; overridable),
 *   - renders nothing (null) when href is missing/falsy.
 *
 * Visual output is byte-identical to the previous hand-rolled anchors except
 * the added "sponsored" rel token.
 */
import type { ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"
import { AFFILIATE_REL } from "@/lib/affiliate"

type BuyButtonVariant = NonNullable<Parameters<typeof buttonVariants>[0]>["variant"]
type BuyButtonSize = NonNullable<Parameters<typeof buttonVariants>[0]>["size"]

interface BuyButtonProps {
  /** Final purchase href; null/undefined/"" renders nothing. */
  href?: string | null
  variant?: BuyButtonVariant
  size?: BuyButtonSize
  className?: string
  /** Link content. Defaults to "View Deal". */
  label?: ReactNode
  /**
   * When true, skips buttonVariants base styling entirely and emits exactly
   * `className` (raw link look). Only the detail-page table link uses this —
   * it must keep its exact classes + 44px hit-area (p-3.5 -m-3.5).
   */
  plain?: boolean
  /** Defaults to "_blank" — matches the pre-existing behavior on all sites. */
  target?: string
}

export function BuyButton({
  href,
  variant,
  size,
  className,
  label = "View Deal",
  plain = false,
  target = "_blank",
}: BuyButtonProps) {
  if (!href) return null

  return (
    <a
      href={href}
      target={target}
      rel={AFFILIATE_REL}
      className={plain ? className : buttonVariants({ variant, size, className })}
    >
      {label}
    </a>
  )
}
