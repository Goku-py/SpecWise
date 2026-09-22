"use client"

import { Sparkles, SlidersHorizontal } from "lucide-react"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

export type QuizMode = "quick" | "advanced"

interface GateCard {
  mode: QuizMode
  name: string
  copy: string
  badge: string | null
  icon: ComponentType<{ className?: string }>
}

const GATE_CARDS: GateCard[] = [
  {
    mode: "quick",
    name: "Quick & Simple",
    copy: "Just a few essential questions. No technical specs needed.",
    badge: "~2 MIN",
    icon: Sparkles,
  },
  {
    mode: "advanced",
    name: "Advanced",
    copy: "Full control over CPU, GPU, RAM, display, ports, security, and more.",
    badge: null,
    icon: SlidersHorizontal,
  },
]

export function GateStep({ onSelect }: { onSelect: (mode: QuizMode) => void }) {
  return (
    <section className="relative py-4 sm:py-8">
      {/* Stripe-style decorative radial glow behind the content */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative z-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {"Let's find your laptop"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          How experienced are you with laptops?
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GATE_CARDS.map((card, i) => {
            const Icon = card.icon
            return (
              <button
                key={card.mode}
                type="button"
                onClick={() => onSelect(card.mode)}
                style={i === 1 ? { animationDelay: "80ms" } : undefined}
                className={cn(
                  "group animate-slide-up rounded-2xl border border-border bg-gradient-to-b from-card to-card-hover p-6 text-left transition-all duration-150",
                  "hover:-translate-y-0.5 hover:border-accent/40 hover:glow-accent",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-base font-semibold">{card.name}</span>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{card.copy}</p>
                {card.badge && (
                  <span className="mt-4 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted">
                    {card.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
