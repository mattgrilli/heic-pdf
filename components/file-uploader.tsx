"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload } from "lucide-react"

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void
  acceptedTypes?: Record<string, string[]>
  maxSize?: number
}

export function FileUploader({
  onFilesAdded,
  acceptedTypes = { "image/heic": [".heic"] },
  maxSize = 10485760, // 10MB default
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesAdded(acceptedFiles)
    },
    [onFilesAdded],
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize: maxSize,
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
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragging || isDragActive
          ? "border-primary bg-primary/5"
          : "border-gray-300 dark:border-gray-700 hover:border-primary/50 hover:bg-gray-50 dark:hover:bg-gray-900"
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="p-3 rounded-full bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-medium">Drag & drop files here</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Or click to browse your files. Accepted formats: {fileTypeDescriptions}
        </p>
        {fileRejections.length > 0 && (
          <p className="text-sm text-red-500 mt-2">Some files were rejected. Please check the file type and size.</p>
        )}
      </div>
    </div>
  )
}
