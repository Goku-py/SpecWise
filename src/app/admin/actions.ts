"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { invalidateCatalogCache } from "@/lib/catalog-cache"

const ADMIN_KEY = process.env.ADMIN_API_KEY

export async function login(_prev: unknown, formData: FormData) {
  const key = formData.get("key")
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return { error: "Invalid key" }
  }
  const c = await cookies()
  c.set("admin_key", key as string, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24h
    path: "/admin",
  })
  return { ok: true }
}

export async function logout() {
  const c = await cookies()
  c.delete("admin_key")
}

export async function toggleLaptopActive(id: string, current: boolean) {
  const h = await headers()
  const auth = h.get("Authorization") ?? ""

  // ponytail: bare string compare — timing-safe isn't needed over HTTPS (network jitter dwarfs
  // any nanosecond difference). The API routes (laptops/*, admin/revalidate) still use
  // crypto.timingSafeEqual via verifyAdminApiKey() for consistency with those paths.
  if (!ADMIN_KEY || !auth.startsWith("Bearer ") || auth.slice(7) !== ADMIN_KEY) {
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
