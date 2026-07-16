import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { REGIONS } from "@/lib/regions"
import { ToggleActiveButton } from "./toggle-button"
import { LoginForm, LogoutButton } from "./login-form"

export const dynamic = "force-dynamic"

interface LaptopRow {
  id: string
  brand: string
  model: string
  price: number
  currency: string
  region: string
  os: string
  cpuFamily: string
  ramAmount: number
  storageAmount: number
  isActive: boolean
}

interface AdminPageProps {
  searchParams: Promise<{ region?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const c = await cookies()
  const authed = c.get("admin_key")?.value === process.env.ADMIN_API_KEY

  if (!authed) return <LoginForm />

  const params = await searchParams
  const region = params.region || "US"

  let rows: LaptopRow[] = []
  let total = 0
  let error = ""

  try {
    const [laptops, laptopCount] = await Promise.all([
      prisma.laptop.findMany({
        include: {
          prices: {
            where: { region },
            select: { region: true, currency: true, price: true },
            orderBy: { price: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.laptop.count(),
    ])

    rows = laptops.map(l => {
      const best = l.prices[0]
      return {
        id: l.id,
        brand: l.brand,
        model: l.model,
        price: best?.price ?? 0,
        currency: best?.currency ?? "USD",
        region: best?.region ?? region,
        os: l.os,
        cpuFamily: l.cpuFamily,
        ramAmount: l.ramAmount,
        storageAmount: l.storageAmount,
        isActive: l.isActive,
      }
    })
    total = laptopCount
  } catch (e) {
    error = "Failed to load laptops"
    console.error("Admin page fetch error:", e)
  }

  if (error) return <div className="p-8 text-red-500">{error}</div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Laptop Catalog</h1>
            <LogoutButton />
          </div>
          <p className="text-sm text-muted">{total} laptops</p>
        </div>
        <form action="/admin" method="GET" className="flex items-center gap-2">
          <label htmlFor="region" className="text-sm text-muted">Region:</label>
          <select
            id="region"
            name="region"
            defaultValue={region}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none focus:border-emerald-500/50"
          >
            {REGIONS.map(r => (
              <option key={r.code} value={r.code}>
                {r.flag} {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20"
          >
            Apply
          </button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-card">
              <th className="px-4 py-3 font-medium text-muted">Brand</th>
              <th className="px-4 py-3 font-medium text-muted">Model</th>
              <th className="px-4 py-3 font-medium text-muted">Price</th>
              <th className="px-4 py-3 font-medium text-muted">Currency</th>
              <th className="px-4 py-3 font-medium text-muted">Region</th>
              <th className="px-4 py-3 font-medium text-muted">OS</th>
              <th className="px-4 py-3 font-medium text-muted">CPU</th>
              <th className="px-4 py-3 font-medium text-muted">RAM</th>
              <th className="px-4 py-3 font-medium text-muted">Storage</th>
              <th className="px-4 py-3 font-medium text-muted">Active</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.id} className="border-b border-border transition hover:bg-card/50">
                <td className="px-4 py-3 font-medium text-foreground">{l.brand}</td>
                <td className="px-4 py-3 text-foreground">{l.model}</td>
                <td className="px-4 py-3 text-foreground">{l.price.toLocaleString()}</td>
                <td className="px-4 py-3 text-muted">{l.currency}</td>
                <td className="px-4 py-3 text-muted">{l.region}</td>
                <td className="px-4 py-3 text-foreground">{l.os}</td>
                <td className="px-4 py-3 text-foreground">{l.cpuFamily}</td>
                <td className="px-4 py-3 text-foreground">{l.ramAmount} GB</td>
                <td className="px-4 py-3 text-foreground">{l.storageAmount} GB</td>
                <td className="px-4 py-3">
                  <ToggleActiveButton id={l.id} isActive={l.isActive} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
