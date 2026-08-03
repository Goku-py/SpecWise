import type { Metadata, Viewport } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { ThemeScript } from "@/components/theme/theme-toggle"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const SITE_TITLE = "SpecWise — Find the right laptop without learning every spec"
const SITE_DESCRIPTION =
  "Answer a few simple questions and get laptop recommendations based on your budget, workload, and preferences."

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: "SpecWise",
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
}

// Light/dark background tokens from src/app/globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0a09" },
  ],
}

// Statically serialized site-wide structured data (Organization + WebSite).
const siteJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/#organization`,
      name: "SpecWise",
      url: BASE_URL,
    },
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/#website`,
      name: "SpecWise",
      url: BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: new URL("/laptops?q={search_term_string}", BASE_URL).toString(),
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground selection:bg-accent selection:text-background">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <ThemeScript />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
