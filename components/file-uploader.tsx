"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void
  acceptedTypes?: Record<string, string[]>
  maxSize?: number
  maxFiles?: number
}

export function FileUploader({
  onFilesAdded,
  acceptedTypes = {
    "image/heic": [".heic", ".HEIC"],
    "image/jpeg": [".jpg", ".jpeg", ".JPG", ".JPEG"],
    "image/png": [".png", ".PNG"],
    "image/gif": [".gif", ".GIF"],
    "image/webp": [".webp", ".WEBP"],
    "image/bmp": [".bmp", ".BMP"],
    "image/tiff": [".tiff", ".tif", ".TIFF", ".TIF"],
  },
  maxSize = 25 * 1024 * 1024, // 25MB default
  maxFiles = 50, // Maximum 50 files at once
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [rejectionReasons, setRejectionReasons] = useState<string[]>([])

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      const reasons: string[] = []

      // Check for file rejections
      fileRejections.forEach((rejection) => {
        rejection.errors.forEach((error: any) => {
          switch (error.code) {
            case "file-too-large":
              reasons.push(`${rejection.file.name}: File too large (max ${Math.round(maxSize / 1024 / 1024)}MB)`)
              break
            case "file-invalid-type":
              reasons.push(`${rejection.file.name}: Invalid file type`)
              break
            case "too-many-files":
              reasons.push(`Too many files selected (max ${maxFiles} files)`)
              break
            default:
              reasons.push(`${rejection.file.name}: ${error.message}`)
          }
        })
      })

      // Check total file count
      if (acceptedFiles.length > maxFiles) {
        reasons.push(`Maximum ${maxFiles} files allowed at once`)
        acceptedFiles = acceptedFiles.slice(0, maxFiles)
      }

      setRejectionReasons(reasons)

      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles)
      }

      // Clear rejection reasons after 5 seconds
      if (reasons.length > 0) {
        setTimeout(() => setRejectionReasons([]), 5000)
      }
    },
    [onFilesAdded, maxSize, maxFiles],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxSize,
    maxFiles: maxFiles,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  })

  // Get file type descriptions for the message
  const fileTypeDescriptions = Object.entries(acceptedTypes)
    .map(([mimeType, extensions]) => {
      const type = mimeType.split("/")[1]?.toUpperCase() || mimeType
      return `${type} (${extensions.join(", ")})`
    })
    .join(", ")

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`group border rounded-xl px-8 py-16 text-center cursor-pointer transition-all bg-white dark:bg-gray-900 shadow-sm ${
          isDragging || isDragActive
            ? "border-gray-900 dark:border-white ring-2 ring-gray-900/10 dark:ring-white/10"
            : "border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center transition-transform group-hover:-translate-y-0.5">
            <Upload className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Drop images here, or <span className="underline underline-offset-4 decoration-gray-300 dark:decoration-gray-600">browse</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              HEIC, JPG, PNG, GIF, WebP, BMP, and TIFF
            </p>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Up to {Math.round(maxSize / 1024 / 1024)} MB per file · {maxFiles} files at a time
          </p>
        </div>
      </div>

      {rejectionReasons.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {rejectionReasons.map((reason, index) => (
                <div key={index} className="text-sm">
                  {reason}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
