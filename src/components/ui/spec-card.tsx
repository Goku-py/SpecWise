import { cn } from "@/lib/utils"

interface SpecCell {
  label: string
  value: string | number | null
}

interface SpecCardProps {
  specs: SpecCell[]
  columns?: 2 | 4
  className?: string
}

export function SpecCard({ specs, columns = 4, className }: SpecCardProps) {
  return (
    <div className={cn(
      "grid gap-px rounded border border-border bg-border overflow-hidden",
      columns === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2",
      className
    )}>
      {specs.map((spec) => (
        <div key={spec.label} className="bg-card p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1">{spec.label}</div>
          <div className="font-mono text-sm text-foreground truncate">
            {spec.value ?? "—"}
          </div>
        </div>
      ))}
    </div>
  )
}
