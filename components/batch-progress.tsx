"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, AlertCircle, Clock } from "lucide-react"

interface BatchProgressProps {
  totalFiles: number
  completedFiles: number
  currentFile: string
  errors: string[]
}

export function BatchProgress({ totalFiles, completedFiles, currentFile, errors }: BatchProgressProps) {
  const progress = (completedFiles / totalFiles) * 100

  return (
    <Card className="dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Converting Files
        </CardTitle>
        <CardDescription>
          {completedFiles} of {totalFiles} files completed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {currentFile && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="truncate">Converting: {currentFile}</span>
          </div>
        )}

        {completedFiles > 0 && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span>{completedFiles} files converted successfully</span>
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.length} conversion errors</span>
            </div>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-xs text-red-500 dark:text-red-400 truncate">
                  {error}
                </p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
