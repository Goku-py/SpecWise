import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — SpecWise",
  description: "What data SpecWise stores, why, and how to contact us about it.",
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: August 2026</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">What we store</h2>
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
          <p>
            When you complete the quiz, we temporarily process your answers to produce
            recommendations. If you choose to enter your email to receive results, we store
            it together with your quiz answers and selected region so we can send you the
            results and re-send them on request.
          </p>
          <p>
            Your selected region (e.g. US, GB) is kept in a browser cookie so prices show in
            the right currency. We also store anonymous rate-limiting counters (IP-based,
            IP discarded after 24 hours) to protect the service from abuse.
          </p>
          <p>We do not sell personal data, and we do not use advertising trackers.</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Affiliate links</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Some retailer links on this site are affiliate links. If you buy through one of
          them, we may earn a commission at no extra cost to you. Affiliate networks may
          record that a referral came from this site, but we do not receive your purchase
          details.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          To ask what data we hold about you, or to request deletion, email{" "}
          <a href="mailto:hello@specwise.dev" className="text-accent underline-offset-2 hover:underline">
            hello@specwise.dev
          </a>
          .
        </p>
      </section>
    </div>
  )
}
