"use client"
import dynamic from "next/dynamic"
import type { LaptopDetail } from "@/lib/types"
const ExplorerSection = dynamic(() => import("./explorer-section"), { ssr: false, loading: () => <div className="h-64 rounded border border-border bg-card animate-pulse" /> })
export function ExplorerWrapper({ laptop }: { laptop: LaptopDetail }) {
  return <ExplorerSection laptop={laptop} />
}
