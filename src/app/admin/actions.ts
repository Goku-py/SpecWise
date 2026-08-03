"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { cookies } from "next/headers"
import { checkRateLimit } from "@/lib/rate-limit"
import { LaptopFormSchema, formDataToLaptopValues, formatZodError } from "@/lib/laptop-fields"
import { createLaptop, setLaptopStatus, updateLaptop } from "@/lib/db/catalog"
import type { Status } from "@/generated/prisma/client"

const ADMIN_KEY = process.env.ADMIN_API_KEY

/** Same cookie guard the /admin page uses (browser actions can't send headers). */
async function isAdminAuthed(): Promise<boolean> {
  const c = await cookies()
  return c.get("admin_key")?.value === ADMIN_KEY
}

export interface ActionState {
  error?: string
}

export async function login(_prev: unknown, formData: FormData) {
  // Throttle key guessing: 10 attempts/minute/IP
  const h = await headers()
  const forwarded = h.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  const rateLimit = await checkRateLimit(`login:${ip}`, 10, 60)
  if (!rateLimit.allowed) {
    return { error: "Too many attempts. Try again in a minute." }
  }

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

export async function toggleLaptopStatus(id: string, currentStatus: string) {
  // ponytail: browser-triggered server actions can't set an Authorization header, so
  // authenticate via the admin_key cookie — the same mechanism the /admin page guard uses.
  if (!(await isAdminAuthed())) {
    return { ok: false, error: "Unauthorized" }
  }

  // Phase 2a: toggle between active <-> archived (draft is not reachable from the
  // table UI; it's managed via the API PATCH route). Write goes through the
  // catalog mutation layer (setLaptopStatus) which handles invalidation.
  const next: Status = currentStatus === "active" ? "archived" : "active"
  const result = await setLaptopStatus(id, next)
  if (!result.ok) {
    console.error("Toggle error:", result.error)
    return { ok: false, error: "Failed to update laptop" }
  }
  return { ok: true }
}

export async function createLaptopAction(
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  if (!(await isAdminAuthed())) {
    return { error: "Unauthorized" }
  }

  const parsed = LaptopFormSchema.safeParse(formDataToLaptopValues(formData))
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const result = await createLaptop(parsed.data)
  if (!result.ok) {
    return { error: result.error }
  }

  redirect("/admin")
}

export async function updateLaptopAction(
  id: string,
  _prev: ActionState | null,
  formData: FormData
): Promise<ActionState> {
  if (!(await isAdminAuthed())) {
    return { error: "Unauthorized" }
  }

  const parsed = LaptopFormSchema.safeParse(formDataToLaptopValues(formData))
  if (!parsed.success) {
    return { error: formatZodError(parsed.error) }
  }

  const result = await updateLaptop(id, parsed.data)
  if (!result.ok) {
    return { error: result.error }
  }

  redirect("/admin")
}
