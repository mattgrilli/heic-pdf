"use client"

import type React from "react"

import { useState, useEffect, type RefObject } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { PDFDocument } from "pdf-lib"
import { useToast } from "@/hooks/use-toast"
import { ImageIcon } from "lucide-react"

interface PdfImageEditorProps {
  pdfDoc: PDFDocument | null
  currentPage: number
  canvasRef: RefObject<HTMLCanvasElement>
}

export function PdfImageEditor({ pdfDoc, currentPage, canvasRef }: PdfImageEditorProps) {
  const { toast } = useToast()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [dimensions, setDimensions] = useState({ width: 200, height: 200 })
  const [isAdding, setIsAdding] = useState(false)
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 })

  // Get PDF dimensions when the canvas changes
  useEffect(() => {
    if (canvasRef.current) {
      setPdfDimensions({
        width: canvasRef.current.width,
        height: canvasRef.current.height,
      })
    }
  }, [canvasRef, currentPage])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    setImageFile(file)

    // Create a preview and get natural dimensions
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)

      // Get natural dimensions and set initial dimensions
      const img = new Image()
      img.onload = () => {
        // Scale the image to fit within the PDF while maintaining aspect ratio
        const maxWidth = Math.min(pdfDimensions.width - 100, 400)
        const scale = maxWidth / img.naturalWidth

        setDimensions({
          width: Math.round(img.naturalWidth * scale),
          height: Math.round(img.naturalHeight * scale),
        })
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPosition({ x, y })
  }

  const handleAddImage = async () => {
    if (!pdfDoc || !imageFile) return

    try {
      setIsAdding(true)

      // Get the page
      const pages = pdfDoc.getPages()
      const page = pages[currentPage - 1]

      // Convert image to bytes
      const imageBytes = await imageFile.arrayBuffer()

      // Embed the image
      let embeddedImage
      if (imageFile.type === "image/jpeg") {
        embeddedImage = await pdfDoc.embedJpg(imageBytes)
      } else if (imageFile.type === "image/png") {
        embeddedImage = await pdfDoc.embedPng(imageBytes)
      } else {
        // Convert other image types to PNG using canvas
        const img = new Image()
        img.src = imagePreview as string

        await new Promise((resolve) => {
          img.onload = resolve
        })

        const canvas = document.createElement("canvas")
        canvas.width = img.width
        canvas.height = img.height

        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not get canvas context")

        ctx.drawImage(img, 0, 0)

        const pngDataUrl = canvas.toDataURL("image/png")
        const pngData = atob(pngDataUrl.split(",")[1])
        const pngBytes = new Uint8Array(pngData.length)

        for (let i = 0; i < pngData.length; i++) {
          pngBytes[i] = pngData.charCodeAt(i)
        }

        embeddedImage = await pdfDoc.embedPng(pngBytes)
      }

      // Calculate dimensions while maintaining aspect ratio
      const { width, height } = dimensions

      // Draw the image on the page
      page.drawImage(embeddedImage, {
        x: position.x,
        y: page.getHeight() - position.y - height, // PDF coordinates start from bottom-left
        width,
        height,
      })

      // Refresh the PDF viewer
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      // Update the PDF viewer
      // Import a specific version of PDF.js from CDN
      const pdfjsLib = await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/+esm")

      // Set the worker source to the same version
      const workerUrl = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js"
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

      const loadingTask = pdfjsLib.getDocument(url)
      const pdf = await loadingTask.promise
      const pdfPage = await pdf.getPage(currentPage)

      const canvas = canvasRef.current
      if (!canvas) return

      const context = canvas.getContext("2d")
      if (!context) return

      const viewport = pdfPage.getViewport({ scale: 1 })
      canvas.height = viewport.height
      canvas.width = viewport.width

      await pdfPage.render({
        canvasContext: context,
        viewport,
      }).promise

      URL.revokeObjectURL(url)

      toast({
        title: "Image added",
        description: "Image has been added to the PDF.",
      })

      // Reset the image
      setImageFile(null)
      setImagePreview(null)
    } catch (error) {
      console.error("Error adding image:", error)
      toast({
        title: "Error adding image",
        description: "Failed to add image to the PDF.",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  if (!pdfDoc) {
    return <div className="text-center text-gray-500">Load a PDF to add images</div>
  }

  return (
    <div className="space-y-4">
      {!imageFile ? (
        <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-gray-50">
          <Label htmlFor="image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="p-3 rounded-full bg-primary/10">
                <ImageIcon className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Click to upload an image</span>
              <span className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</span>
            </div>
            <Input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </Label>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label>Image Preview</Label>
            <div className="border rounded-lg overflow-hidden p-2 flex justify-center">
              <img src={imagePreview || ""} alt="Preview" className="max-h-[150px] object-contain" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setImageFile(null)
                setImagePreview(null)
              }}
              className="w-full mt-2"
            >
              Remove Image
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Position (Click on the PDF to set position)</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="position-x" className="text-xs">
                  X
                </Label>
                <Input
                  id="position-x"
                  type="number"
                  value={position.x}
                  onChange={(e) => setPosition({ ...position, x: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="position-y" className="text-xs">
                  Y
                </Label>
                <Input
                  id="position-y"
                  type="number"
                  value={position.y}
                  onChange={(e) => setPosition({ ...position, y: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Dimensions</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="width" className="text-xs">
                  Width
                </Label>
                <Input
                  id="width"
                  type="number"
                  value={dimensions.width}
                  onChange={(e) => setDimensions({ ...dimensions, width: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="height" className="text-xs">
                  Height
                </Label>
                <Input
                  id="height"
                  type="number"
                  value={dimensions.height}
                  onChange={(e) => setDimensions({ ...dimensions, height: Number.parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleAddImage} disabled={isAdding} className="w-full">
            {isAdding ? "Adding Image..." : "Add Image to PDF"}
          </Button>
        </>
      )}

      <p className="text-xs text-gray-500 text-center">
        Click on the PDF to set the position where the image will be added
      </p>
    </div>
  )
}
