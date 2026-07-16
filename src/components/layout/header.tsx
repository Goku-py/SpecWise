"use client"

import Link from "next/link"
import { useState } from "react"
import { Monitor, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RegionPicker } from "./region-picker"
import { ThemeToggle } from "@/components/theme/theme-toggle"

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <Monitor className="h-5 w-5 text-accent" />
          SpecWise
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/quiz" className="text-sm text-muted transition hover:text-foreground">
            Find a Laptop
          </Link>
          <Link href="/laptops" className="text-sm text-muted transition hover:text-foreground">
            Browse Laptops
          </Link>
          <Link href="/compare" className="text-sm text-muted transition hover:text-foreground">
            Compare
          </Link>
          <ThemeToggle />
          <RegionPicker />
          <Link href="/quiz">
            <Button size="sm">Get Started</Button>
          </Link>
        </nav>

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
        <nav role="navigation" className="flex flex-col gap-3">
          <Link href="/quiz" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card hover:text-foreground">
            Find a Laptop
          </Link>
          <Link href="/laptops" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card hover:text-foreground">
            Browse Laptops
          </Link>
          <Link href="/compare" className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-card hover:text-foreground">
            Compare
          </Link>
          <div className="flex items-center gap-2 px-3">
            <ThemeToggle />
            <RegionPicker />
          </div>
          <Link href="/quiz">
            <Button size="sm" className="w-full">Get Started</Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
