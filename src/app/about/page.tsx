import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About — SpecWise",
  description: "How SpecWise recommends laptops: a transparent quiz, detailed spec comparison, and regional pricing.",
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">About SpecWise</h1>

      <section className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
        <p>
          SpecWise is a laptop recommendation site. You answer a short quiz about how you
          work, game, or study, and we rank laptops from our catalog against your answers.
          Every laptop in the catalog has a detailed spec sheet, and prices are shown per
          region in local currency.
        </p>
        <p>
          The catalog currently contains 56 laptops across 6 regions, each with prices from
          one or more retailers. Recommendations are produced by comparing your quiz answers
          to each laptop&apos;s specs — the comparison logic is deterministic and runs
          server-side on every quiz submission.
        </p>
        <p>
          We are a small independent project, not affiliated with any laptop manufacturer.
          Some product links on the site are affiliate links, which may earn us a commission
          at no extra cost to you.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Questions about the site, the data, or a correction? Email{" "}
          <a href="mailto:hello@specwise.dev" className="text-accent underline-offset-2 hover:underline">
            hello@specwise.dev
          </a>
          .
        </p>
      </section>
    </div>
  )
}
