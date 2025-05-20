"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Generate a unique session ID if one doesn't exist
    let sessionId = localStorage.getItem("heicConverterSessionId")
    if (!sessionId) {
      sessionId = uuidv4()
      localStorage.setItem("heicConverterSessionId", sessionId)
    }

    // Redirect to the unique session page
    router.push(`/session/${sessionId}`)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse">Redirecting to your private session...</div>
    </div>
  )
}
