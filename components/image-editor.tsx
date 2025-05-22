"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { RotateCw, Crop, Type, ImageIcon, ZoomIn, ZoomOut, Save, X } from "lucide-react"

interface ImageEditorProps {
  file: File
  previewUrl: string
  isOpen: boolean
  onClose: () => void
  onSave: (editedImage: Blob, editSettings: ImageEditSettings) => void
}

export interface ImageEditSettings {
  rotation: 0 | 90 | 180 | 270
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }
  resize?: {
    width?: number
    height?: number
    maintainAspectRatio: boolean
  }
  watermark?: {
    text: string
    position: "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
    opacity: number
  }
}

export function ImageEditor({ file, previewUrl, isOpen, onClose, onSave }: ImageEditorProps) {
  const [activeTab, setActiveTab] = useState("rotate")
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState<0 | 90 | 180 | 270>(0)
  const [watermarkText, setWatermarkText] = useState("")
  const [watermarkPosition, setWatermarkPosition] = useState<
    "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
  >("bottomRight")
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.5)
  const [resizeWidth, setResizeWidth] = useState<number | undefined>(undefined)
  const [resizeHeight, setResizeHeight] = useState<number | undefined>(undefined)
  const [maintainAspectRatio, setMaintainAspectRatio] = useState(true)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })
  const [isCropping, setIsCropping] = useState(false)
  const [cropRect, setCropRect] = useState({ x: 0, y: 0, width: 0, height: 0 })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const cropStartRef = useRef<{ x: number; y: number } | null>(null)

  // Load image and initialize canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      // Store original dimensions
      setOriginalDimensions({ width: img.width, height: img.height })

      // Set initial resize values
      setResizeWidth(img.width)
      setResizeHeight(img.height)

      // Set canvas dimensions
      canvas.width = img.width
      canvas.height = img.height

      // Draw image
      drawImage(img, ctx, rotation, { text: watermarkText, position: watermarkPosition, opacity: watermarkOpacity })

      // Store image reference
      imageRef.current = img
    }

    img.src = previewUrl
  }, [isOpen, previewUrl, rotation, watermarkText, watermarkPosition, watermarkOpacity])

  // Redraw canvas when rotation or watermark changes
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    drawImage(imageRef.current, ctx, rotation, {
      text: watermarkText,
      position: watermarkPosition,
      opacity: watermarkOpacity,
    })
  }, [rotation, watermarkText, watermarkPosition, watermarkOpacity])

  // Handle aspect ratio when resizing
  useEffect(() => {
    if (!maintainAspectRatio || !originalDimensions.width || !originalDimensions.height) return

    const aspectRatio = originalDimensions.width / originalDimensions.height

    if (resizeWidth && !resizeHeight) {
      setResizeHeight(Math.round(resizeWidth / aspectRatio))
    } else if (resizeHeight && !resizeWidth) {
      setResizeWidth(Math.round(resizeHeight * aspectRatio))
    }
  }, [resizeWidth, resizeHeight, maintainAspectRatio, originalDimensions])

  // Helper function to draw image with rotation and watermark
  const drawImage = (
    img: HTMLImageElement,
    ctx: CanvasRenderingContext2D,
    rotation: 0 | 90 | 180 | 270,
    watermark?: { text: string; position: string; opacity: number },
  ) => {
    const canvas = ctx.canvas

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Handle rotation
    if (rotation) {
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)

      // If rotation is 90 or 270 degrees, swap width and height
      if (rotation === 90 || rotation === 270) {
        ctx.drawImage(img, -canvas.height / 2, -canvas.width / 2, canvas.height, canvas.width)
      } else {
        ctx.drawImage(img, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height)
      }

      ctx.restore()
    } else {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }

    // Add watermark if specified
    if (watermark && watermark.text) {
      ctx.save()
      ctx.globalAlpha = watermark.opacity
      ctx.fillStyle = "white"
      ctx.strokeStyle = "black"
      ctx.lineWidth = 1
      ctx.font = `${Math.max(16, Math.floor(canvas.width / 20))}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      // Position the watermark
      let x = canvas.width / 2
      let y = canvas.height / 2

      if (watermark.position === "topLeft") {
        x = canvas.width * 0.1
        y = canvas.height * 0.1
        ctx.textAlign = "left"
      } else if (watermark.position === "topRight") {
        x = canvas.width * 0.9
        y = canvas.height * 0.1
        ctx.textAlign = "right"
      } else if (watermark.position === "bottomLeft") {
        x = canvas.width * 0.1
        y = canvas.height * 0.9
        ctx.textAlign = "left"
      } else if (watermark.position === "bottomRight") {
        x = canvas.width * 0.9
        y = canvas.height * 0.9
        ctx.textAlign = "right"
      }

      // Draw text with stroke for better visibility
      ctx.strokeText(watermark.text, x, y)
      ctx.fillText(watermark.text, x, y)
      ctx.restore()
    }

    // Draw crop overlay if in crop mode
    if (isCropping && cropRect.width > 0 && cropRect.height > 0) {
      ctx.save()

      // Darken the entire image
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Clear the crop area
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height)

      // Draw border around crop area
      ctx.strokeStyle = "white"
      ctx.lineWidth = 2
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.width, cropRect.height)

      ctx.restore()
    }
  }

  // Handle mouse events for cropping
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !canvasRef.current) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    cropStartRef.current = { x, y }
    setCropRect({ x, y, width: 0, height: 0 })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isCropping || !cropStartRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx || !imageRef.current) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    const width = x - cropStartRef.current.x
    const height = y - cropStartRef.current.y

    setCropRect({
      x: cropStartRef.current.x,
      y: cropStartRef.current.y,
      width,
      height,
    })

    // Redraw with crop overlay
    drawImage(imageRef.current, ctx, rotation, {
      text: watermarkText,
      position: watermarkPosition,
      opacity: watermarkOpacity,
    })
  }

  const handleMouseUp = () => {
    if (!isCropping) return
    cropStartRef.current = null
  }

  const handleSave = () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current

    // Apply crop if active
    if (isCropping && cropRect.width !== 0 && cropRect.height !== 0) {
      const tempCanvas = document.createElement("canvas")
      const tempCtx = tempCanvas.getContext("2d")

      if (!tempCtx) return

      // Ensure positive width and height
      const x = cropRect.width > 0 ? cropRect.x : cropRect.x + cropRect.width
      const y = cropRect.height > 0 ? cropRect.y : cropRect.y + cropRect.height
      const width = Math.abs(cropRect.width)
      const height = Math.abs(cropRect.height)

      tempCanvas.width = width
      tempCanvas.height = height

      // Draw cropped region
      tempCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)

      // Replace main canvas with cropped canvas
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(tempCanvas, 0, 0)
      }
    }

    // Create settings object
    const settings: ImageEditSettings = {
      rotation,
      resize:
        resizeWidth || resizeHeight
          ? {
              width: resizeWidth,
              height: resizeHeight,
              maintainAspectRatio,
            }
          : undefined,
      watermark: watermarkText
        ? {
            text: watermarkText,
            position: watermarkPosition,
            opacity: watermarkOpacity,
          }
        : undefined,
    }

    // Convert canvas to blob and save
    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob, settings)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Image</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
          <div className="relative overflow-auto border rounded-md bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <div className="relative" style={{ transform: `scale(${zoom})` }}>
              <canvas
                ref={canvasRef}
                className="max-w-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              />
            </div>

            <div className="absolute bottom-2 right-2 flex gap-2 bg-white dark:bg-gray-800 rounded-md p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="flex items-center text-xs px-1">{Math.round(zoom * 100)}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.1))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="rotate" className="flex flex-col items-center py-2">
                  <RotateCw className="h-4 w-4 mb-1" />
                  <span className="text-xs">Rotate</span>
                </TabsTrigger>
                <TabsTrigger value="crop" className="flex flex-col items-center py-2">
                  <Crop className="h-4 w-4 mb-1" />
                  <span className="text-xs">Crop</span>
                </TabsTrigger>
                <TabsTrigger value="resize" className="flex flex-col items-center py-2">
                  <ImageIcon className="h-4 w-4 mb-1" />
                  <span className="text-xs">Resize</span>
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

              <TabsContent value="crop" className="space-y-4 pt-4">
                <Button
                  variant={isCropping ? "default" : "outline"}
                  onClick={() => {
                    setIsCropping(!isCropping)
                    if (!isCropping) {
                      setCropRect({ x: 0, y: 0, width: 0, height: 0 })
                    }
                  }}
                >
                  {isCropping ? "Cancel Crop" : "Start Cropping"}
                </Button>

                {isCropping && (
                  <p className="text-xs text-muted-foreground">Click and drag on the image to select the crop area</p>
                )}
              </TabsContent>

              <TabsContent value="resize" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="width">Width</Label>
                    <span className="text-xs text-muted-foreground">Original: {originalDimensions.width}px</span>
                  </div>
                  <Input
                    id="width"
                    type="number"
                    value={resizeWidth || ""}
                    onChange={(e) => setResizeWidth(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                    placeholder="Width in pixels"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="height">Height</Label>
                    <span className="text-xs text-muted-foreground">Original: {originalDimensions.height}px</span>
                  </div>
                  <Input
                    id="height"
                    type="number"
                    value={resizeHeight || ""}
                    onChange={(e) => setResizeHeight(e.target.value ? Number.parseInt(e.target.value) : undefined)}
                    placeholder="Height in pixels"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="maintainAspectRatio"
                    checked={maintainAspectRatio}
                    onChange={(e) => setMaintainAspectRatio(e.target.checked)}
                  />
                  <Label htmlFor="maintainAspectRatio">Maintain aspect ratio</Label>
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
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Apply Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
