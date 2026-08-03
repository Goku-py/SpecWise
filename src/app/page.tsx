import Link from "next/link"
import {
  ArrowRight, Code, Gamepad2, Palette, GraduationCap, Briefcase,
  ClipboardList, Cpu, Layers, ShoppingBag,
} from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { prisma } from "@/lib/prisma"

const useCases = [
  { icon: Code, label: "Software Development", desc: "RAM-heavy multitasking & Linux support.", href: "/category/coding" },
  { icon: Gamepad2, label: "Competitive Gaming", desc: "High refresh rates & thermal overhead.", href: "/category/gaming" },
  { icon: Palette, label: "Creative Studio", desc: "P3 color accuracy & sustained CPU power.", href: "/category/graphic-design" },
  { icon: GraduationCap, label: "Academic Use", desc: "Portable, durable, all-day battery life.", href: "/category/student" },
  { icon: Briefcase, label: "Business Executive", desc: "Premium build & enterprise security.", href: "/category/office" },
]

const steps = [
  { title: "Profile Quiz", desc: "Tell us about your daily tasks and environment." },
  { title: "Spec Analysis", desc: "We compare your answers against every laptop's full spec sheet." },
  { title: "Smart Matching", desc: "Ranked recommendations with honest trade-offs." },
  { title: "Compare & Buy", desc: "Side-by-side comparisons at the best regional price." },
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

  const bentoCards = [
    {
      icon: Cpu,
      title: "Intelligent Matching",
      desc: "Your quiz answers are compared against the full spec sheet of every laptop in the catalog.",
      stat: { value: stats.laptopCount.toLocaleString(), label: "laptops evaluated" },
      colSpan: "md:col-span-2", delay: "0.1s",
    },
    {
      icon: ClipboardList, title: "3-Min Quiz", desc: "Simple questions, no jargon.",
      colSpan: "md:col-span-1", delay: "0.15s",
    },
    {
      icon: Layers,
      title: "Curated Catalog",
      desc: "Every laptop has verified specs and regional pricing.",
      stat: { value: stats.priceCount.toLocaleString(), label: "price points tracked" },
      colSpan: "md:col-span-1", delay: "0.2s",
    },
    {
      icon: ShoppingBag, title: "Honest Matching", desc: "Recommendations ranked by fit, with trade-offs shown alongside.",
      colSpan: "md:col-span-2", delay: "0.25s",
    },
    {
      icon: Briefcase,
      title: "Regional Pricing",
      desc: "Prices tracked per region in local currency.",
      stat: { value: stats.regionCount.toLocaleString(), label: "regions covered" },
      colSpan: "md:col-span-1", delay: "0.3s",
    },
  ]

  return (
    <div>
      {/* ───── Hero ───── */}
      <section className="relative w-full border-b border-border bg-gradient-to-b from-background to-card overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-24 lg:py-32 relative z-10">
          <div className="max-w-4xl">
            <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-xs font-semibold text-accent">
              Precision Matching Engine
            </div>
            <h1
              className="animate-fade-in text-5xl md:text-6xl lg:text-7xl font-bold tracking-[-0.02em] leading-[1.1] mb-8"
              style={{ animationDelay: "0.1s" }}
            >
              Find the laptop that&apos;s <span className="text-accent">engineered</span> for you.
            </h1>
            <p
              className="animate-fade-in text-lg md:text-xl text-muted mb-12 max-w-2xl leading-relaxed"
              style={{ animationDelay: "0.2s" }}
            >
              Answer 3 simple questions. We match your answers against detailed specs for every laptop we track.
            </p>
            <div
              className="animate-fade-in flex flex-wrap items-center gap-4 mb-16"
              style={{ animationDelay: "0.3s" }}
            >
              <Link href="/quiz" className={buttonVariants({ size: "lg", className: "gap-2 px-8 py-4 text-base" })}>
                Start Quiz <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/laptops" className={buttonVariants({ variant: "secondary", size: "lg", className: "px-8 py-4 text-base" })}>
                Browse Catalog
              </Link>
            </div>
            <div
              className="animate-fade-in flex flex-col md:flex-row md:items-center gap-4 md:gap-6 text-sm text-muted"
              style={{ animationDelay: "0.35s" }}
            >
              <span>{stats.laptopCount.toLocaleString()} Laptops</span>
              <span className="hidden md:inline text-border">•</span>
              <span>{stats.regionCount.toLocaleString()} Global Regions</span>
              <span className="hidden md:inline text-border">•</span>
              <span>{stats.priceCount.toLocaleString()} Price Points</span>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Bento Grid ───── */}
      <section className="py-24 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid md:grid-cols-4 gap-6">
          {bentoCards.map((card) => {
            const Icon = card.icon
            return (
              <div
                key={card.title}
                className={`animate-fade-in ${card.colSpan} rounded-2xl border border-border bg-card p-8 transition hover:border-accent/30 hover:bg-card-hover`}
                style={{ animationDelay: card.delay }}
              >
                <Icon className="h-8 w-8 text-accent mb-4" />
                <h2 className="text-lg font-bold text-foreground mb-2">{card.title}</h2>
                <p className="text-sm text-muted leading-relaxed">{card.desc}</p>
                {card.stat && (
                  <div className="mt-6 text-3xl font-bold text-accent">
                    {card.stat.value}
                    <span className="text-sm font-normal text-muted ml-1.5">{card.stat.label}</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ───── Use Cases ───── */}
      <section className="py-24 border-y border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Popular Use Cases</h2>
              <p className="text-sm text-muted mt-1">Optimized hardware profiles for every workflow.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {useCases.map((item, i) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="animate-fade-in group rounded-xl border border-border bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  style={{ animationDelay: `${0.1 + i * 0.06}s` }}
                >
                  <Icon className="h-5 w-5 text-accent mb-3" />
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
      <section className="py-24 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-2xl font-bold text-foreground">How It Works</h2>
          <p className="text-sm text-muted mt-2">From needs to machine in 4 simple steps.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8 md:gap-12 relative">
          <div className="absolute hidden md:block top-6 left-[12.5%] w-3/4 h-px bg-border" />
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="animate-fade-in relative z-10 flex flex-col items-center text-center"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-6">
                <span className="text-accent font-bold text-sm">{i + 1}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-xs text-muted leading-relaxed max-w-[200px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Final CTA ───── */}
      <section className="py-32 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 text-center">
          <h2 className="animate-fade-in text-3xl font-bold text-foreground mb-8">
            Ready to find your perfect laptop?
          </h2>
          <Link href="/quiz" className={cn("animate-fade-in inline-block", buttonVariants({ size: "lg", className: "gap-2 px-12 py-5 text-lg font-bold shadow-xl shadow-accent/10" }))} style={{ animationDelay: "0.1s" }}>
            Find My Laptop <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="animate-fade-in mt-6 text-xs text-muted" style={{ animationDelay: "0.2s" }}>
            No account required • Free to use
          </div>
        </div>
      </section>
    </div>
  )
}
