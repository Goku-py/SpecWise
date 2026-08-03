function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-5">
      <div className="mb-4 h-32 rounded-xl bg-card-hover" />
      <div className="mb-3 space-y-2">
        <div className="h-4 w-3/4 rounded bg-card-hover" />
        <div className="h-3 w-1/2 rounded bg-card-hover" />
      </div>
      <div className="mb-3 grid grid-cols-2 gap-1.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-full rounded bg-card-hover" />
        ))}
      </div>
      <div className="h-5 w-24 rounded border-t border-border pt-3 bg-card-hover" />
    </div>
  )
}

export default function CategoryLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <div className="mb-4 h-3 w-24 animate-pulse rounded bg-card-hover" />
        <div className="mb-2 h-8 w-56 animate-pulse rounded bg-card-hover" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded bg-card-hover" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  )
}
