"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  Weight,
  Battery,
  Wifi,
  Usb,
  Shield,
  Camera,
  Keyboard,
  Star,
  ExternalLink,
  Loader2,
} from "lucide-react"
import { formatPrice } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { ProductImage } from "@/components/ui/product-image"

interface PriceEntry {
  region: string
  retailer: string
  currency: string
  price: number
  url: string | null
  affiliateUrl: string | null
}

interface LaptopDetail {
  id: string
  brand: string
  model: string
  variant: string | null
  os: string
  cpuBrand: string
  cpuFamily: string
  cpuGeneration: string | null
  cpuCores: number | null
  cpuBenchmark: number | null
  gpuType: string
  gpuModel: string | null
  gpuVRAM: number | null
  ramAmount: number
  ramType: string | null
  ramUpgradeable: boolean
  storageAmount: number
  storageType: string
  storageExpandable: boolean
  displaySize: number
  displayResolution: string | null
  displayRefreshRate: number
  displayPanelType: string | null
  displayBrightness: number | null
  displayColorGamut: string | null
  displayTouch: boolean
  batteryCapacity: number | null
  batteryLife: number | null
  weight: number | null
  buildMaterial: string | null
  webcamQuality: string | null
  ports: string[]
  wireless: string | null
  securityFeatures: string[]
  keyboardBacklit: boolean
  isTouchscreen: boolean
  isRefurbished: boolean
  isPopular: boolean
  imageUrl: string | null
  reviewScore: number | null
  notes: string | null
  prices: PriceEntry[]
}

