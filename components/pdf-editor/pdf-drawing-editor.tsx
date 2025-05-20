"use client"

import type React from "react"

import { useState, useRef, type RefObject, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { type PDFDocument, rgb } from "pdf-lib"
import { useToast } from "@/hooks/use-toast"

interface PdfDrawingEditorProps {
  pdfDoc: PDFDocument | null
  currentPage: number
  canvasRef: RefObject<HTMLCanvasElement>
}

export function PdfDrawingEditor({ pdfDoc, currentPage, canvasRef }: PdfDrawingEditorProps) {
  const { toast } = useToast()
  const [isDrawing, setIsDrawing] = useState(false)
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [paths, setPaths] = useState<Array<{ points: { x: number; y: number }[]; color: string; width: number }>>([])
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Set up the drawing canvas when the PDF canvas changes
  useEffect(() => {
    const setupDrawingCanvas = () => {
      const pdfCanvas = canvasRef.current
      const drawingCanvas = drawingCanvasRef.current
      const container = containerRef.current

      if (!pdfCanvas || !drawingCanvas || !container) return

      // Match the drawing canvas size to the PDF canvas
      drawingCanvas.width = pdfCanvas.width
      drawingCanvas.height = pdfCanvas.height

      // Position the drawing canvas container
      container.style.width = `${pdfCanvas.width}px`
      container.style.height = `${pdfCanvas.height}px`

      // Clear the canvas
      const ctx = drawingCanvas.getContext("2d")
      if (ctx) {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height)
      }
    }

    // Wait for the PDF canvas to be rendered
    const checkCanvasInterval = setInterval(() => {
      if (canvasRef.current?.width) {
        setupDrawingCanvas()
        clearInterval(checkCanvasInterval)
      }
    }, 100)

    return () => clearInterval(checkCanvasInterval)
  }, [canvasRef, currentPage, pdfDoc])

  // Draw all saved paths
  useEffect(() => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw all saved paths
    paths.forEach((path) => {
      if (path.points.length < 2) return

      ctx.beginPath()
      ctx.moveTo(path.points[0].x, path.points[0].y)

      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y)
      }

      ctx.strokeStyle = path.color
      ctx.lineWidth = path.width
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.stroke()
    })
  }, [paths])

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current
    if (!canvas) return

    setIsDrawing(true)

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPath([{ x, y }])

    // Start drawing on the canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = strokeWidth
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setCurrentPath((prev) => [...prev, { x, y }])

    // Draw on the canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return

    setIsDrawing(false)

    // Save the current path
    if (currentPath.length > 1) {
      setPaths((prev) => [
        ...prev,
        {
          points: currentPath,
          color: strokeColor,
          width: strokeWidth,
        },
      ])
    }

    setCurrentPath([])
  }

  const clearDrawing = () => {
    setPaths([])
    setCurrentPath([])

    const canvas = drawingCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveDrawingToPdf = async () => {
    if (!pdfDoc || paths.length === 0) return

    try {
      setIsSaving(true)

      // Get the page
      const pages = pdfDoc.getPages()
      const page = pages[currentPage - 1]

      // Draw each path on the PDF
      paths.forEach((path) => {
        if (path.points.length < 2) return

        // Convert hex color to rgb
        const hexToRgb = (hex: string) => {
          const r = Number.parseInt(hex.slice(1, 3), 16) / 255
          const g = Number.parseInt(hex.slice(3, 5), 16) / 255
          const b = Number.parseInt(hex.slice(5, 7), 16) / 255
          return { r, g, b }
        }
        const color = hexToRgb(path.color)

        // Draw the path as a series of lines
        for (let i = 1; i < path.points.length; i++) {
          const start = path.points[i - 1]
          const end = path.points[i]

          page.drawLine({
            start: { x: start.x, y: page.getHeight() - start.y },
            end: { x: end.x, y: page.getHeight() - end.y },
            thickness: path.width,
            color: rgb(color.r, color.g, color.b),
          })
        }
      })

      // Refresh the PDF viewer
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      // Update the PDF viewer
      const pdfjs = await import("pdfjs-dist")
      const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry")
      pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

      const loadingTask = pdfjs.getDocument(url)
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

      // Clear the drawing canvas
      clearDrawing()

      toast({
        title: "Drawing saved",
        description: "Your drawing has been added to the PDF.",
      })
    } catch (error) {
      console.error("Error saving drawing:", error)
      toast({
        title: "Error saving drawing",
        description: "Failed to add drawing to the PDF.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!pdfDoc) {
    return <div className="text-center text-gray-500">Load a PDF to add drawings</div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stroke-color">Stroke Color</Label>
        <div className="flex gap-2">
          <div className="w-10 h-10 border rounded" style={{ backgroundColor: strokeColor }} />
          <Input
            id="stroke-color"
            type="color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <Label htmlFor="stroke-width">Stroke Width</Label>
          <span>{strokeWidth}px</span>
        </div>
        <Slider
          id="stroke-width"
          min={1}
          max={20}
          step={1}
          value={[strokeWidth]}
          onValueChange={(value) => setStrokeWidth(value[0])}
        />
      </div>

      <div className="space-y-2">
        <Label>Drawing Canvas</Label>
        <div
          ref={containerRef}
          className="relative border rounded-lg overflow-hidden bg-transparent"
          style={{
            width: canvasRef.current?.width || "100%",
            height: "200px",
            maxHeight: "200px",
          }}
        >
          <canvas
            ref={drawingCanvasRef}
            className="cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />
        </div>
        <p className="text-xs text-gray-500">
          This is a preview canvas. Draw here, then click "Save to PDF" to add your drawing.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={clearDrawing} disabled={paths.length === 0} className="flex-1">
          Clear Drawing
        </Button>
        <Button onClick={saveDrawingToPdf} disabled={paths.length === 0 || isSaving} className="flex-1">
          {isSaving ? "Saving..." : "Save to PDF"}
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        Draw on the canvas above, then click "Save to PDF" to add your drawing to the document
      </p>
    </div>
  )
}
