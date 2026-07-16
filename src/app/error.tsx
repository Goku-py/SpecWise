"use client"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error)

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="mx-auto max-w-md text-center">
        <div className="mb-4 text-5xl">⚠</div>
        <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">An unexpected error occurred. Please try again.</p>
        <button
          onClick={reset}
          className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
