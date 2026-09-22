import Link from "next/link"
import {
  Code, Gamepad2, Palette, GraduationCap, Briefcase,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import WorkloadDemo from "@/components/hero/workload-demo"
import { HeroWrapper } from "@/components/hero/hero-wrapper"
import { EvidenceFlowWrapper } from "@/components/results/evidence-flow-wrapper"

const useCases = [
  { icon: Code, label: "Software Development", desc: "RAM-heavy multitasking & Linux support.", href: "/category/coding" },
  { icon: Gamepad2, label: "Competitive Gaming", desc: "High refresh rates & thermal overhead.", href: "/category/gaming" },
  { icon: Palette, label: "Creative Studio", desc: "P3 color accuracy & sustained CPU power.", href: "/category/graphic-design" },
  { icon: GraduationCap, label: "Academic Use", desc: "Portable, durable, all-day battery life.", href: "/category/student" },
  { icon: Briefcase, label: "Business Executive", desc: "Premium build & enterprise security.", href: "/category/office" },
]

const steps = [
  { num: "01", title: "Workload Profile", desc: "Define your primary use case and technical requirements." },
  { num: "02", title: "Constraint Mapping", desc: "Set budget, weight tolerance, and OS preferences." },
  { num: "03", title: "Spec Analysis", desc: "Engine matches your needs against full hardware spec sheets." },
  { num: "04", title: "Ranked Output", desc: "F-score ranked results with match breakdowns." },
]

const methodologyRows = [
  {
    attribute: "Primary Metric Source",
    standard: "Sponsored reviews, affiliate rankings",
    specwise: "Full spec-sheet comparison against user needs",
  },
  {
    attribute: "Thermal Throttling",
    standard: "Ignored or mentioned anecdotally",
    specwise: "TGP vs thermal headroom calculation",
  },
  {
    attribute: "Ranking Logic",
    standard: "Commission-driven placement",
    specwise: "F-score: weighted multi-criteria matching",
  },
  {
    attribute: "Panel Quality Data",
    standard: "Generic \"good display\" claims",
    specwise: "sRGB/P3 gamut, brightness nits, Delta E",
  },
]

// Real catalog counts, computed server-side at render time — no fabricated stats.
async function getCatalogStats() {
  try {
    const [laptopCount, priceCount, regionGroups] = await Promise.all([
      prisma.laptop.count({ where: { status: "active" } }),
      prisma.laptopPrice.count(),
      prisma.laptopPrice.groupBy({ by: ["region"] }),
    ])
    return { laptopCount, priceCount, regionCount: regionGroups.length }
  } catch (e) {
    console.error("Failed to load catalog stats:", e)
    return { laptopCount: 0, priceCount: 0, regionCount: 0 }
  }
}

export default async function HomePage() {
  const stats = await getCatalogStats()

  return (
    <div>
      {/* ───── Hero ───── */}
      <section className="relative w-full border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-5 gap-12 items-start">
            {/* Left: Content (60%) */}
            <div className="lg:col-span-3">
              {/* Status badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded border border-border bg-card px-3 py-1.5 font-mono text-[11px] text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-success animate-glow-pulse-success" />
                <span>[ LIVE DATABASE: {stats.laptopCount.toLocaleString()} MACHINES | BUILD 2026.8.2 ]</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-[-0.02em] leading-[1.1] mb-6 text-foreground">
                Match your workload to exact laptop hardware.
                <span className="text-muted"> Zero affiliate bias. Zero jargon.</span>
              </h1>

              {/* Sub-headline */}
              <p className="text-base text-muted mb-8 max-w-xl leading-relaxed">
                Our engine uses F-score weighted matching against full hardware spec sheets.
                Every recommendation shows the exact match breakdown — not a paid placement.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                <Link href="/quiz" className={buttonVariants({ size: "lg" })}>
                  <span className="font-mono text-xs">[ START 60-SEC QUIZ &rarr; ]</span>
                </Link>
                <Link href="/laptops" className={buttonVariants({ variant: "outline", size: "lg" })}>
                  <span className="font-mono text-xs">[ BROWSE RAW SPEC DATABASE ]</span>
                </Link>
              </div>

              {/* Stats line */}
              <div className="flex items-center gap-4 text-xs text-muted font-mono">
                <span>{stats.laptopCount.toLocaleString()} Laptops</span>
                <span className="text-border">|</span>
                <span>{stats.regionCount.toLocaleString()} Global Regions</span>
                <span className="text-border">|</span>
                <span>{stats.priceCount.toLocaleString()} Price Points</span>
              </div>
            </div>

            {/* Right: topology scene + workload demo overlay (40%) */}
            <div className="lg:col-span-2 relative overflow-hidden rounded border border-border bg-card">
              <HeroWrapper />
              <WorkloadDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ───── How SpecWise Differs (Evidence Flow + Comparison) ───── */}
      <section id="methodology" className="py-16 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground">How SpecWise Differs</h2>
            <p className="text-sm text-muted mt-1">Transparent methodology vs. sponsored rankings</p>
          </div>

          {/* Part A — Pipeline visualisation */}
          <EvidenceFlowWrapper />

          {/* Part B — Comparison table */}
          <div className="mt-10 overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="hairline bg-card">
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Attribute</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted">Standard Review Sites</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-accent">SpecWise Engine</th>
                </tr>
              </thead>
              <tbody>
                {methodologyRows.map((row, i) => (
                  <tr key={i} className="hairline last:border-0">
                    <td className="px-4 py-3 text-foreground font-medium">{row.attribute}</td>
                    <td className="px-4 py-3 text-muted font-mono text-xs">{row.standard}</td>
                    <td className="px-4 py-3 text-accent-success font-mono text-xs">{row.specwise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ───── Use Cases ───── */}
      <section className="py-16 border-b border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Use Cases</h2>
              <p className="text-sm text-muted mt-1">Optimized hardware profiles for every workflow.</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {useCases.map((item, i) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="animate-fade-in group rounded border border-border bg-card p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  <Icon className="h-4 w-4 text-accent mb-2" />
                  <div className="text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted leading-relaxed">{item.desc}</div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───── Process ───── */}
      <section className="py-16 border-b border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-12">
            <h2 className="text-xl font-bold text-foreground">How It Works</h2>
            <p className="text-sm text-muted mt-1">From needs to machine in 4 steps.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 md:gap-8 relative">
            <div className="absolute hidden md:block top-6 left-[12.5%] w-3/4 h-px bg-border" />
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="animate-fade-in relative z-10 flex flex-col text-left"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="w-10 h-10 rounded border border-border bg-card flex items-center justify-center mb-4">
                  <span className="font-mono text-xs text-accent font-bold">{step.num}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
                <p className="text-xs text-muted leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <h2 className="animate-fade-in text-2xl font-bold text-foreground mb-6">
            Ready to find your perfect laptop?
          </h2>
          <Link href="/quiz" className={cn("animate-fade-in inline-block", buttonVariants({ size: "lg" }))} style={{ animationDelay: "0.1s" }}>
            <span className="font-mono text-xs">[ FIND MY LAPTOP &rarr; ]</span>
          </Link>
          <div className="animate-fade-in mt-4 text-xs text-muted font-mono" style={{ animationDelay: "0.2s" }}>
            NO ACCOUNT REQUIRED &bull; FREE TO USE
          </div>
        </div>
      </section>
    </div>
  )
}
