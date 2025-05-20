"use client"

import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface ImagePreviewProps {
  file: File
}

export function ImagePreview({ file }: ImagePreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

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

  return (
    <div className="border rounded-lg overflow-hidden">
      {loading ? (
        <Skeleton className="w-full h-48" />
      ) : error ? (
        <div className="w-full h-48 flex items-center justify-center bg-gray-100 text-gray-500">
          <p>Unable to preview</p>
        </div>
      ) : (
        <img src={preview || ""} alt={file.name} className="w-full h-48 object-contain bg-gray-100" />
      )}
      <div className="p-3">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
    </div>
  )
}
