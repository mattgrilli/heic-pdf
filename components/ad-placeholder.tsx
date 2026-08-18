"use client"

import { useEffect, useRef, useState } from "react"

export function AdPlaceholder() {
  const insRef = useRef<HTMLModElement>(null)
  const [adFilled, setAdFilled] = useState(false)

  useEffect(() => {
    // Only run this in the browser
    if (typeof window === "undefined") return

    // Request an ad once the AdSense script (loaded in the page) is ready
    const initializeAds = () => {
      try {
        if (window.adsbygoogle) {
          ;(window.adsbygoogle = window.adsbygoogle || []).push({})
        }
      } catch (error) {
        console.error("AdSense error:", error)
      }
    }

    let pollScript: ReturnType<typeof setInterval> | undefined
    if (window.adsbygoogle) {
      initializeAds()
    } else {
      pollScript = setInterval(() => {
        if (window.adsbygoogle) {
          clearInterval(pollScript)
          initializeAds()
        }
      }, 200)
    }

    // Only reveal the card once an ad has actually been filled — an empty
    // ad box (ad blockers, dev, no inventory) looks broken otherwise
    const pollStatus = setInterval(() => {
      if (insRef.current?.getAttribute("data-ad-status") === "filled") {
        setAdFilled(true)
        clearInterval(pollStatus)
      }
    }, 500)
    const stopPolling = setTimeout(() => {
      clearInterval(pollStatus)
      if (pollScript) clearInterval(pollScript)
    }, 10000)

    return () => {
      if (pollScript) clearInterval(pollScript)
      clearInterval(pollStatus)
      clearTimeout(stopPolling)
    }
  }, [])

  return (
    <div
      className={
        adFilled
          ? "border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
          : "max-h-0 overflow-hidden opacity-0"
      }
      aria-hidden={!adFilled}
    >
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
        Advertisement
      </div>
      {/* Google AdSense Ad Unit */}
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: "block", width: "100%", height: "250px" }}
        data-ad-client="ca-pub-2890525515305277"
        data-ad-slot="XXXXXXXXXX" // Replace with your ad slot ID
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  )
}
