"use client";

import Link from "next/link";
import { removeStored, StorageKey } from "@/lib/storage";
import { buttonVariants } from "@/components/ui/button";

/** Static-first loading skeleton (mirrors the quiz QuizLoading pattern). */
export function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12" aria-busy="true">
      <div className="mb-8">
        <div className="mb-4 h-3 w-28 animate-pulse rounded bg-card-hover" />
        <div className="h-8 w-1/3 animate-pulse rounded bg-card-hover" />
        <div className="mt-2 h-4 w-1/4 animate-pulse rounded bg-card-hover" />
      </div>
      <div className="mb-6 h-64 animate-pulse rounded border border-border bg-card" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}

/** Catalog returned nothing. Copy stays awaitingUser-aware (kept from V2). */
export function NoResults({ awaitingUser }: { awaitingUser: boolean }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h2 className="text-2xl font-semibold text-foreground">No results found</h2>
      {awaitingUser ? (
        <p className="mt-2 text-sm text-muted">
          Your must-have requirements rule out the whole catalog. Adjust a hard
          requirement (e.g. OS or budget minimum) and try again.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          Try adjusting your criteria or broadening your budget.
        </p>
      )}
      <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
        Refine answers
      </Link>
    </div>
  );
}

/** No saved results blob at all — explained, with a link (never a silent bounce). */
export function MissingProfile() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h2 className="text-2xl font-semibold text-foreground">
        No saved recommendations
      </h2>
      <p className="mt-2 text-sm text-muted">
        Answer a few questions and we will match laptops to your needs.
      </p>
      <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
        Start recommendation
      </Link>
    </div>
  );
}

/** Saved results failed validation — explained, with a link back. */
export function InvalidResult() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h2 className="text-2xl font-semibold text-foreground">
        These results could not be shown
      </h2>
      <p className="mt-2 text-sm text-muted">
        Your saved recommendations are incomplete or outdated. Retake the quiz
        to get fresh matches.
      </p>
      <Link href="/quiz" className={buttonVariants({ className: "mt-6" })}>
        Return to recommendation
      </Link>
    </div>
  );
}

/** Stored answers region drifted from stored results region. */
export function StaleNotice() {
  return (
    <div role="status" className="mb-6 rounded border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">
        Your answers changed since these results.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href="/quiz"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          See current answers
        </Link>
        <Link
          href="/quiz"
          onClick={() => {
            removeStored(StorageKey.V3Results);
            removeStored(StorageKey.V3Profile);
          }}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Start over
        </Link>
      </div>
    </div>
  );
}

/** Catalog unavailable (empty, not awaiting user input, no relaxation applied). */
export function EmptyCatalog() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h2 className="text-2xl font-semibold text-foreground">
        No laptops available right now
      </h2>
      <p className="mt-2 text-sm text-muted">
        The catalog is temporarily unavailable. Please try again later.
      </p>
      <Link
        href="/quiz"
        className={buttonVariants({ variant: "secondary", className: "mt-6" })}
      >
        Return to recommendation
      </Link>
    </div>
  );
}
