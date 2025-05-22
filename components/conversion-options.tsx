"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ConversionOptionsProps {
  format: "jpeg" | "png"
  setFormat: (format: "jpeg" | "png") => void
  quality: number
  setQuality: (quality: number) => void
}

export function ConversionOptions({ format, setFormat, quality, setQuality }: ConversionOptionsProps) {
  return (
    <Card className="dark:border-gray-700">
      <CardHeader>
        <CardTitle>Conversion Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Output Format</Label>
          <RadioGroup
            value={format}
            onValueChange={(value) => setFormat(value as "jpeg" | "png")}
            className="flex space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="jpeg" id="jpeg" />
              <Label htmlFor="jpeg">JPEG</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="png" id="png" />
              <Label htmlFor="png">PNG</Label>
            </div>
          </RadioGroup>
        </div>

        {format === "jpeg" && (
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Quality</Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">{Math.round(quality * 100)}%</span>
            </div>
            <Slider
              value={[quality * 100]}
              min={10}
              max={100}
              step={5}
              onValueChange={(value) => setQuality(value[0] / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Lower quality, smaller file</span>
              <span>Higher quality, larger file</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
