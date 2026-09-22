"use client"
import dynamic from "next/dynamic"
const EvidenceFlow = dynamic(() => import("./evidence-flow"), {
  ssr: false,
  loading: () => <div className="h-48 rounded border border-border bg-card animate-pulse" />,
})
export function EvidenceFlowWrapper() {
  return <EvidenceFlow />
}
