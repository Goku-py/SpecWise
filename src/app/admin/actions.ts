"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { invalidateCatalogCache } from "@/lib/catalog-cache"

export async function toggleLaptopActive(id: string, current: boolean) {
  const h = await headers()
  const auth = h.get("Authorization") ?? ""
  const ADMIN_API_KEY = process.env.ADMIN_API_KEY

  // ponytail: bare string compare — timing-safe isn't needed over HTTPS (network jitter dwarfs
  // any nanosecond difference). The API routes (laptops/*, admin/revalidate) still use
  // crypto.timingSafeEqual via verifyAdminApiKey() for consistency with those paths.
  if (!ADMIN_API_KEY || !auth.startsWith("Bearer ") || auth.slice(7) !== ADMIN_API_KEY) {
    return { ok: false, error: "Unauthorized" }
  }

  try {
    await prisma.laptop.update({
      where: { id },
      data: { isActive: !current },
    })
    invalidateCatalogCache()
    revalidatePath("/admin")
    return { ok: true }
  } catch (e) {
    console.error("Toggle error:", e)
    return { ok: false, error: "Failed to update laptop" }
  }
}
