"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Monitor, Menu, X } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RegionPicker } from "./region-picker"
import type { RegionConfig } from "@/lib/regions"

interface NavItem {
  href: string
  label: string
}

const NAV_ITEMS: readonly NavItem[] = [
  { href: "/#workloads", label: "Workloads" },
  { href: "/#methodology", label: "Method" },
  { href: "/#machines", label: "Machines" },
  { href: "/#trust", label: "Trust" },
]

export function HeaderClient({ region }: { region: RegionConfig }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [compact, setCompact] = useState(false)
  const pathname = usePathname()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuFirstLinkRef = useRef<HTMLAnchorElement>(null)

  // Scroll compaction: reduce header height when scrolled past threshold
  useEffect(() => {
    function onScroll() {
      setCompact(window.scrollY > 8)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close the menu on Escape from anywhere
  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  // Focus management: focus first menu link on open, restore toggle on close
  useEffect(() => {
    if (!menuOpen) return
    const toggleEl = toggleRef.current
    menuFirstLinkRef.current?.focus()
    return () => toggleEl?.focus()
  }, [menuOpen])

  return (
    <header
      className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm"
      style={{
        transition: "height 150ms cubic-bezier(0.2,0,0,1)",
      }}
    >
      <div
        className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
        style={{
          height: compact ? "3rem" : "4rem",
          transition: "height 150ms cubic-bezier(0.2,0,0,1)",
        }}
      >
        <Link href="/" className="flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
          <Monitor className="h-4 w-4 text-accent" />
          <span className="font-mono text-xs tracking-wider uppercase">SpecWise</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 text-xs font-medium transition-colors uppercase tracking-wider",
                  isActive ? "text-accent" : "text-muted hover:text-foreground"
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 bg-accent" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <RegionPicker currentRegion={region} />
          <Link href="/quiz" className={cn(buttonVariants({ size: "sm" }))}>
            Find My Laptop
          </Link>
        </div>

        <button
          ref={toggleRef}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="inline-flex size-10 items-center justify-center rounded text-muted transition hover:bg-card-hover hover:text-foreground md:hidden"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu — inert when closed keeps links out of tab order */}
      <div
        id="mobile-menu"
        inert={!menuOpen}
        aria-hidden={!menuOpen}
        className={cn(
          "border-t border-border bg-background shadow-lg shadow-black/5 transition-[max-height,opacity] duration-200 ease-out md:hidden",
          menuOpen
            ? "max-h-[40rem] opacity-100 overflow-visible"
            : "max-h-0 opacity-0 overflow-hidden"
        )}
      >
        <div
          className="px-4 pb-5 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }, i) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  ref={i === 0 ? menuFirstLinkRef : undefined}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-card hover:text-foreground"
                  )}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="my-3 h-px bg-border" role="separator" />

          <div className="flex flex-col gap-2">
            <div className="flex min-h-11 items-center justify-between gap-3 rounded border border-border px-3">
              <span className="text-sm text-muted">Region</span>
              <RegionPicker currentRegion={region} placement="top" />
            </div>
          </div>

          <Link
            href="/quiz"
            onClick={() => setMenuOpen(false)}
            className={cn(buttonVariants({ size: "sm", className: "mt-3 w-full min-h-11" }))}
          >
            Find My Laptop
          </Link>
        </div>
      </div>
    </header>
  )
}
