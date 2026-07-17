import type { Metadata } from "next"
import { DM_Sans } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { RegionProvider } from "@/components/region-context"
import { ThemeScript } from "@/components/theme/theme-toggle"

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "SpecWise — Find the right laptop without learning every spec",
  description: "Answer a few simple questions and get laptop recommendations based on your budget, workload, and preferences.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground selection:bg-accent selection:text-background">
        <ThemeScript />
        <RegionProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </RegionProvider>
      </body>
    </html>
  )
}
