import Link from "next/link"
import { Monitor } from "lucide-react"
import { SCORING_VERSION_V3 } from "@/lib/recommend/v3/types"

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Column 1: Engine Metadata */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Monitor className="h-4 w-4 text-accent" />
              <span className="font-mono text-xs font-bold tracking-wider uppercase text-foreground">SpecWise</span>
            </div>
            <div className="space-y-2 font-mono text-xs text-muted">
              <div>LICENSE: MIT</div>
              <div>BUILD: 2026.8.2</div>
              <div>CONTRIBUTORS: 4</div>
              <div className="pt-2 border-t border-border">
                <span className="text-muted">Engine: SpecWise {SCORING_VERSION_V3}</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Quick Links</h3>
            <ul className="space-y-2 font-mono text-xs text-muted">
              <li>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/laptops" className="hover:text-foreground transition-colors">
                  Database
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-foreground transition-colors">
                  Compare
                </Link>
              </li>
              <li>
                <Link href="/quiz" className="hover:text-foreground transition-colors">
                  Quiz
                </Link>
              </li>
              <li>
                <Link href="/#methodology" className="hover:text-foreground transition-colors">
                  Methodology
                </Link>
              </li>
              <li>
                <Link href="/#methodology" className="hover:text-foreground transition-colors">
                  How matching works
                </Link>
              </li>
              <li className="pt-2 border-t border-border">
                <Link href="/about" className="text-muted hover:text-foreground transition-colors">
                  About &rarr;
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted hover:text-foreground transition-colors">
                  Privacy &rarr;
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted hover:text-foreground transition-colors">
                  Terms &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Community Contribution */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">Community</h3>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <a href="https://github.com/specwise/specwise" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Source Code &rarr;
                </a>
              </li>
              <li>
                <a href="https://github.com/specwise/specwise/issues" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Report Issues &rarr;
                </a>
              </li>
              <li>
                <span className="text-muted">Submit spec corrections via GitHub PR</span>
              </li>
              <li className="pt-2 border-t border-border">
                <div className="flex gap-3">
                  <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" className="text-muted transition hover:text-foreground">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub" className="text-muted transition hover:text-foreground">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  </a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6">
          <p className="text-center text-xs text-muted sm:text-left">
            We may earn a commission from purchases made through links on this site.
            Rankings are never sold.{" "}
            <Link href="/#methodology" className="underline underline-offset-2 hover:text-foreground transition-colors">
              See Methodology.
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted sm:text-left">
            &copy; {new Date().getFullYear()} SpecWise Research
          </p>
        </div>
      </div>
    </footer>
  )
}
