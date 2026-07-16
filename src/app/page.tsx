import Link from "next/link"
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  GraduationCap,
  Gamepad2,
  Code,
  Palette,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  {
    icon: Sparkles,
    title: "Smart Matching",
    desc: "We translate your needs into specs and find the perfect laptop match.",
  },
  {
    icon: Zap,
    title: "3-Minute Quiz",
    desc: "Answer simple questions — no technical knowledge needed.",
  },
  {
    icon: Shield,
    title: "Honest Trade-offs",
    desc: "We show you exactly what you gain and what you compromise.",
  },
  {
    icon: BarChart3,
    title: "Side-by-Side Compare",
    desc: "Compare laptops across specs, price, and fit score.",
  },
]

const useCases = [
  {
    icon: GraduationCap,
    label: "For Students",
    desc: "Balanced, affordable laptops for class",
    href: "/category/student",
  },
  {
    icon: Gamepad2,
    label: "For Gaming",
    desc: "GPUs, refresh rates, and performance",
    href: "/category/gaming",
  },
  {
    icon: Code,
    label: "For Coding",
    desc: "RAM, CPU, and Linux-friendly options",
    href: "/category/coding",
  },
  {
    icon: Palette,
    label: "For Creators",
    desc: "Color-accurate displays, powerful CPUs",
    href: "/category/graphic-design",
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      {/* ───── Hero ───── */}
      <section className="flex flex-col items-center py-16 text-center sm:py-24">
        {/* Badge */}
        <div className="mb-6 inline-flex animate-fade-in items-center gap-2 rounded-full border border-border bg-accent-soft/50 px-4 py-1.5 text-xs text-accent">
          <Sparkles className="h-3.5 w-3.5" />
          Laptop buying made simple
        </div>

        {/* Headline */}
        <h1
          className="animate-slide-up max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl sm:leading-tight"
          style={{ animationDelay: "0.1s" }}
        >
          Find the right laptop
          <br />
          <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            without learning every spec
          </span>
        </h1>

        <p
          className="animate-fade-in mt-4 max-w-xl text-lg leading-relaxed text-muted"
          style={{ animationDelay: "0.2s" }}
        >
          Answer a few simple questions and get laptop recommendations based on
          your budget, workload, and preferences.
        </p>

        {/* Two-pillar CTA cards */}
        <div className="mt-10 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          {/* Pillar 1: Quiz */}
          <div
            className="animate-slide-up group rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Your Perfect Match
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Take our 3-minute quiz and get tailored laptop recommendations
              matched to your budget and needs.
            </p>
            <Link
              href="/quiz"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition-all hover:gap-2.5"
            >
              Find My Laptop <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Pillar 2: Browse */}
          <div
            className="animate-slide-up group rounded-2xl border border-border bg-card p-6 text-left shadow-sm transition hover:border-foreground/15 hover:shadow-lg"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-card-hover text-foreground">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Explore the Catalog
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Browse a curated database of laptops, filter by specs, and compare
              models side by side.
            </p>
            <Link
              href="/laptops"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground transition-all hover:gap-2.5"
            >
              Browse Laptops <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ───── Popular Use Cases ───── */}
      <section className="mb-20">
        <h2 className="animate-fade-in mb-2 text-center text-2xl font-semibold text-foreground">
          Popular Use Cases
        </h2>
        <p
          className="animate-fade-in mb-8 text-center text-sm text-muted"
          style={{ animationDelay: "0.1s" }}
        >
          Not sure where to start? Pick your use case and we&apos;ll find the right
          laptop for you.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {useCases.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className="animate-slide-up group rounded-xl border border-border bg-card p-5 transition hover:border-accent/30 hover:bg-card-hover"
              style={{ animationDelay: `${0.1 + i * 0.06}s` }}
            >
              <item.icon className="mb-3 h-5 w-5 text-accent" />
              <div className="text-sm font-medium text-foreground transition group-hover:text-accent">
                {item.label}
              </div>
              <div className="mt-1 text-xs text-muted">{item.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ───── How It Works ───── */}
      <section id="how-it-works" className="mb-20">
        <h2 className="animate-fade-in mb-2 text-center text-2xl font-semibold text-foreground">
          How SpecWise Works
        </h2>
        <p
          className="animate-fade-in mb-8 text-center text-sm text-muted"
          style={{ animationDelay: "0.1s" }}
        >
          From quiz to compare in minutes.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-slide-up rounded-xl border border-border bg-card p-5 transition hover:border-accent/20 hover:shadow-sm"
              style={{ animationDelay: `${0.1 + i * 0.08}s` }}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft">
                <f.icon className="h-5 w-5 text-accent" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───── Trust + Final CTA ───── */}
      <section className="animate-fade-in relative mb-20 overflow-hidden rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute -inset-x-20 -top-32 h-64 bg-gradient-radial from-accent/5 to-transparent blur-3xl" />

        <div className="relative">
          <h2 className="text-xl font-semibold text-foreground">
            Recommendations you can trust
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
            Every recommendation includes a clear reason why it fits your needs
            and what trade-offs exist. No hidden bias — just honest, spec-based
            matching.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/quiz">
              <Button size="lg" className="gap-2 text-base">
                Find My Laptop <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/laptops">
              <Button variant="outline" size="lg">
                Browse All Laptops
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
