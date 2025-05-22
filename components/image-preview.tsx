"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { FileRenameDialog } from "./file-rename-dialog"

interface ImagePreviewProps {
  file: File
  onRemove?: () => void
  onRename?: (newName: string) => void
}

export function ImagePreview({ file, onRemove, onRename }: ImagePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  useEffect(() => {
    const loadPreview = async () => {
      try {
        setLoading(true)
        setError(false)

        // Dynamically import heic2any
        const heic2any = (await import("heic2any")).default

        // Convert HEIC to JPEG for preview
        const blob = (await heic2any({
          blob: file,
          toType: "image/jpeg",
          quality: 0.3, // Lower quality for preview
        })) as Blob

        const url = URL.createObjectURL(blob)
        setPreview(url)
      } catch (err) {
        console.error("Error creating preview:", err)
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    loadPreview()

    // Cleanup
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview)
        setPreview(null)
      }
    }
  }, [file])

  const handleRename = (newName: string) => {
    if (onRename) {
      onRename(newName)
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden relative group dark:border-gray-700">
      {loading ? (
        <Skeleton className="w-full h-48" />
      ) : error ? (
        <div className="w-full h-48 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
          <p>Unable to preview</p>
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview || ""}
            alt={file.name}
            className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-800"
          />
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onRename && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full bg-white dark:bg-gray-800"
                onClick={() => setIsRenameDialogOpen(true)}
                aria-label="Rename file"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onRemove && (
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full"
                onClick={onRemove}
                aria-label="Remove image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="p-3 dark:bg-gray-900">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
      </div>

      {onRename && (
        <FileRenameDialog
          file={file}
          isOpen={isRenameDialogOpen}
          onClose={() => setIsRenameDialogOpen(false)}
          onRename={handleRename}
        />
      )}
    </div>
  )
}
