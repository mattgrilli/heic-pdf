"use client"

import { useState, useCallback, useEffect } from "react"
import { FileUploader } from "@/components/file-uploader"
import { ImagePreview } from "@/components/image-preview"
import { ConversionOptions, type OutputFormat } from "@/components/conversion-options"
import { BatchProgress } from "@/components/batch-progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { AdPlaceholder } from "@/components/ad-placeholder"
import { DonationButton } from "@/components/donation-button"
import { FeedbackForm } from "@/components/feedback-form"
import { Download, MessageSquare, BarChart, Shield, Camera, Edit, Wand, Pencil, CheckCircle, Image as ImageIcon } from "lucide-react"
import JSZip from "jszip"
import { UsageStats } from "@/components/usage-stats"
import { ThemeToggle } from "@/components/theme-toggle"
import { SocialShare } from "@/components/social-share"
import { PrivacyInfo } from "@/components/privacy-info"
import { BatchRenameDialog } from "@/components/batch-rename-dialog"
import { ImageEditor, type ImageEditSettings } from "@/components/image-editor"
import { CameraCapture } from "@/components/camera-capture"
import { useMediaQuery } from "@/hooks/use-media-query"

interface ConversionProgress {
  totalFiles: number
  completedFiles: number
  currentFile: string
  errors: string[]
}

