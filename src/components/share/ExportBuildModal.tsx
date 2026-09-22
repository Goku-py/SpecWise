"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Check, Copy, Link2, Share2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { buildRedditMarkdown } from "@/lib/share"
import { formatPrice } from "@/lib/utils"
import type { ScoreableProduct } from "@/lib/recommendation"

interface ExportBuildModalProps {
  open: boolean
  onClose: () => void
  /** Top-ranked build; the drawer only mounts when this is set. */
  item: ScoreableProduct | null
  /** calculateBuildScore(...).score in [0,1] for `item`. */
  score: number
  /** Region currency for the price row. */
  currency: string
  /** Relative quiz path carrying the encoded answers. */
  shareUrl: string
}

type CopiedTarget = "markdown" | "link"

function toAbsolute(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  if (typeof window === "undefined") return url
  return new URL(url, window.location.origin).toString()
}

/**
 * Share / export drawer for a recommendation result. Copies a Reddit-ready
 * markdown spec table and the bookmarked-quiz link back to the clipboard.
 * Follows the same right-slide drawer pattern as the spec sheet.
 */
export function ExportBuildModal({ open, onClose, item, score, currency, shareUrl }: ExportBuildModalProps) {
  return (
    <AnimatePresence>
      {open && item && (
        <ExportBuildDrawer
          key="export-build"
          onClose={onClose}
          item={item}
          score={score}
          currency={currency}
          shareUrl={shareUrl}
        />
      )}
    </AnimatePresence>
  )
}

/**
 * Mounted only while open, so copy status resets on unmount instead of via an
 * effect — no cascading render, no stale "Copied!" on the next open.
 */
function ExportBuildDrawer({
  onClose,
  item,
  score,
  currency,
  shareUrl,
}: Omit<ExportBuildModalProps, "open" | "item"> & { item: ScoreableProduct }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [copied, setCopied] = useState<CopiedTarget | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  const absoluteUrl = toAbsolute(shareUrl)
  const markdown = buildRedditMarkdown(item, score, currency, absoluteUrl)
  const title = `${item.product.brandLabel} ${item.product.name}`.trim()
  const pct = Math.round(score * 100)

  async function copy(text: string, target: CopiedTarget) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(target)
      setError(null)
    } catch {
      setError("Copy failed — select the text below and copy it manually.")
    }
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-40 bg-black/60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={onClose}
        aria-hidden
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-build-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-background"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="flex items-start gap-2">
            <Share2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <h2 id="export-build-title" className="text-lg font-semibold text-foreground">
                Share your build
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                {title} · {pct}% match
                {item.price != null && Number.isFinite(item.price)
                  ? ` · ${formatPrice(item.price, currency)}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close share dialog"
            className="rounded p-1.5 text-muted transition hover:bg-card-hover hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {error && (
            <p
              role="alert"
              className="rounded border border-accent-danger/40 bg-accent-danger/10 px-3 py-2 text-xs text-accent-danger"
            >
              {error}
            </p>
          )}

          {/* Reddit markdown */}
          <section aria-labelledby="export-markdown-title">
            <h3
              id="export-markdown-title"
              className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent"
            >
              Reddit markdown
            </h3>
            <pre className="max-h-64 overflow-auto whitespace-pre rounded border border-border bg-card p-3 font-mono text-[11px] leading-relaxed text-foreground/90">
              {markdown}
            </pre>
            <Button
              size="sm"
              className="mt-3 w-full gap-2"
              onClick={() => copy(markdown, "markdown")}
            >
              {copied === "markdown" ? (
                <>
                  <Check className="h-4 w-4" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Reddit Markdown
                </>
              )}
            </Button>
            <p className="mt-2 text-[11px] text-muted">
              Paste into a post on r/buildapc or r/pcmasterrace.
            </p>
          </section>

          {/* Shareable link */}
          <section aria-labelledby="export-link-title">
            <h3
              id="export-link-title"
              className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-accent"
            >
              Shareable link
            </h3>
            <div className="flex items-center gap-2">
              <label htmlFor="export-share-url" className="sr-only">
                Shareable quiz link
              </label>
              <input
                id="export-share-url"
                readOnly
                value={absoluteUrl}
                onFocus={e => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded border border-border bg-card px-3 py-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2"
                onClick={() => copy(absoluteUrl, "link")}
              >
                {copied === "link" ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" /> Copy link
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-muted">
              Opens the quiz with your answers pre-filled, so the same matches can be
              re-ranked by anyone.
            </p>
          </section>
        </div>
      </motion.aside>
    </>
  )
}
