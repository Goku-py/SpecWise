"use client"

import { useTransition, useState } from "react"
import { toggleLaptopActive } from "./actions"

interface ToggleActiveButtonProps {
  id: string
  isActive: boolean
}

export function ToggleActiveButton({ id, isActive }: ToggleActiveButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  return (
    <div>
      <button
        disabled={pending}
        onClick={() => startTransition(async () => {
          setError("")
          const result = await toggleLaptopActive(id, isActive)
          if (!result.ok) setError(result.error ?? "Failed")
        })}
        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          isActive
            ? "bg-accent/20 text-accent"
            : "bg-card text-muted"
        }`}
      >
        {pending ? "..." : isActive ? "Active" : "Inactive"}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}