export default function ImageConverter() {
  const { toast } = useToast()
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [files, setFiles] = useState<File[]>([])
  const [convertedImages, setConvertedImages] = useState<
    { file: File; url: string; format: string; originalSize: number }[]
  >([])
  const [isConverting, setIsConverting] = useState(false)
  const [formats, setFormats] = useState<OutputFormat[]>(["jpeg"])
  const [quality, setQuality] = useState(0.8)
  const [maxDimension, setMaxDimension] = useState<number | null>(null)
  const [targetSizeKB, setTargetSizeKB] = useState<number | null>(null)
  const [autoDownload, setAutoDownload] = useState(false)
  const [preserveExif, setPreserveExif] = useState(true)
  const [isZipping, setIsZipping] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showBatchRename, setShowBatchRename] = useState(false)
  const [showCameraCapture, setShowCameraCapture] = useState(false)
  const [editingFile, setEditingFile] = useState<{ file: File; previewUrl: string } | null>(null)
  const [fileEdits, setFileEdits] = useState<Record<string, { blob: Blob; settings: ImageEditSettings }>>({})
  const [conversionProgress, setConversionProgress] = useState<ConversionProgress>({
    totalFiles: 0,
    completedFiles: 0,
    currentFile: "",
    errors: [],
  })
  const [usageStats, setUsageStats] = useState({
    totalConversions: 0,
    sessionsStarted: 0,
    lastUsed: "",
    totalBytesSaved: 0,
  })
  const [activeTab, setActiveTab] = useState("upload")
  const [conversionComplete, setConversionComplete] = useState(false)
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("imageConverterSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setFormats(settings.formats || ["jpeg"])
      setQuality(settings.quality || 0.8)
      setAutoDownload(settings.autoDownload || false)
      setPreserveExif(settings.preserveExif !== undefined ? settings.preserveExif : true)
      setMaxDimension(settings.maxDimension || null)
      setTargetSizeKB(settings.targetSizeKB || null)
    }

    const stats = localStorage.getItem("imageConverterStats")
    if (stats) {
      setUsageStats((prev) => ({ ...prev, ...JSON.parse(stats) }))
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    const settings = { formats, quality, autoDownload, preserveExif, maxDimension, targetSizeKB }
    localStorage.setItem("imageConverterSettings", JSON.stringify(settings))
  }, [formats, quality, autoDownload, preserveExif, maxDimension, targetSizeKB])

  // Track visits
  useEffect(() => {
    const stats = JSON.parse(localStorage.getItem("imageConverterStats") || "{}")
    const updatedStats = {
      ...stats,
      sessionsStarted: (stats.sessionsStarted || 0) + 1,
      lastUsed: new Date().toISOString(),
    }
    localStorage.setItem("imageConverterStats", JSON.stringify(updatedStats))
    setUsageStats(updatedStats)
  }, [])

  const handleClearAll = useCallback(() => {
    convertedImages.forEach(({ url }) => {
      URL.revokeObjectURL(url)
    })

    // Also revoke any edited image blobs
    Object.values(fileEdits).forEach(({ blob }) => {
      URL.revokeObjectURL(URL.createObjectURL(blob))
    })

    setFiles([])
    setConvertedImages([])
    setConversionProgress({
      totalFiles: 0,
      completedFiles: 0,
      currentFile: "",
      errors: [],
    })
    setFileEdits({})
    setConversionComplete(false)
    setActiveTab("upload")
  }, [convertedImages, fileEdits])

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    // Accept all image files
    setFiles((prev) => [...prev, ...newFiles])
    setConversionComplete(false)
  }, [])

  const handleRemoveFile = useCallback(
    (indexToRemove: number) => {
      setFiles((prevFiles) => {
        const fileToRemove = prevFiles[indexToRemove]

        // Remove any edits for this file
        if (fileToRemove && fileEdits[fileToRemove.name]) {
          setFileEdits((prev) => {
            const newEdits = { ...prev }
            delete newEdits[fileToRemove.name]
            return newEdits
          })
        }

        return prevFiles.filter((_, index) => index !== indexToRemove)
      })
    },
    [fileEdits],
  )

  const handleRenameFile = useCallback(
    (index: number, newName: string) => {
      setFiles((prevFiles) => {
        const updatedFiles = [...prevFiles]
        const file = updatedFiles[index]
        const extension = file.name.split(".").pop() || ""

        // Check if this file has edits
        const hasEdits = fileEdits[file.name]

        // Create renamed file
        const renamedFile = new File([file], `${newName}.${extension}`, { type: file.type })
        updatedFiles[index] = renamedFile

        // Update edits if needed
        if (hasEdits) {
          setFileEdits((prev) => {
            const newEdits = { ...prev }
            newEdits[renamedFile.name] = newEdits[file.name]
            delete newEdits[file.name]
            return newEdits
          })
        }

        return updatedFiles
      })
    },
    [fileEdits],
  )

  const handleBatchRename = useCallback(
    (renamedFiles: { originalFile: File; newName: string }[]) => {
      setFiles((prevFiles) => {
        // Create a map of old file names to new file names
        const renameMap: Record<string, string> = {}

        const updatedFiles = prevFiles.map((file) => {
          const renamed = renamedFiles.find((rf) => rf.originalFile === file)
          if (renamed) {
            const extension = file.name.split(".").pop() || ""
            const newFileName = `${renamed.newName}.${extension}`
            renameMap[file.name] = newFileName
            return new File([file], newFileName, { type: file.type })
          }
          return file
        })

        // Update edits if needed
        if (Object.keys(fileEdits).length > 0) {
          setFileEdits((prev) => {
            const newEdits: Record<string, { blob: Blob; settings: ImageEditSettings }> = {}

            Object.entries(prev).forEach(([oldFileName, editData]) => {
              const newFileName = renameMap[oldFileName]
              if (newFileName) {
                newEdits[newFileName] = editData
              } else {
                newEdits[oldFileName] = editData
              }
            })

            return newEdits
          })
        }

        return updatedFiles
      })
    },
    [fileEdits],
  )

  const handleEditImage = useCallback(
    (file: File) => {
      // Create preview URL for the editor
      const createPreview = async () => {
        try {
          // Check if we already have an edited version
          if (fileEdits[file.name]?.blob) {
            const url = URL.createObjectURL(fileEdits[file.name].blob)
            setEditingFile({ file, previewUrl: url })
            return
          }

          // For HEIC files, we need to convert first
          if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
            const heic2any = (await import("heic2any")).default
            const blob = (await heic2any({
              blob: file,
              toType: "image/jpeg",
              quality: 0.8,
            })) as Blob

            const url = URL.createObjectURL(blob)
            setEditingFile({ file, previewUrl: url })
          } else {
            // For other image types, we can use directly
            const url = URL.createObjectURL(file)
            setEditingFile({ file, previewUrl: url })
          }
        } catch (error) {
          console.error("Error creating preview for editor:", error)
          toast({
            title: "Preview error",
            description: "Could not create preview for editing.",
            variant: "destructive",
          })
        }
      }

      createPreview()
    },
    [toast, fileEdits],
  )

  const handleSaveEdit = useCallback(
    (editedBlob: Blob, settings: ImageEditSettings) => {
      if (!editingFile) return

      // Store edited blob and settings
      setFileEdits((prev) => ({
        ...prev,
        [editingFile.file.name]: { blob: editedBlob, settings },
      }))

      // Show success message
      toast({
        title: "Changes saved",
        description: "Your edits have been saved and will be applied during conversion.",
      })

      // Close editor
      setEditingFile(null)
    },
    [editingFile, toast],
  )

  const handleCameraCapture = useCallback(
    (file: File) => {
      // Add the captured image to files
      setFiles((prev) => [...prev, file])

      toast({
        title: "Image captured",
        description: "The captured image has been added to your files.",
      })
    },
    [toast],
  )

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return

    setIsConverting(true)
    setConvertedImages([])
    setConversionComplete(false)
    const errors: string[] = []
    const converted: { file: File; url: string; format: string; originalSize: number }[] = []

    // Initialize progress
    setConversionProgress({
      totalFiles: files.length * formats.length,
      completedFiles: 0,
      currentFile: "",
      errors: [],
    })

    try {
      // Process files in batches to prevent memory issues
      const batchSize = 3
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        for (const file of batch) {
          for (const format of formats) {
            try {
              // Update current file
              setConversionProgress((prev) => ({
                ...prev,
                currentFile: `${file.name} to ${format.toUpperCase()}`,
              }))

              // Check if we have an edited version of this file
              let sourceBlob: Blob
              if (fileEdits[file.name]?.blob) {
                // Use the edited version
                sourceBlob = fileEdits[file.name].blob
              } else {
                // For HEIC files, decode to a lossless intermediate so the
                // lossy compression only happens once, in the final encode
                if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
                  const heic2any = (await import("heic2any")).default
                  sourceBlob = (await heic2any({
                    blob: file,
                    toType: "image/png",
                  })) as Blob
                } else {
                  // For other image types, we can use directly
                  sourceBlob = file
                }
              }

              // Re-encode through canvas so quality, resize, and target size
              // actually apply. Only pass through untouched for PNG -> PNG
              // with no resize (canvas re-encoding PNG often inflates it).
              let finalBlob: Blob
              if (
                format === "png" &&
                sourceBlob.type === "image/png" &&
                !maxDimension &&
                !(file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic")
              ) {
                finalBlob = sourceBlob
              } else {
                finalBlob = await convertImageFormat(
                  sourceBlob,
                  format,
                  quality,
                  maxDimension,
                  targetSizeKB ? targetSizeKB * 1024 : null,
                )
              }

              // If re-encoding an already-correct-format file made it bigger
              // (and we weren't asked to edit or resize it), keep the original
              const targetMime = format === "jpeg" ? "image/jpeg" : `image/${format}`
              if (
                !fileEdits[file.name] &&
                !maxDimension &&
                file.type === targetMime &&
                finalBlob.size > file.size
              ) {
                finalBlob = file
              }

              // Get file extension
              const originalExt = file.name.split(".").pop() || ""
              const baseName = file.name.substring(0, file.name.length - originalExt.length - 1)
              const newFileName = `${baseName}.${format}`

              const convertedFile = new File([finalBlob], newFileName, { type: targetMime })

              const url = URL.createObjectURL(convertedFile)

              // Auto-download if enabled
              if (autoDownload) {
                const a = document.createElement("a")
                a.href = url
                a.download = convertedFile.name
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
              }

              converted.push({ file: convertedFile, url, format, originalSize: file.size })
            } catch (error) {
              const errorMsg = `${file.name} to ${format}: ${error instanceof Error ? error.message : "Conversion failed"}`
              errors.push(errorMsg)
              console.error(`Error converting ${file.name}:`, error)
            } finally {
              // Update progress
              setConversionProgress((prev) => ({
                ...prev,
                completedFiles: prev.completedFiles + 1,
                errors: [...prev.errors, ...errors.slice(prev.errors.length)],
              }))
            }
          }
        }
      }

      setConvertedImages(converted)
      setConversionComplete(true)

      // Update conversion stats, including how much space this batch saved
      const batchBytesSaved = converted.reduce(
        (sum, item) => sum + Math.max(0, item.originalSize - item.file.size),
        0,
      )
      const stats = JSON.parse(localStorage.getItem("imageConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        totalConversions: (stats.totalConversions || 0) + converted.length,
        totalBytesSaved: (stats.totalBytesSaved || 0) + batchBytesSaved,
        lastUsed: new Date().toISOString(),
      }
      localStorage.setItem("imageConverterStats", JSON.stringify(updatedStats))
      setUsageStats(updatedStats)

      const successCount = converted.length
      const errorCount = errors.length

      if (successCount > 0) {
        // Show success animation
        setShowSuccessAnimation(true)
        setTimeout(() => setShowSuccessAnimation(false), 3000)

        // Auto-switch to converted tab after a brief delay
        setTimeout(() => {
          setActiveTab("converted")
        }, 1500)

        toast({
          title: "Conversion complete!",
          description: `Successfully converted ${successCount} file${successCount > 1 ? "s" : ""}${errorCount > 0 ? `. ${errorCount} failed.` : "."}`,
        })
      } else {
        toast({
          title: "Conversion failed",
          description: "No files were converted successfully.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Conversion error:", error)
      toast({
        title: "Conversion failed",
        description: "There was an error during conversion.",
        variant: "destructive",
      })
    } finally {
      setIsConverting(false)
      setConversionProgress((prev) => ({
        ...prev,
        currentFile: "",
      }))
    }
  }, [files, formats, quality, autoDownload, toast, fileEdits, maxDimension, targetSizeKB])

  // Load a blob into an Image element
  const loadImage = (blob: Blob): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const objectUrl = URL.createObjectURL(blob)
      img.onload = () => resolve(img)
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl)
        reject(new Error("Failed to load image"))
      }
      img.src = objectUrl
    })
  }

  // Encode a canvas to a blob
  const encodeCanvas = (canvas: HTMLCanvasElement, mimeType: string, q?: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error(`Failed to encode ${mimeType}`))
        },
        mimeType,
        q,
      )
    })
  }

  // Convert an image blob to the target format, optionally resizing and
  // compressing until it fits under a target byte size
  const convertImageFormat = async (
    blob: Blob,
    format: string,
    quality: number,
    maxDim: number | null = null,
    targetBytes: number | null = null,
  ): Promise<Blob> => {
    const img = await loadImage(blob)

    try {
      const mimeType = format === "jpg" || format === "jpeg" ? "image/jpeg" : `image/${format}`
      const isLossy = mimeType === "image/jpeg" || mimeType === "image/webp"

      // Compute output dimensions, capped at maxDim on the longest side
      let width = img.width
      let height = img.height
      if (maxDim && Math.max(width, height) > maxDim) {
        const scale = maxDim / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      const drawToCanvas = (w: number, h: number): HTMLCanvasElement => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not get canvas context")
        canvas.width = w
        canvas.height = h
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(img, 0, 0, w, h)
        return canvas
      }

      let canvas = drawToCanvas(width, height)
      let result = await encodeCanvas(canvas, mimeType, isLossy ? quality : undefined)

      // If a target size is set and we're over it, binary-search quality down
      if (targetBytes && isLossy && result.size > targetBytes) {
        let lo = 0.05
        let hi = quality
        let best: Blob | null = null
        for (let i = 0; i < 7; i++) {
          const mid = (lo + hi) / 2
          const attempt = await encodeCanvas(canvas, mimeType, mid)
          if (attempt.size <= targetBytes) {
            best = attempt
            lo = mid
          } else {
            hi = mid
          }
        }

        if (best) {
          result = best
        } else {
          // Even minimum quality is too big — progressively downscale
          let w = width
          let h = height
          let attempt = await encodeCanvas(canvas, mimeType, 0.5)
          while (attempt.size > targetBytes && Math.max(w, h) > 300) {
            w = Math.round(w * 0.75)
            h = Math.round(h * 0.75)
            canvas = drawToCanvas(w, h)
            attempt = await encodeCanvas(canvas, mimeType, 0.5)
          }
          result = attempt
        }
      }

      return result
    } finally {
      URL.revokeObjectURL(img.src)
    }
  }

  const formatBytes = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

  const handleDownload = useCallback((url: string, fileName: string) => {
    const a = document.createElement("a")
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }, [])

  const handleDownloadAll = useCallback(() => {
    convertedImages.forEach(({ url, file }) => {
      handleDownload(url, file.name)
    })
  }, [convertedImages, handleDownload])

  const handleDownloadZip = useCallback(async () => {
    if (convertedImages.length === 0) return

    setIsZipping(true)
    try {
      const zip = new JSZip()

      // Group files by format
      const formatGroups: Record<string, { file: File; url: string }[]> = {}

      convertedImages.forEach((item) => {
        if (!formatGroups[item.format]) {
          formatGroups[item.format] = []
        }
        formatGroups[item.format].push(item)
      })

      // Create folders for each format if multiple formats exist
      const useFormatFolders = Object.keys(formatGroups).length > 1

      for (const [format, items] of Object.entries(formatGroups)) {
        const folder = useFormatFolders ? zip.folder(format.toUpperCase()) : zip

        if (!folder) continue

        for (const { file, url } of items) {
          const response = await fetch(url)
          const blob = await response.blob()
          folder.file(file.name, blob)
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const zipUrl = URL.createObjectURL(zipBlob)

      const a = document.createElement("a")
      a.href = zipUrl
      a.download = `converted_images_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(zipUrl)

      toast({
        title: "ZIP file created",
        description: "All converted images have been packaged into a ZIP file.",
      })
    } catch (error) {
      console.error("Error creating ZIP:", error)
      toast({
        title: "Error creating ZIP",
        description: "There was an error creating the ZIP file.",
        variant: "destructive",
      })
    } finally {
      setIsZipping(false)
    }
  }, [convertedImages, toast])

  // Check if camera is available
  const [cameraAvailable, setCameraAvailable] = useState(false)

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const hasCamera = devices.some((device) => device.kind === "videoinput")
        setCameraAvailable(hasCamera)
      } catch (error) {
        console.error("Error checking camera:", error)
        setCameraAvailable(false)
      }
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      checkCamera()
    }
  }, [])

  return (
    <>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* App header */}
        <header className="sticky top-0 z-40 border-b border-gray-200/70 dark:border-gray-800/70 bg-white/80 dark:bg-gray-950/80 backdrop-blur-md">
          <div className="container mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center">
                <ImageIcon className="h-4 w-4 text-white dark:text-gray-900" />
              </div>
              <span className="font-semibold tracking-tight text-gray-900 dark:text-white">Image Converter</span>
            </div>
            <div className="flex items-center gap-0.5 text-gray-500 dark:text-gray-400">
              <PrivacyInfo />
              <SocialShare />
              <Button variant="ghost" size="icon" onClick={() => setShowStats(!showStats)} title="Usage stats">
                <BarChart className="h-4 w-4" />
                <span className="sr-only">Stats</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowFeedback(true)} title="Send feedback">
                <MessageSquare className="h-4 w-4" />
                <span className="sr-only">Feedback</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 max-w-6xl pb-16">
          {/* Hero */}
          <div className="text-center pt-14 pb-10">
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-gray-900 dark:text-white text-balance">
              Convert &amp; compress images
            </h1>
            <p className="text-lg text-gray-500 dark:text-gray-400 mt-3">
              HEIC, JPEG, PNG, and WebP — fast, free, and entirely in your browser.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
              <Shield className="h-3.5 w-3.5" />
              <span>Your files never leave your device</span>
            </div>
          </div>

          {/* Success Animation Overlay */}
          {showSuccessAnimation && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 flex flex-col items-center space-y-4 shadow-xl animate-in zoom-in-95 duration-300">
                <CheckCircle className="h-12 w-12 text-emerald-500" />
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Conversion Complete</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Taking you to your converted images…
                  </p>
                </div>
              </div>
            </div>
          )}

          {showStats && <UsageStats stats={usageStats} onClose={() => setShowStats(false)} />}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Enhanced Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {convertedImages.length > 0 && (
                  <TabsList className="grid w-full grid-cols-2 mb-8">
                    <TabsTrigger value="upload">
                      Upload Images
                    </TabsTrigger>
                    <TabsTrigger value="converted">
                      <div className="flex items-center space-x-2">
                        <span>Converted</span>
                        <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs px-2 py-0.5 rounded-full font-medium">
                          {convertedImages.length}
                        </span>
                      </div>
                    </TabsTrigger>
                  </TabsList>
                )}

                <TabsContent value="upload" className="space-y-6">
                  {/* Upload Section */}
                  <div className="space-y-3 mb-6">
                    <FileUploader
                      onFilesAdded={handleFilesAdded}
                      maxSize={25 * 1024 * 1024} // 25MB
                      maxFiles={50}
                    />

                    {cameraAvailable && (
                      <div className="flex justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 dark:text-gray-400"
                          onClick={() => setShowCameraCapture(true)}
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Or use your camera
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Enhanced Conversion Progress */}
                  {isConverting && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-800">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Converting Images</h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {conversionProgress.completedFiles} of {conversionProgress.totalFiles}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gray-900 dark:bg-white rounded-full transition-all duration-300 ease-out"
                            style={{ 
                              width: `${(conversionProgress.completedFiles / conversionProgress.totalFiles) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      {conversionProgress.currentFile && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse"></div>
                          <span>Processing: {conversionProgress.currentFile}</span>
                        </div>
                      )}
                      <BatchProgress
                        totalFiles={conversionProgress.totalFiles}
                        completedFiles={conversionProgress.completedFiles}
                        currentFile={conversionProgress.currentFile}
                        errors={conversionProgress.errors}
                      />
                    </div>
                  )}

                  {files.length > 0 && (
                    <>
                      {/* Enhanced File List Header */}
                      <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                            Your Images
                          </h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {files.length} file{files.length > 1 ? "s" : ""} ready for conversion
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {files.length > 1 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowBatchRename(true)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Batch Rename
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAll}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            Clear All
                          </Button>
                        </div>
                      </div>

                      {/* Enhanced Image Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {files.map((file, index) => (
                          <div 
                            key={`${file.name}-${index}`} 
                            className="relative group bg-white dark:bg-gray-900 rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-800 overflow-hidden"
                          >
                            <ImagePreview
                              file={file}
                              onRemove={() => handleRemoveFile(index)}
                              onRename={(newName) => handleRenameFile(index, newName)}
                            />
                            <Button
                              variant="secondary"
                              size="sm"
                              className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm"
                              onClick={() => handleEditImage(file)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {fileEdits[file.name] && (
                              <div className="absolute top-3 right-14 bg-emerald-600 text-white text-xs px-2.5 py-1 rounded-md font-medium">
                                Edited
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Conversion Options */}
                      <ConversionOptions
                          formats={formats}
                          setFormats={setFormats}
                          quality={quality}
                          setQuality={setQuality}
                          autoDownload={autoDownload}
                          setAutoDownload={setAutoDownload}
                          preserveExif={preserveExif}
                          setPreserveExif={setPreserveExif}
                          maxDimension={maxDimension}
                          setMaxDimension={setMaxDimension}
                          targetSizeKB={targetSizeKB}
                          setTargetSizeKB={setTargetSizeKB}
                        />

                      {/* Convert Button */}
                      <div className="flex justify-center">
                        <Button
                          size="lg"
                          onClick={handleConvert}
                          disabled={isConverting || files.length === 0}
                          className="w-full md:w-auto px-10"
                        >
                          {isConverting ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                              <span>Converting...</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <Wand className="h-5 w-5" />
                              <span>Convert to {formats.map((f) => f.toUpperCase()).join(", ")}</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="converted" className="space-y-6">
                  {convertedImages.length > 0 && (
                    <>
                      {/* Results Header */}
                      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-full">
                              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                                Conversion Complete
                              </h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {convertedImages.length} image{convertedImages.length > 1 ? "s" : ""} successfully converted
                                {(() => {
                                  const saved = convertedImages.reduce(
                                    (sum, item) => sum + Math.max(0, item.originalSize - item.file.size),
                                    0,
                                  )
                                  return saved > 0 ? (
                                    <>
                                      {" · "}
                                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        {formatBytes(saved)} saved
                                      </span>
                                    </>
                                  ) : null
                                })()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button onClick={handleDownloadZip} disabled={isZipping}>
                              <Download className="h-4 w-4 mr-2" />
                              {isZipping ? "Creating ZIP..." : "Download ZIP"}
                            </Button>
                            <Button variant="outline" onClick={handleDownloadAll}>
                              Download All
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Results Grid */}
                      {formats.length > 1 ? (
                        <Tabs defaultValue={formats[0]} className="w-full">
                          <TabsList className="mb-6">
                            {formats.map((format) => (
                              <TabsTrigger key={format} value={format}>
                                {format.toUpperCase()}
                              </TabsTrigger>
                            ))}
                            <TabsTrigger value="all">
                              All Formats
                            </TabsTrigger>
                          </TabsList>

                          {formats.map((format) => (
                            <TabsContent key={format} value={format} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {convertedImages
                                  .filter((img) => img.format === format)
                                  .map(({ url, file, originalSize }, index) => (
                                    <div
                                      key={`${file.name}-${index}`}
                                      className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                    >
                                      <div className="relative">
                                        <img
                                          src={url || "/placeholder.svg"}
                                          alt={file.name}
                                          className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-950"
                                        />
                                        <div className="absolute top-3 right-3 bg-gray-900/70 text-white px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                                          {format.toUpperCase()}
                                        </div>
                                      </div>
                                      <div className="p-4 space-y-3">
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {formatBytes(originalSize)} → {formatBytes(file.size)}{file.size < originalSize && <span className="text-green-600 dark:text-green-400 font-medium"> (−{Math.round((1 - file.size / originalSize) * 100)}%)</span>}{file.size > originalSize && <span className="text-amber-600 dark:text-amber-400 font-medium"> (+{Math.round((file.size / originalSize - 1) * 100)}%)</span>}
                                          </p>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          onClick={() => handleDownload(url, file.name)}
                                          className="w-full"
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Download
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </TabsContent>
                          ))}

                          <TabsContent value="all" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {convertedImages.map(({ url, file, format, originalSize }, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="relative">
                                    <img
                                      src={url || "/placeholder.svg"}
                                      alt={file.name}
                                      className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-950"
                                    />
                                    <div className="absolute top-3 right-3 bg-gray-900/70 text-white px-2.5 py-1 rounded-md text-xs font-medium backdrop-blur-sm">
                                      {format.toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    <div>
                                      <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatBytes(originalSize)} → {formatBytes(file.size)}{file.size < originalSize && <span className="text-green-600 dark:text-green-400 font-medium"> (−{Math.round((1 - file.size / originalSize) * 100)}%)</span>}{file.size > originalSize && <span className="text-amber-600 dark:text-amber-400 font-medium"> (+{Math.round((file.size / originalSize - 1) * 100)}%)</span>}
                                      </p>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleDownload(url, file.name)}
                                      className="w-full"
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TabsContent>
                        </Tabs>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {convertedImages.map(({ url, file, originalSize }, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                              <img
                                src={url || "/placeholder.svg"}
                                alt={file.name}
                                className="w-full h-48 object-contain bg-gray-50 dark:bg-gray-950"
                              />
                              <div className="p-4 space-y-3">
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {formatBytes(originalSize)} → {formatBytes(file.size)}{file.size < originalSize && <span className="text-green-600 dark:text-green-400 font-medium"> (−{Math.round((1 - file.size / originalSize) * 100)}%)</span>}{file.size > originalSize && <span className="text-amber-600 dark:text-amber-400 font-medium"> (+{Math.round((file.size / originalSize - 1) * 100)}%)</span>}
                                  </p>
                                </div>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDownload(url, file.name)}
                                  className="w-full"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-4 lg:sticky lg:top-20">
                <DonationButton />
                <AdPlaceholder />
              </div>
            </div>
          </div>

          {/* Modals and dialogs */}
          {showFeedback && <FeedbackForm onClose={() => setShowFeedback(false)} />}
          {showBatchRename && (
            <BatchRenameDialog
              files={files}
              isOpen={showBatchRename}
              onClose={() => setShowBatchRename(false)}
              onRename={handleBatchRename}
            />
          )}
          {editingFile && (
            <ImageEditor
              file={editingFile.file}
              previewUrl={editingFile.previewUrl}
              isOpen={!!editingFile}
              onClose={() => {
                URL.revokeObjectURL(editingFile.previewUrl)
                setEditingFile(null)
              }}
              onSave={handleSaveEdit}
            />
          )}
          {showCameraCapture && (
            <CameraCapture
              isOpen={showCameraCapture}
              onClose={() => setShowCameraCapture(false)}
              onCapture={handleCameraCapture}
            />
          )}

          <Toaster />
        </div>
      </div>
    </>
  )
}
