import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Analytics } from "@vercel/analytics/next"
import { Bricolage_Grotesque, Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${bricolage.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>{children}</main>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from "next"

const title = "Chameleon — Convert & Compress Images in Your Browser"
const description =
  "Turn HEIC into JPG, PNG, or WebP and shrink it on the way — entirely in your browser. No uploads, no accounts."

export const metadata: Metadata = {
  applicationName: "Chameleon",
  metadataBase: new URL("https://ic.mattgrilli.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Chameleon",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Chameleon — convert and compress images entirely in your browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.jpg"],
  },
}
