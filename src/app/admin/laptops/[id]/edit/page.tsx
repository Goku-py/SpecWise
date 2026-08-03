import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { laptopToFormValues } from "@/lib/laptop-fields"
import { LaptopForm } from "../../laptop-form"

export const dynamic = "force-dynamic"

export default async function EditLaptopPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const c = await cookies()
  if (c.get("admin_key")?.value !== process.env.ADMIN_API_KEY) {
    redirect("/admin")
  }

  const { id } = await params
  const laptop = await prisma.laptop.findUnique({ where: { id } })
  if (!laptop) notFound()

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-bold">
        Edit {laptop.brand} {laptop.model}
      </h1>
      <p className="mb-6 text-sm text-muted">
        Slug only changes when brand or model changes; other fields never alter the URL.
      </p>
      <LaptopForm mode="edit" id={laptop.id} initialValues={laptopToFormValues(laptop)} />
    </div>
  )
}
