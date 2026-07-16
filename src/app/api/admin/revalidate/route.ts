import { NextResponse } from "next/server"
import { verifyAdminApiKey } from "@/lib/admin-auth"
import { invalidateCatalogCache } from "@/lib/catalog-cache"

export async function POST(request: Request) {
  if (!verifyAdminApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  invalidateCatalogCache()
  return NextResponse.json({ ok: true })
}
