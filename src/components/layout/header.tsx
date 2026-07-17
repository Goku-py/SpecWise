"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Monitor, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RegionPicker } from "./region-picker"
import { ThemeToggle } from "@/components/theme/theme-toggle"

const navItems = [
  { href: "/quiz", label: "Find a Laptop" },
  { href: "/laptops", label: "Catalog" },
  { href: "/compare", label: "Compare" },
]

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-foreground">
          <Monitor className="h-5 w-5 text-accent" />
          SpecWise
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
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
          <RegionPicker />
          <Link href="/quiz">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="text-muted md:hidden"
          aria-label="Menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div
        id="mobile-menu"
        aria-hidden={!menuOpen}
        onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
        className={cn(
          "border-t border-border bg-background px-4 pb-4 pt-2 md:hidden",
          menuOpen ? "block" : "hidden"
        )}
      >
        <nav role="navigation" className="flex flex-col gap-1">
          {navItems.map(({ href, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-card hover:text-foreground"
                )}
              >
                {label}
              </Link>
            )
          })}
          <div className="flex items-center gap-2 px-3 pt-2">
            <ThemeToggle />
            <RegionPicker />
          </div>
          <div className="px-3 pt-1">
            <Link href="/quiz" onClick={() => setMenuOpen(false)}>
              <Button size="sm" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
