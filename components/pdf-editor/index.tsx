"use client"

import { useState, useCallback, useRef } from "react"
import { FileUploader } from "@/components/file-uploader"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { PdfViewer } from "./pdf-viewer"
import { PdfToolbar } from "./pdf-toolbar"
import { PdfPageControls } from "./pdf-page-controls"
import { PdfTextEditor } from "./pdf-text-editor"
import { PdfDrawingEditor } from "./pdf-drawing-editor"
import { PdfImageEditor } from "./pdf-image-editor"
import { PDFDocument } from "pdf-lib"

export function PdfEditor() {
  const { toast } = useToast()
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfDoc, setPdfDoc] = useState<PDFDocument | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<"text" | "draw" | "image">("text")
  const [scale, setScale] = useState(1)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleFilesAdded = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return

      const file = files[0]
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file.",
          variant: "destructive",
        })
        return
      }

      setIsLoading(true)
      setPdfFile(file)

      try {
        // Create URL for the PDF viewer
        if (pdfUrl) URL.revokeObjectURL(pdfUrl)
        const url = URL.createObjectURL(file)
        setPdfUrl(url)

        // Load the PDF document for editing
        const arrayBuffer = await file.arrayBuffer()
        const pdfDoc = await PDFDocument.load(arrayBuffer)
        setPdfDoc(pdfDoc)
        setTotalPages(pdfDoc.getPageCount())
        setCurrentPage(1)

        toast({
          title: "PDF loaded successfully",
          description: `${file.name} (${pdfDoc.getPageCount()} pages)`,
        })
      } catch (error) {
        console.error("Error loading PDF:", error)
        toast({
          title: "Error loading PDF",
          description: "The PDF file could not be loaded.",
          variant: "destructive",
        })
        setPdfFile(null)
        setPdfUrl(null)
      } finally {
        setIsLoading(false)
      }
    },
    [toast, pdfUrl],
  )

  const handleSavePdf = useCallback(async () => {
    if (!pdfDoc) return

    try {
      setIsLoading(true)
      const pdfBytes = await pdfDoc.save()
      const blob = new Blob([pdfBytes], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)

      const a = document.createElement("a")
      a.href = url
      a.download = pdfFile ? `edited-${pdfFile.name}` : "edited-document.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)

      toast({
        title: "PDF saved successfully",
        description: "Your edited PDF has been downloaded.",
      })
    } catch (error) {
      console.error("Error saving PDF:", error)
      toast({
        title: "Error saving PDF",
        description: "The PDF could not be saved.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [pdfDoc, pdfFile, toast])

  const handleClearPdf = useCallback(() => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    setPdfFile(null)
    setPdfUrl(null)
    setPdfDoc(null)
    setCurrentPage(1)
    setTotalPages(0)
  }, [pdfUrl])

  return (
    <div className="space-y-6">
      {!pdfFile ? (
        <FileUploader
          onFilesAdded={handleFilesAdded}
          acceptedTypes={{ "application/pdf": [".pdf"] }}
          maxSize={20971520} // 20MB
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Editing: {pdfFile.name}</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClearPdf}>
                Clear
              </Button>
              <Button onClick={handleSavePdf} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save PDF"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3 border rounded-lg overflow-hidden bg-gray-50">
              {isLoading ? (
                <div className="flex items-center justify-center h-[600px]">
                  <Skeleton className="w-[400px] h-[500px]" />
                </div>
              ) : (
                <div className="relative h-[600px] overflow-auto">
                  <PdfViewer pdfUrl={pdfUrl} currentPage={currentPage} scale={scale} canvasRef={canvasRef} />
                </div>
              )}

              <PdfPageControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
                scale={scale}
                setScale={setScale}
              />
            </div>

            <div className="lg:col-span-1">
              <div className="border rounded-lg overflow-hidden">
                <PdfToolbar activeTab={activeTab} setActiveTab={setActiveTab} />

                <div className="p-4">
                  {activeTab === "text" && (
                    <PdfTextEditor pdfDoc={pdfDoc} currentPage={currentPage} canvasRef={canvasRef} />
                  )}

                  {activeTab === "draw" && (
                    <PdfDrawingEditor pdfDoc={pdfDoc} currentPage={currentPage} canvasRef={canvasRef} />
                  )}

                  {activeTab === "image" && (
                    <PdfImageEditor pdfDoc={pdfDoc} currentPage={currentPage} canvasRef={canvasRef} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
