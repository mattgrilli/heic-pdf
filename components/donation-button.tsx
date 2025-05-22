"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Coffee } from "lucide-react"
import { loadStripe } from "@stripe/stripe-js"

// Replace with your own Stripe publishable key
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "")

export function DonationButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleDonation = async () => {
    setIsLoading(true)
    try {
      const stripe = await stripePromise

      if (!stripe) {
        throw new Error("Stripe failed to load")
      }

      // Call your server endpoint to create a Checkout Session
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 500, // $5.00 in cents
          productName: "Support HEIC Converter",
        }),
      })

      const session = await response.json()

      // Redirect to Stripe Checkout
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      })

      if (result.error) {
        console.error(result.error.message)
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900 dark:border-gray-700">
      <h3 className="font-medium mb-2">Support This Tool</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        If you find this converter useful, consider buying me a coffee to help keep it running.
      </p>
      <Button className="w-full" variant="default" onClick={handleDonation} disabled={isLoading}>
        <Coffee className="h-4 w-4 mr-2" />
        {isLoading ? "Processing..." : "Buy Me a Coffee"}
      </Button>
    </div>
  )
}
