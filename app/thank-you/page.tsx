"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"

export default function ThankYouPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  useEffect(() => {
    // You could verify the session here with your backend
    if (!sessionId) {
      router.push("/")
    }
  }, [sessionId, router])

  return (
    <div className="container mx-auto py-16 px-4 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Thank You for Your Support!</CardTitle>
          <CardDescription>Your donation helps keep this tool free and maintained.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>
            We appreciate your generosity. Your contribution will help us continue to improve the HEIC Converter and
            develop more useful tools.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/")}>Return to Converter</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
