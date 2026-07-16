"use client"

import { useState } from "react"
import Image from "next/image"
import { Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

export function ProductImage({
  src,
  alt,
  width,
  height,
  className,
  priority,
  loading,
}: {
  src: string | null
  alt: string
  width: number
  height: number
  className?: string
  priority?: boolean
  loading?: "lazy" | "eager"
}) {
  const [error, setError] = useState(false)

  if (!src || error) {
    return (
      <div
        className={cn("flex shrink-0 items-center justify-center rounded-lg bg-card text-muted", className)}
      >
        <Monitor className="h-8 w-8" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={cn("shrink-0", className)}
      onError={() => setError(true)}
      priority={priority}
      loading={loading}
    />
  )
}
