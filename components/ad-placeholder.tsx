"use client"

import { useEffect, useRef } from "react"

export function AdPlaceholder() {
  const adContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Only run this in the browser
    if (typeof window === "undefined") return

    // Check if Google AdSense is already loaded
    if (!window.adsbygoogle) {
      // Create AdSense script
      const script = document.createElement("script")
      script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
      script.async = true
      script.crossOrigin = "anonymous"
      // Replace with your own AdSense publisher ID
      script.dataset.adClient = "ca-pub-XXXXXXXXXXXXXXXX"
      document.head.appendChild(script)
    }

    // Initialize ads when the script is loaded
    const initializeAds = () => {
      try {
        if (window.adsbygoogle) {
          ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        }
      } catch (error) {
        console.error("AdSense error:", error)
      }
    }

    // Check if AdSense is loaded
    if (window.adsbygoogle) {
      initializeAds()
    } else {
      // Wait for AdSense to load
      const interval = setInterval(() => {
        if (window.adsbygoogle) {
          clearInterval(interval)
          initializeAds()
        }
      }, 200)

      // Clean up interval
      return () => clearInterval(interval)
    }
  }, [])

  return (
    <div className="border rounded-lg overflow-hidden dark:border-gray-700">
      <div className="bg-gray-100 dark:bg-gray-800 p-2 text-xs text-gray-500 dark:text-gray-400">Advertisement</div>
      <div ref={adContainerRef} className="h-[250px] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        {/* Google AdSense Ad Unit */}
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: "100%", height: "250px" }}
          data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your AdSense publisher ID
          data-ad-slot="XXXXXXXXXX" // Replace with your ad slot ID
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>

        {/* Fallback content if ads don't load */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-gray-400 dark:text-gray-600 text-sm">Ad Space</p>
        </div>
      </div>
    </div>
  )
}
