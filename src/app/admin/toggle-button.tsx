"use client"

import { useTransition, useState } from "react"
import { toggleLaptopStatus } from "./actions"

interface ToggleStatusButtonProps {
  id: string
  status: string
}

export function ToggleStatusButton({ id, status }: ToggleStatusButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const active = status === "active"

  return (
    <div>
      <button
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError("")
          const result = await toggleLaptopStatus(id, status)
          if (!result.ok) setError(result.error ?? "Failed")
        })}
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          active
            ? "bg-accent/20 text-accent"
            : "bg-card text-muted"
        }`}
      >
        {pending ? "..." : active ? "Active" : "Archived"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
