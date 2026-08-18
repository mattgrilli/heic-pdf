"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Coffee } from "lucide-react"

export function DonationButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDonation = async () => {
    setIsLoading(true)
    try {
      // Create a Checkout Session and navigate to its hosted payment page
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 500, // $5.00 in cents
          productName: "Support Image Converter",
        }),
      })

      const session = await response.json()

      if (!response.ok || !session.url) {
        throw new Error(session.error || "Failed to create checkout session")
      }

      window.location.href = session.url
    } catch (error) {
      console.error("Error:", error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-gray-500 dark:text-gray-400"
      onClick={handleDonation}
      disabled={isLoading}
    >
      <Coffee className="h-4 w-4 mr-2" />
      {isLoading ? "Processing..." : "Buy me a coffee"}
    </Button>
  )
}
