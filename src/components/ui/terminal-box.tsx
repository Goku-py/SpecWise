import { cn } from "@/lib/utils"

interface TerminalBoxProps {
  title?: string
  children: React.ReactNode
  className?: string
  status?: "live" | "idle" | "error"
}

export function TerminalBox({ title = "specwise-engine --translate --live", children, className, status = "live" }: TerminalBoxProps) {
  return (
    <div className={cn("rounded border border-border bg-background overflow-hidden", className)}>
      {/* Header bar */}
      <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-2.5">
        <span className="flex items-center gap-1.5">
          <span className={cn(
            "h-2 w-2 rounded-full",
            status === "live" ? "bg-accent-success animate-glow-pulse-success" :
            status === "error" ? "bg-accent-danger" :
            "bg-muted"
          )} />
          <span className="h-2 w-2 rounded-full bg-accent-danger/60" />
          <span className="h-2 w-2 rounded-full bg-accent-warning/60" />
        </span>
        <span className="ml-2 font-mono text-xs text-muted">{title}</span>
      </div>
      {/* Content */}
      <div className="p-4 font-mono text-sm leading-relaxed">
        {children}
      </div>
    </div>
  )
}
