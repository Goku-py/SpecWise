import type { Metadata, Viewport } from "next"
import { Geist, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { BootSequenceWrapper } from "@/components/boot/boot-sequence-wrapper"
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

const SITE_TITLE = "SpecWise — Match your workload to exact laptop hardware"
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

// Dark-only background token from src/app/globals.css.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#090A0F",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        <BootSequenceWrapper laptopCount={laptopCount} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
