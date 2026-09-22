"use client"
import dynamic from "next/dynamic"
const BootSequence = dynamic(() => import("./boot-sequence").then(m => m.BootSequence), { ssr: false })
export function BootSequenceWrapper({ laptopCount }: { laptopCount: number }) {
  return <BootSequence laptopCount={laptopCount} />
}
