"use client"

import { Type, PenTool, ImageIcon } from "lucide-react"

interface PdfToolbarProps {
  activeTab: "text" | "draw" | "image"
  setActiveTab: (tab: "text" | "draw" | "image") => void
}

export function PdfToolbar({ activeTab, setActiveTab }: PdfToolbarProps) {
  return (
    <div className="border-b">
      <div className="flex">
        <button
          onClick={() => setActiveTab("text")}
          className={`flex items-center justify-center gap-2 py-2 px-4 flex-1 border-b-2 transition-colors ${
            activeTab === "text" ? "border-primary text-primary" : "border-transparent hover:bg-gray-50"
          }`}
        >
          <Type className="h-4 w-4" />
          <span className="hidden sm:inline">Text</span>
        </button>

        <button
          onClick={() => setActiveTab("draw")}
          className={`flex items-center justify-center gap-2 py-2 px-4 flex-1 border-b-2 transition-colors ${
            activeTab === "draw" ? "border-primary text-primary" : "border-transparent hover:bg-gray-50"
          }`}
        >
          <PenTool className="h-4 w-4" />
          <span className="hidden sm:inline">Draw</span>
        </button>

        <button
          onClick={() => setActiveTab("image")}
          className={`flex items-center justify-center gap-2 py-2 px-4 flex-1 border-b-2 transition-colors ${
            activeTab === "image" ? "border-primary text-primary" : "border-transparent hover:bg-gray-50"
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Image</span>
        </button>
      </div>
    </div>
  )
}
