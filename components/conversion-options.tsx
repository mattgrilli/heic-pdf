"use client"

import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type OutputFormat = "jpeg" | "png" | "webp"

interface ConversionOptionsProps {
  formats: OutputFormat[]
  setFormats: (formats: OutputFormat[]) => void
  quality: number
  setQuality: (quality: number) => void
  autoDownload: boolean
  setAutoDownload: (autoDownload: boolean) => void
  preserveExif: boolean
  setPreserveExif: (preserveExif: boolean) => void
}

export function ConversionOptions({
  formats,
  setFormats,
  quality,
  setQuality,
  autoDownload,
  setAutoDownload,
  preserveExif,
  setPreserveExif,
}: ConversionOptionsProps) {
  const [activeTab, setActiveTab] = useState<"basic" | "advanced">("basic")

  const handleFormatChange = (format: OutputFormat, checked: boolean) => {
    if (checked) {
      setFormats([...formats, format])
    } else {
      // Don't allow removing the last format
      if (formats.length > 1) {
        setFormats(formats.filter((f) => f !== format))
      }
    }
  }

  return (
    <Card className="dark:border-gray-700">
      <CardHeader>
        <CardTitle>Conversion Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "basic" | "advanced")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Output Format</Label>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="jpeg"
                    checked={formats.includes("jpeg")}
                    onCheckedChange={(checked) => handleFormatChange("jpeg", !!checked)}
                  />
                  <Label htmlFor="jpeg">JPEG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="png"
                    checked={formats.includes("png")}
                    onCheckedChange={(checked) => handleFormatChange("png", !!checked)}
                  />
                  <Label htmlFor="png">PNG</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="webp"
                    checked={formats.includes("webp")}
                    onCheckedChange={(checked) => handleFormatChange("webp", !!checked)}
                  />
                  <Label htmlFor="webp">WebP</Label>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select multiple formats to convert to all of them at once
              </p>
            </div>

            {(formats.includes("jpeg") || formats.includes("webp")) && (
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

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-download">Auto-download converted files</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Automatically download files after conversion
                </p>
              </div>
              <Switch id="auto-download" checked={autoDownload} onCheckedChange={setAutoDownload} />
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="preserve-exif">Preserve EXIF metadata</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Keep camera information, date, and location data (if available)
                </p>
              </div>
              <Switch id="preserve-exif" checked={preserveExif} onCheckedChange={setPreserveExif} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <h3 className="text-sm font-medium">Format Information</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">JPEG</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Best for photos. Smaller file size with some quality loss. Supports quality adjustment.
                  </p>
                </div>
                <div>
                  <p className="font-medium">PNG</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Lossless format with larger file size. Best for images with text or transparency.
                  </p>
                </div>
                <div>
                  <p className="font-medium">WebP</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Modern format with excellent compression. Smaller than JPEG with similar quality.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
