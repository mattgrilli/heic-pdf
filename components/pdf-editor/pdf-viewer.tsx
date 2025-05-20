"use client"

import { useEffect, useState, type RefObject } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface PdfViewerProps {
  pdfUrl: string | null
  currentPage: number
  scale: number
  canvasRef: RefObject<HTMLCanvasElement>
}

export function PdfViewer({ pdfUrl, currentPage, scale, canvasRef }: PdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!pdfUrl) return

    let isMounted = true
    setIsLoading(true)
    setError(null)

    const loadPdf = async () => {
      try {
        // Dynamically import pdf.js
        const pdfjs = await import("pdfjs-dist")

        // Set the worker source
        const pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.entry")
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

        // Load the PDF document
        const loadingTask = pdfjs.getDocument(pdfUrl)
        const pdf = await loadingTask.promise

        if (!isMounted) return

        // Get the requested page
        const page = await pdf.getPage(currentPage)

        // Set the scale
        const viewport = page.getViewport({ scale })

        // Prepare canvas for rendering
        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext("2d")
        if (!context) return

        canvas.height = viewport.height
        canvas.width = viewport.width

        // Render the PDF page
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        }

        await page.render(renderContext).promise
        if (isMounted) setIsLoading(false)
      } catch (err) {
        console.error("Error rendering PDF:", err)
        if (isMounted) {
          setError(`Failed to load PDF: ${err instanceof Error ? err.message : String(err)}`)
          setIsLoading(false)
        }
      }
    }

    loadPdf()

    return () => {
      isMounted = false
    }
  }, [pdfUrl, currentPage, scale, canvasRef])

  if (!pdfUrl) {
    return <div className="flex items-center justify-center h-full">No PDF loaded</div>
  }

  if (error) {
    return <div className="flex items-center justify-center h-full text-red-500">{error}</div>
  }

  return (
    <div className="flex justify-center p-4">
      {isLoading ? <Skeleton className="w-[400px] h-[500px]" /> : <canvas ref={canvasRef} className="shadow-lg" />}
    </div>
  )
}
