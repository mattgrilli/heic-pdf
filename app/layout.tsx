import type React from "react"
import "@/app/globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import Script from "next/script"
import { Analytics } from "@vercel/analytics/next"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {/* Google AdSense script */}
        <Script
          id="adsense-init"
          strategy="afterInteractive"
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2890525515305277"
          crossOrigin="anonymous"
        />
        
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <main>{children}</main>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}

import type { Metadata } from "next"

const title = "Convert & Compress Images in Your Browser | Image Converter"
const description =
  "Convert and compress HEIC, JPEG, PNG, and WebP entirely in your browser. Resize, hit a target file size, download — no uploads, no accounts."

export const metadata: Metadata = {
  metadataBase: new URL("https://ic.mattgrilli.com"),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "Image Converter",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Image Converter — convert and compress images entirely in your browser",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
}
