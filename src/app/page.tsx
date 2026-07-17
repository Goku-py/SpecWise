import Link from "next/link"
import {
  ArrowRight, Code, Gamepad2, Palette, GraduationCap, Briefcase,
  ClipboardList, Cpu, Layers, ShoppingBag,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const useCases = [
  { icon: Code, label: "Software Development", desc: "RAM-heavy multitasking & Linux support.", href: "/category/coding" },
  { icon: Gamepad2, label: "Competitive Gaming", desc: "High refresh rates & thermal overhead.", href: "/category/gaming" },
  { icon: Palette, label: "Creative Studio", desc: "P3 color accuracy & sustained CPU power.", href: "/category/graphic-design" },
  { icon: GraduationCap, label: "Academic Use", desc: "Portable, durable, all-day battery life.", href: "/category/student" },
  { icon: Briefcase, label: "Business Executive", desc: "Premium build & enterprise security.", href: "/category/office" },
]

const steps = [
  { title: "Profile Quiz", desc: "Tell us about your daily tasks and environment." },
  { title: "Spec Analysis", desc: "We parse 50k+ spec permutations against your needs." },
  { title: "Smart Matching", desc: "Ranked recommendations with honest trade-offs." },
  { title: "Compare & Buy", desc: "Side-by-side comparisons at the best regional price." },
]

const bentoCards = [
  {
    icon: Cpu, title: "Intelligent Matching", desc: "Our engine evaluates 50,000+ spec permutations against your workflow.",
    stat: { value: "93%", label: "accuracy rate" }, colSpan: "md:col-span-2", delay: "0.1s",
  },
  {
    icon: ClipboardList, title: "3-Min Quiz", desc: "Simple questions, no jargon.",
    colSpan: "md:col-span-1", delay: "0.15s",
  },
  {
    icon: Layers, title: "2k+ Models", desc: "Every model vetted for quality.",
    colSpan: "md:col-span-1", delay: "0.2s",
  },
  {
    icon: ShoppingBag, title: "Honest Matching", desc: "Unbiased recommendations based on real performance.",
    colSpan: "md:col-span-2", delay: "0.25s",
  },
  {
    icon: Briefcase, title: "Global Pricing", desc: "Real-time prices across 12 regions.",
    colSpan: "md:col-span-1", delay: "0.3s",
  },
]

export default function HomePage() {
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
              Answer 3 simple questions. We parse thousands of specs to find your perfect match.
            </p>
            <div
              className="animate-fade-in flex flex-wrap items-center gap-4 mb-16"
              style={{ animationDelay: "0.3s" }}
            >
              <Link href="/quiz">
                <Button size="lg" className="gap-2 px-8 py-4 text-base">
                  Start Quiz <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/laptops">
                <Button variant="secondary" size="lg" className="px-8 py-4 text-base">
                  Browse Catalog
                </Button>
              </Link>
            </div>
            <div
              className="animate-fade-in flex flex-col md:flex-row md:items-center gap-4 md:gap-6 text-sm text-muted"
              style={{ animationDelay: "0.35s" }}
            >
              <span>1,248 Laptops</span>
              <span className="hidden md:inline text-border">•</span>
              <span>12 Global Regions</span>
              <span className="hidden md:inline text-border">•</span>
              <span>85,000+ Price Points</span>
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
                <h3 className="text-lg font-bold text-foreground mb-2">{card.title}</h3>
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
                  className="animate-fade-in group rounded-xl border border-border bg-card p-5 transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/30 hover:bg-card-hover"
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
              <h4 className="text-sm font-bold text-foreground mb-2">{step.title}</h4>
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
          <Link href="/quiz" className="animate-fade-in inline-block" style={{ animationDelay: "0.1s" }}>
            <Button size="lg" className="gap-2 px-12 py-5 text-lg font-bold shadow-xl shadow-accent/10">
              Find My Laptop <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <div className="animate-fade-in mt-6 text-xs text-muted" style={{ animationDelay: "0.2s" }}>
            No account required • Free to use • Updated daily
          </div>
        </div>
      </section>
    </div>
  )
}
