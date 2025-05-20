"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react"

interface PdfPageControlsProps {
  currentPage: number
  totalPages: number
  setCurrentPage: (page: number) => void
  scale: number
  setScale: (scale: number) => void
}

export function PdfPageControls({ currentPage, totalPages, setCurrentPage, scale, setScale }: PdfPageControlsProps) {
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const page = Number.parseInt(e.target.value)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const zoomIn = () => {
    setScale(Math.min(scale + 0.1, 2))
  }

  const zoomOut = () => {
    setScale(Math.max(scale - 0.1, 0.5))
  }

  return (
    <div className="flex items-center justify-between p-2 border-t">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={goToPreviousPage} disabled={currentPage <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex items-center gap-1">
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handlePageInputChange}
            className="w-16 text-center"
          />
          <span className="text-sm text-gray-500">/ {totalPages}</span>
        </div>

        <Button variant="outline" size="icon" onClick={goToNextPage} disabled={currentPage >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="text-sm">{Math.round(scale * 100)}%</span>

        <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 2}>
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
