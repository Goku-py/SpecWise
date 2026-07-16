import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { RegionProvider } from "@/components/region-context"
import { ThemeScript } from "@/components/theme/theme-toggle"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "SpecWise — Find the right laptop without learning every spec",
  description: "Answer a few simple questions and get laptop recommendations based on your budget, workload, and preferences.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
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
