import { Monitor } from "lucide-react"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Monitor className="h-4 w-4 text-accent" />
            <span>SpecWise — Find your perfect laptop</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-muted">
            <span>Not affiliated with any manufacturer.</span>
            <span>Prices may vary by region and time.</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
