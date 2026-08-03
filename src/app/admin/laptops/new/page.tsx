import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { LaptopForm } from "../laptop-form"

export const dynamic = "force-dynamic"

export default async function NewLaptopPage() {
  const c = await cookies()
  if (c.get("admin_key")?.value !== process.env.ADMIN_API_KEY) {
    redirect("/admin")
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">Add Laptop</h1>
      <p className="mb-6 text-sm text-muted">
        Slug is auto-generated from brand-model-variant. Prices can be added later via
        the import endpoint.
      </p>
      <LaptopForm mode="create" />
    </div>
  )
}
