"use client"
import dynamic from "next/dynamic"
const HeroTopology = dynamic(() => import("../three/hero-topology"), { ssr: false, loading: () => <div className="h-full w-full bg-card animate-pulse" /> })
export function HeroWrapper() {
  return <HeroTopology quality="high" />
}
