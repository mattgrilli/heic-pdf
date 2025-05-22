"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"

interface FeedbackFormProps {
  onClose: () => void
}

export function FeedbackForm({ onClose }: FeedbackFormProps) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [feedback, setFeedback] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Submit form using Web3Forms
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          access_key: "f3e82dc0-aefc-417d-986e-a2c8f1fb41aa", // Your Web3Forms access key
          name,
          email,
          message: feedback,
          subject: "New Feedback from HEIC Converter",
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Feedback received",
          description: "Thank you for your feedback! We appreciate your input.",
        })
        onClose()
      } else {
        throw new Error(data.message || "Something went wrong")
      }
    } catch (error) {
      toast({
        title: "Error submitting feedback",
        description: "There was a problem submitting your feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="relative">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
        <CardTitle>Send Feedback</CardTitle>
        <CardDescription>Help us improve this tool by sharing your thoughts and suggestions.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback">Your Feedback</Label>
            <Textarea
              id="feedback"
              placeholder="Share your thoughts, suggestions, or report issues..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              className="min-h-[100px]"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting || !feedback.trim()}>
            {isSubmitting ? "Sending..." : "Send Feedback"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
