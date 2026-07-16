import { NextResponse } from "next/server"
import { withLogging } from "@/lib/logger"
import { prisma } from "@/lib/prisma"

export const GET = withLogging(async (request) => {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const region = searchParams.get("region")?.trim() || undefined

  const laptops = await prisma.laptop.findMany({
    where: {
      isActive: true,
      ...(q && q.length >= 2
        ? {
            OR: [
              { brand: { contains: q, mode: "insensitive" } },
              { model: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      prices: {
        where: region ? { region } : undefined,
        select: { region: true, retailer: true, currency: true, price: true, url: true, affiliateUrl: true },
        orderBy: { price: "asc" },
        take: 1,
      },
    },
    orderBy: { isPopular: "desc" },
  })

  const enriched = laptops.map(l => ({
    id: l.id,
    brand: l.brand,
    model: l.model,
    variant: l.variant,
    os: l.os,
    cpuBrand: l.cpuBrand,
    cpuFamily: l.cpuFamily,
    cpuCores: l.cpuCores,
    gpuType: l.gpuType,
    gpuModel: l.gpuModel,
    ramAmount: l.ramAmount,
    storageAmount: l.storageAmount,
    storageType: l.storageType,
    displaySize: l.displaySize,
    displayResolution: l.displayResolution,
    displayRefreshRate: l.displayRefreshRate,
    weight: l.weight,
    batteryLife: l.batteryLife,
    imageUrl: l.imageUrl,
    reviewScore: l.reviewScore,
    isPopular: l.isPopular,
    price: l.prices[0]?.price ?? null,
    currency: l.prices[0]?.currency ?? "USD",
  }))

  return NextResponse.json({ laptops: enriched })
})
