import type { Metadata, Viewport } from "next"
import { Geist, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BootSequenceWrapper } from "@/components/boot/boot-sequence-wrapper"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { NO_FLASH_SCRIPT } from "@/components/theme/theme"
import { stringifyJsonLd } from "@/lib/jsonld"
import { prisma } from "@/lib/prisma"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
})

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const SITE_TITLE = "SpecWise — Find the Right Laptop"
const SITE_DESCRIPTION =
  "Zero affiliate bias. Zero jargon. Match your workload to exact laptop hardware specs. F-score ranked recommendations based on real hardware data."

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

// Theme-aware chrome color: light paper / dark background tokens from
// src/app/globals.css. Static viewport export — stays server-rendered.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F1" },
    { media: "(prefers-color-scheme: dark)", color: "#090A0F" },
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

async function getLaptopCount(): Promise<number> {
  try {
    return await prisma.laptop.count({ where: { status: "active" } })
  } catch {
    return 0
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const laptopCount = await getLaptopCount()

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground selection:bg-accent selection:text-background">
        {/* Theme pre-paint: applies stored/OS theme before first paint (no-flash). */}
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(siteJsonLd) }}
        />
        <ThemeProvider>
        <BootSequenceWrapper laptopCount={laptopCount} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
        </ThemeProvider>
      </body>
    </html>
  )
}
