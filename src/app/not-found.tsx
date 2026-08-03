import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The page you&apos;re looking for doesn&apos;t exist or has moved. Try the quiz,
        or browse the catalog instead.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link href="/" className={buttonVariants()}>
          Back to Home
        </Link>
        <Link href="/laptops" className={buttonVariants({ variant: "secondary" })}>
          Browse Catalog
        </Link>
      </div>
    </div>
  )
}
