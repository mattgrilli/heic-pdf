"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface UsageStatsProps {
  stats: {
    totalConversions: number
    sessionsStarted: number
    lastUsed: string
  }
  onClose: () => void
}

export function UsageStats({ stats, onClose }: UsageStatsProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return "Never"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString() + " " + date.toLocaleTimeString()
    } catch (e) {
      return "Invalid date"
    }
  }

  return (
    <Card className="mb-6 dark:border-gray-700">
      <CardHeader className="relative">
        <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose} aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
        <CardTitle>Your Usage Statistics</CardTitle>
        <CardDescription>Summary of your HEIC converter usage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold">{stats.totalConversions}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Images Converted</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-3xl font-bold">{stats.sessionsStarted}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Sessions Started</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg text-center">
            <p className="text-sm font-medium">{formatDate(stats.lastUsed)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Last Used</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
