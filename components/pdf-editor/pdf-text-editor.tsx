"use client"

import type React from "react"

import { useState, type RefObject, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { type PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { useToast } from "@/hooks/use-toast"

interface PdfTextEditorProps {
  pdfDoc: PDFDocument | null
  currentPage: number
  canvasRef: RefObject<HTMLCanvasElement>
}

export function PdfTextEditor({ pdfDoc, currentPage, canvasRef }: PdfTextEditorProps) {
  const { toast } = useToast()
  const [text, setText] = useState("")
  const [fontSize, setFontSize] = useState("12")
  const [fontFamily, setFontFamily] = useState(StandardFonts.Helvetica)
  const [textColor, setTextColor] = useState("#000000")
  const [position, setPosition] = useState({ x: 50, y: 50 })
  const [isAdding, setIsAdding] = useState(false)

  // Reset position when page changes
  useEffect(() => {
    if (canvasRef.current) {
      setPosition({
        x: Math.round(canvasRef.current.width / 4),
        y: Math.round(canvasRef.current.height / 4),
      })
    }
  }, [currentPage, canvasRef])

  const handleAddText = async () => {
    if (!pdfDoc || !text.trim()) return

    try {
      setIsAdding(true)

      // Get the page
      const pages = pdfDoc.getPages()
      const page = pages[currentPage - 1]

      // Embed the font
      const font = await pdfDoc.embedFont(fontFamily)

      // Convert hex color to rgb
      const hexToRgb = (hex: string) => {
        const r = Number.parseInt(hex.slice(1, 3), 16) / 255
        const g = Number.parseInt(hex.slice(3, 5), 16) / 255
        const b = Number.parseInt(hex.slice(5, 7), 16) / 255
        return { r, g, b }
      }
      const color = hexToRgb(textColor)

      // Add text to the page
      page.drawText(text, {
        x: position.x,
        y: page.getHeight() - position.y, // PDF coordinates start from bottom-left
        size: Number.parseInt(fontSize),
        font,
        color: rgb(color.r, color.g, color.b),
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

      toast({
        title: "Text added",
        description: "Text has been added to the PDF.",
      })

      // Reset the text input
      setText("")
    } catch (error) {
      console.error("Error adding text:", error)
      toast({
        title: "Error adding text",
        description: "Failed to add text to the PDF.",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setPosition({ x, y })
  }

  if (!pdfDoc) {
    return <div className="text-center text-gray-500">Load a PDF to edit text</div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text">Text Content</Label>
        <Textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to add to the PDF"
          className="min-h-[100px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="font-size">Font Size</Label>
          <Select value={fontSize} onValueChange={setFontSize}>
            <SelectTrigger>
              <SelectValue placeholder="Font Size" />
            </SelectTrigger>
            <SelectContent>
              {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64].map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}pt
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-family">Font Family</Label>
          <Select value={fontFamily} onValueChange={setFontFamily}>
            <SelectTrigger>
              <SelectValue placeholder="Font Family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={StandardFonts.Helvetica}>Helvetica</SelectItem>
              <SelectItem value={StandardFonts.TimesRoman}>Times Roman</SelectItem>
              <SelectItem value={StandardFonts.Courier}>Courier</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="text-color">Text Color</Label>
        <div className="flex gap-2">
          <div className="w-10 h-10 border rounded" style={{ backgroundColor: textColor }} />
          <Input
            id="text-color"
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            className="w-full"
          />
        </div>
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

      <Button onClick={handleAddText} disabled={!text.trim() || isAdding} className="w-full">
        {isAdding ? "Adding Text..." : "Add Text to PDF"}
      </Button>

      <p className="text-xs text-gray-500 text-center">Click on the PDF to set the position where text will be added</p>
    </div>
  )
}
