"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RotateCw, Type, Save, X } from "lucide-react"

interface ImageEditorProps {
  file: File
  previewUrl: string
  isOpen: boolean
  onClose: () => void
  onSave: (editedImage: Blob, editSettings: ImageEditSettings) => void
}

export interface ImageEditSettings {
  rotation: 0 | 90 | 180 | 270
  watermark?: {
    text: string
    position: "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
    opacity: number
  }
}

export function ImageEditor({ file, previewUrl, isOpen, onClose, onSave }: ImageEditorProps) {
  const [activeTab, setActiveTab] = useState("rotate")
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [watermarkText, setWatermarkText] = useState("")
  const [watermarkPosition, setWatermarkPosition] = useState<
    "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
  >("bottomRight")
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5)
  const [imageLoaded, setImageLoaded] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Initialize image
  useEffect(() => {
    if (!isOpen) return

    // Create image element
    const img = new Image()
    img.crossOrigin = "anonymous"

    img.onload = () => {
      imageRef.current = img
      setImageLoaded(true)
    }

    img.onerror = (e) => {
      console.error("Error loading image:", e)
    }

    img.src = previewUrl
  }, [isOpen, previewUrl])

  // Draw image on canvas when image is loaded or settings change
  useEffect(() => {
    if (!imageLoaded || !canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions based on image
    canvas.width = imageRef.current.width
    canvas.height = imageRef.current.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply rotation
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.rotate((rotation * Math.PI) / 180)

    // Draw image with rotation
    if (rotation === 90 || rotation === 270) {
      ctx.drawImage(imageRef.current, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width)
    } else {
      ctx.drawImage(imageRef.current, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height)
    }
    ctx.restore()

    // Add watermark if specified
    if (watermarkText) {
      ctx.save()
      ctx.globalAlpha = watermarkOpacity
      ctx.fillStyle = "white"
      ctx.strokeStyle = "black"
      ctx.lineWidth = 1
      ctx.font = `${Math.max(16, Math.floor(canvas.width / 20))}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Position the watermark
      let x = canvas.width / 2
      let y = canvas.height / 2

      if (watermarkPosition === "topLeft") {
        x = canvas.width * 0.1
        y = canvas.height * 0.1
        ctx.textAlign = "left"
      } else if (watermarkPosition === "topRight") {
        x = canvas.width * 0.9
        y = canvas.height * 0.1
        ctx.textAlign = "right"
      } else if (watermarkPosition === "bottomLeft") {
        x = canvas.width * 0.1
        y = canvas.height * 0.9
        ctx.textAlign = "left"
      } else if (watermarkPosition === "bottomRight") {
        x = canvas.width * 0.9
        y = canvas.height * 0.9
        ctx.textAlign = "right"
      }

      // Draw text with stroke for better visibility
      ctx.strokeText(watermarkText, x, y)
      ctx.fillText(watermarkText, x, y)
      ctx.restore()
    }
  }, [imageLoaded, rotation, watermarkText, watermarkPosition, watermarkOpacity])

  const handleSave = () => {
    if (!canvasRef.current) return

    // Create settings object
    const settings: ImageEditSettings = {
      rotation,
      watermark: watermarkText
        ? {
            text: watermarkText,
            position: watermarkPosition,
            opacity: watermarkOpacity,
          }
        : undefined,
    }

    // Convert canvas to blob and save
    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          onSave(blob, settings)
        }
      },
      "image/jpeg",
      0.95,
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
          <div className="relative overflow-auto border rounded-md bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
            {!imageLoaded ? (
              <div className="flex items-center justify-center h-[300px] w-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <canvas ref={canvasRef} className="max-w-full" />
            )}
          </div>

          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="rotate" className="flex flex-col items-center py-2">
                  <RotateCw className="h-4 w-4 mb-1" />
                  <span className="text-xs">Rotate</span>
                </TabsTrigger>
                <TabsTrigger value="watermark" className="flex flex-col items-center py-2">
                  <Type className="h-4 w-4 mb-1" />
                  <span className="text-xs">Watermark</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="rotate" className="space-y-4 pt-4">
                <div className="flex justify-around">
                  {[0, 90, 180, 270].map((angle) => (
                    <Button
                      key={angle}
                      variant={rotation === angle ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRotation(angle as 0 | 90 | 180 | 270)}
                    >
                      {angle}°
                    </Button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="watermark" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="watermarkText">Watermark Text</Label>
                  <Input
                    id="watermarkText"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="watermarkPosition">Position</Label>
                  <select
                    id="watermarkPosition"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={watermarkPosition}
                    onChange={(e) => setWatermarkPosition(e.target.value as any)}
                  >
                    <option value="center">Center</option>
                    <option value="topLeft">Top Left</option>
                    <option value="topRight">Top Right</option>
                    <option value="bottomLeft">Bottom Left</option>
                    <option value="bottomRight">Bottom Right</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="opacity">Opacity</Label>
                    <span>{Math.round(watermarkOpacity * 100)}%</span>
                  </div>
                  <Slider
                    id="opacity"
                    min={0}
                    max={100}
                    step={5}
                    value={[watermarkOpacity * 100]}
                    onValueChange={(value) => setWatermarkOpacity(value[0] / 100)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!imageLoaded}>
            <Save className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