function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-accent" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-card-hover" />
      <div className="mb-8 space-y-2">
        <div className="h-8 w-2/3 animate-pulse rounded bg-card-hover" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-card-hover" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-xl border border-border bg-card p-5 sm:p-6">
            <div className="mb-4 h-5 w-32 rounded bg-card-hover" />
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-3.5 w-full rounded bg-card-hover" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LaptopDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [laptop, setLaptop] = useState<LaptopDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLaptop() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/laptops/${id}`)
        if (!res.ok) {
          if (res.status === 404) throw new Error("Laptop not found")
          throw new Error("Failed to load laptop details")
        }
        const data = await res.json()
        setLaptop(data.laptop ?? data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }
    fetchLaptop()
  }, [id])

  if (loading) return <Skeleton />

  if (error || !laptop) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <Monitor className="mx-auto mb-4 h-12 w-12 text-muted" />
        <h2 className="text-xl font-semibold text-foreground">
          {error ?? "Laptop not found"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          The laptop you&apos;re looking for doesn&apos;t exist or was removed.
        </p>
        <Link
          href="/laptops"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-accent transition hover:gap-2.5"
        >
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>
      </div>
    )
  }

  const minPrice = Math.min(...laptop.prices.map(p => p.price))
  const maxPrice = Math.max(...laptop.prices.map(p => p.price))

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Back link */}
      <Link
        href="/laptops"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {laptop.brand} {laptop.model}
              {laptop.variant && <span className="text-muted"> ({laptop.variant})</span>}
            </h1>
            <p className="mt-1 text-sm text-muted">{laptop.os}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {laptop.isPopular && (
              <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                Popular
              </span>
            )}
            {laptop.reviewScore != null && (
              <span className="flex items-center gap-1 rounded-full bg-card-hover px-3 py-1 text-xs font-medium text-foreground">
                <Star className="h-3.5 w-3.5 text-yellow-500" />
                {laptop.reviewScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {/* Price range */}
        {laptop.prices.length > 0 && (
          <p className="mt-3 text-lg font-semibold text-foreground">
            {minPrice === maxPrice
              ? formatPrice(minPrice, laptop.prices[0].currency)
              : `${formatPrice(minPrice, laptop.prices[0].currency)} – ${formatPrice(maxPrice, laptop.prices[laptop.prices.length - 1].currency)}`
            }
          </p>
        )}
        {laptop.isRefurbished && (
          <p className="mt-1 text-xs text-amber-500">Refurbished model</p>
        )}
      </div>

      {/* Image */}
      <div className="mb-8 flex items-center justify-center rounded-xl border border-border bg-card p-8">
        <ProductImage
          src={laptop.imageUrl}
          alt={`${laptop.brand} ${laptop.model}`}
          width={400}
          height={256}
          className="max-h-64 object-contain"
        />
      </div>

      {/* Spec sections grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Overview */}
        <Section title="Overview" icon={Monitor}>
          <SpecRow label="Brand">{laptop.brand}</SpecRow>
          <SpecRow label="Model">{laptop.model}</SpecRow>
          <SpecRow label="OS">{laptop.os}</SpecRow>
          {laptop.notes && <SpecRow label="Notes">{laptop.notes}</SpecRow>}
        </Section>

        {/* Processor */}
        <Section title="Processor" icon={Cpu}>
          <SpecRow label="Brand">{laptop.cpuBrand}</SpecRow>
          <SpecRow label="Family">{laptop.cpuFamily}</SpecRow>
          {laptop.cpuGeneration && <SpecRow label="Generation">{laptop.cpuGeneration}</SpecRow>}
          {laptop.cpuCores != null && <SpecRow label="Cores">{laptop.cpuCores}</SpecRow>}
          {laptop.cpuBenchmark != null && <SpecRow label="Benchmark">{laptop.cpuBenchmark.toLocaleString()}</SpecRow>}
        </Section>

        {/* Graphics */}
        <Section title="Graphics" icon={Monitor}>
          <SpecRow label="Type">{laptop.gpuType}</SpecRow>
          {laptop.gpuModel && <SpecRow label="Model">{laptop.gpuModel}</SpecRow>}
          {laptop.gpuVRAM != null && <SpecRow label="VRAM">{laptop.gpuVRAM} GB</SpecRow>}
        </Section>

        {/* Memory & Storage */}
        <Section title="Memory & Storage" icon={MemoryStick}>
          <SpecRow label="RAM">{laptop.ramAmount} GB{laptop.ramType ? ` ${laptop.ramType}` : ""}</SpecRow>
          <SpecRow label="Upgradeable">{laptop.ramUpgradeable ? "Yes" : "No"}</SpecRow>
          <SpecRow label="Storage">{laptop.storageAmount} GB {laptop.storageType}</SpecRow>
          <SpecRow label="Expandable">{laptop.storageExpandable ? "Yes" : "No"}</SpecRow>
        </Section>

        {/* Display */}
        <Section title="Display" icon={Monitor}>
          <SpecRow label="Size">{laptop.displaySize}"</SpecRow>
          {laptop.displayResolution && <SpecRow label="Resolution">{laptop.displayResolution}</SpecRow>}
          <SpecRow label="Refresh Rate">{laptop.displayRefreshRate} Hz</SpecRow>
          {laptop.displayPanelType && <SpecRow label="Panel Type">{laptop.displayPanelType}</SpecRow>}
          {laptop.displayBrightness != null && <SpecRow label="Brightness">{laptop.displayBrightness} nits</SpecRow>}
          {laptop.displayColorGamut && <SpecRow label="Color Gamut">{laptop.displayColorGamut}</SpecRow>}
          <SpecRow label="Touch">{laptop.displayTouch || laptop.isTouchscreen ? "Yes" : "No"}</SpecRow>
        </Section>

        {/* Ports & Connectivity */}
        <Section title="Ports & Connectivity" icon={Usb}>
          {laptop.ports.length > 0 && (
            <SpecRow label="Ports">{laptop.ports.join(", ")}</SpecRow>
          )}
          {laptop.wireless && <SpecRow label="Wireless">{laptop.wireless}</SpecRow>}
        </Section>

        {/* Physical */}
        <Section title="Physical" icon={Weight}>
          {laptop.weight != null && <SpecRow label="Weight">{laptop.weight} kg</SpecRow>}
          {laptop.buildMaterial && <SpecRow label="Material">{laptop.buildMaterial}</SpecRow>}
          {laptop.webcamQuality && <SpecRow label="Webcam">{laptop.webcamQuality}</SpecRow>}
          <SpecRow label="Keyboard Backlit">{laptop.keyboardBacklit ? "Yes" : "No"}</SpecRow>
          {laptop.securityFeatures.length > 0 && (
            <SpecRow label="Security">{laptop.securityFeatures.join(", ")}</SpecRow>
          )}
        </Section>

        {/* Battery */}
        <Section title="Battery" icon={Battery}>
          {laptop.batteryCapacity != null && <SpecRow label="Capacity">{laptop.batteryCapacity} Wh</SpecRow>}
          {laptop.batteryLife != null && <SpecRow label="Battery Life">{laptop.batteryLife} hours</SpecRow>}
        </Section>
      </div>

      {/* Pricing by retailer */}
      {laptop.prices.length > 0 && (
        <div className="mt-6 animate-fade-in rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-foreground">Pricing by Retailer</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th className="pb-2 pr-4 font-medium">Retailer</th>
                  <th className="pb-2 pr-4 font-medium">Region</th>
                  <th className="pb-2 pr-4 font-medium">Price</th>
                  <th className="pb-2 pr-4 font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {laptop.prices.map((p, i) => (
                  <tr key={`${p.retailer}-${p.region}`} className={cn("border-b border-border last:border-0", i % 2 === 0 && "bg-background/30")}>
                    <td className="py-2.5 pr-4 font-medium text-foreground">{p.retailer}</td>
                    <td className="py-2.5 pr-4 text-muted">{p.region}</td>
                    <td className="py-2.5 pr-4 font-semibold text-foreground">{formatPrice(p.price, p.currency)}</td>
                    <td className="py-2.5">
                      {(p.affiliateUrl || p.url) && (
                        <a
                          href={p.affiliateUrl ?? p.url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent transition hover:underline"
                        >
                          Buy <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
