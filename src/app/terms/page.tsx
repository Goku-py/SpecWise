import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Use — SpecWise",
  description: "The terms under which SpecWise provides laptop recommendations.",
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted">Last updated: August 2026</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Using the service</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          SpecWise provides laptop recommendations for general information only. By using
          the site you agree not to use it for unlawful purposes, to abuse its search or
          quiz endpoints, or to attempt to interfere with its operation.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Recommendations and data</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Recommendations are generated from our catalog and your quiz answers; they are
          not professional buying advice. Specs and prices are provided by third-party
          sources and can change or contain errors. Prices shown are indicative — always
          confirm with the retailer before purchase.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Some links are affiliate links and may earn us a commission, as disclosed in our{" "}
          <a href="/privacy" className="text-accent underline-offset-2 hover:underline">
            Privacy Policy
          </a>{" "}
          and on the site footer.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">No warranty</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The site is provided &ldquo;as is&rdquo; without warranties of any kind. To the
          extent permitted by law, we are not liable for decisions made based on the
          information on this site.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Contact</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Questions about these terms? Email{" "}
          <a href="mailto:hello@specwise.dev" className="text-accent underline-offset-2 hover:underline">
            hello@specwise.dev
          </a>
          .
        </p>
      </section>
    </div>
  )
}
