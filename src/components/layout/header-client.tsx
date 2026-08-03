"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Monitor, Menu, X, Wand2, LayoutGrid, BarChart3 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RegionPicker } from "./region-picker"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import type { RegionConfig } from "@/lib/regions"

const navItems = [
  { href: "/quiz", label: "Find a Laptop", icon: Wand2 },
  { href: "/laptops", label: "Catalog", icon: LayoutGrid },
  { href: "/compare", label: "Compare", icon: BarChart3 },
]

export function HeaderClient({ region }: { region: RegionConfig }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const toggleRef = useRef<HTMLButtonElement>(null)
  const menuFirstLinkRef = useRef<HTMLAnchorElement>(null)

  // Close the menu on Escape from anywhere (focus may be on the toggle button,
  // which lives outside the menu container).
  useEffect(() => {
    if (!menuOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [menuOpen])

  // Focus management: move focus to the first menu link on open, restore it to
  // the toggle button on close (cleanup runs when menuOpen flips to false).
  useEffect(() => {
    if (!menuOpen) return
    const toggleEl = toggleRef.current
    menuFirstLinkRef.current?.focus()
    return () => toggleEl?.focus()
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
          <Monitor className="h-5 w-5 text-accent" />
          SpecWise
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "text-accent" : "text-muted hover:text-foreground"
                )}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-accent" />
                )}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          <RegionPicker currentRegion={region} />
          <Link href="/quiz" className={buttonVariants({ size: "sm" })}>
            Get Started
          </Link>
        </div>

        <button
          ref={toggleRef}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="inline-flex size-11 items-center justify-center rounded-lg text-muted transition hover:bg-card-hover hover:text-foreground md:hidden"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu — animated sheet. `inert` when closed keeps its links out
          of the tab order (the old panel was display:none, but hidden focusable
          links are an a11y failure). */}
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
          <nav role="navigation" aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navItems.map(({ href, label, icon: Icon }, i) => {
              const isActive = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  ref={i === 0 ? menuFirstLinkRef : undefined}
                  onClick={() => setMenuOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-accent/10 text-accent"
                      : "text-muted hover:bg-card hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="my-3 h-px bg-border" role="separator" />

          <div className="flex flex-col gap-2">
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3">
              <span className="text-sm text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg border border-border px-3">
              <span className="text-sm text-muted">Region</span>
              <RegionPicker currentRegion={region} placement="top" />
            </div>
          </div>

          <Link
            href="/quiz"
            onClick={() => setMenuOpen(false)}
            className={buttonVariants({ size: "sm", className: "mt-3 w-full" })}
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  )
}