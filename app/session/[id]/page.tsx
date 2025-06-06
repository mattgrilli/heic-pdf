"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Script from "next/script"
import { FileUploader } from "@/components/file-uploader"
import { ImagePreview } from "@/components/image-preview"
import { ConversionOptions, type OutputFormat } from "@/components/conversion-options"
import { BatchProgress } from "@/components/batch-progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import { AdPlaceholder } from "@/components/ad-placeholder"
import { DonationButton } from "@/components/donation-button"
import { FeedbackForm } from "@/components/feedback-form"
import { Download, MessageSquare, BarChart, Shield, Camera, Edit, Wand, Pencil, CheckCircle, ArrowRight } from "lucide-react"
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
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sessionId = params.id as string
  const isMobile = useMediaQuery("(max-width: 768px)")

  const [files, setFiles] = useState<File[]>([])
  const [convertedImages, setConvertedImages] = useState<{ file: File; url: string; format: string }[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [formats, setFormats] = useState<OutputFormat[]>(["jpeg"])
  const [quality, setQuality] = useState(0.8)
  const [autoDownload, setAutoDownload] = useState(false)
  const [preserveExif, setPreserveExif] = useState(true)
  const [expirationTime, setExpirationTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
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
    }

    const stats = localStorage.getItem("imageConverterStats")
    if (stats) {
      setUsageStats(JSON.parse(stats))
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    const settings = { formats, quality, autoDownload, preserveExif }
    localStorage.setItem("imageConverterSettings", JSON.stringify(settings))
  }, [formats, quality, autoDownload, preserveExif])

  // Verify this is the user's session
  useEffect(() => {
    const storedSessionId = localStorage.getItem("imageConverterSessionId")
    if (storedSessionId !== sessionId) {
      router.push("/")
    } else {
      const stats = JSON.parse(localStorage.getItem("imageConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        sessionsStarted: (stats.sessionsStarted || 0) + 1,
        lastUsed: new Date().toISOString(),
      }
      localStorage.setItem("imageConverterStats", JSON.stringify(updatedStats))
      setUsageStats(updatedStats)
    }
  }, [sessionId, router])

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
    setExpirationTime(null)
    setTimeRemaining(0)
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

  useEffect(() => {
    if (files.length > 0 && !expirationTime) {
      const expiration = new Date()
      expiration.setMinutes(expiration.getMinutes() + 30)
      setExpirationTime(expiration)
    }

    if (expirationTime) {
      const interval = setInterval(() => {
        const now = new Date()
        const diff = expirationTime.getTime() - now.getTime()

        if (diff <= 0) {
          handleClearAll()
          setExpirationTime(null)
          setTimeRemaining(0)
          toast({
            title: "Files expired",
            description: "Your files have been automatically removed after 30 minutes.",
          })
        } else {
          setTimeRemaining(Math.ceil(diff / (1000 * 60)))
        }
      }, 30000)

      return () => clearInterval(interval)
    }
  }, [files.length, expirationTime, handleClearAll, toast])

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

      if (files.length === 1) {
        setExpirationTime(null)
        setTimeRemaining(0)
      }
    },
    [files.length, fileEdits],
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
    const converted: { file: File; url: string; format: string }[] = []

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
                // For HEIC files, we need to convert first
                if (file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic") {
                  const heic2any = (await import("heic2any")).default
                  sourceBlob = (await heic2any({
                    blob: file,
                    toType: format === "webp" ? "image/jpeg" : format,
                    quality,
                  })) as Blob
                } else {
                  // For other image types, we can use directly
                  sourceBlob = file
                }
              }

              // Convert to the target format using canvas
              let finalBlob: Blob
              if (format === "webp" || (file.type !== `image/${format}` && !fileEdits[file.name]?.blob)) {
                finalBlob = await convertImageFormat(sourceBlob, format, quality)
              } else {
                finalBlob = sourceBlob
              }

              // Get file extension
              const originalExt = file.name.split(".").pop() || ""
              const baseName = file.name.substring(0, file.name.length - originalExt.length - 1)
              const newFileName = `${baseName}.${format}`

              const convertedFile = new File([finalBlob], newFileName, {
                type: format === "webp" ? "image/webp" : format === "jpeg" ? "image/jpeg" : `image/${format}`,
              })

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

              converted.push({ file: convertedFile, url, format })
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

      // Update conversion stats
      const stats = JSON.parse(localStorage.getItem("imageConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        totalConversions: (stats.totalConversions || 0) + converted.length,
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
  }, [files, formats, quality, autoDownload, toast, fileEdits])

  // Helper function to convert image format using canvas
  const convertImageFormat = async (blob: Blob, format: string, quality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const mimeType = format === "jpg" || format === "jpeg" ? "image/jpeg" : `image/${format}`

        canvas.toBlob(
          (convertedBlob) => {
            if (convertedBlob) {
              resolve(convertedBlob)
            } else {
              reject(new Error(`Failed to convert to ${format.toUpperCase()}`))
            }
          },
          mimeType,
          format === "png" || format === "gif" ? undefined : quality,
        )
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = URL.createObjectURL(blob)
    })
  }

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

  const handleNewSession = useCallback(() => {
    const newSessionId = uuidv4()
    localStorage.setItem("imageConverterSessionId", newSessionId)
    router.push(`/session/${newSessionId}`)
  }, [router])

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
      {/* AdSense Script */}
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2890525515305277"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container mx-auto py-8 px-4">
          {/* Enhanced Header */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="text-center md:text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                Image Converter
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Convert your images to any format with ease
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <PrivacyInfo />
              <ThemeToggle />
              <SocialShare />
              <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)}>
                <BarChart className="h-4 w-4 mr-2" />
                Stats
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowFeedback(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Feedback
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewSession}>
                Start New Session
              </Button>
            </div>
          </div>

          {/* Success Animation Overlay */}
          {showSuccessAnimation && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 flex flex-col items-center space-y-4 animate-in zoom-in duration-500">
                <div className="relative">
                  <CheckCircle className="h-16 w-16 text-green-500 animate-in zoom-in duration-700" />
                  <div className="absolute inset-0 h-16 w-16 bg-green-500 rounded-full animate-ping opacity-20"></div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Conversion Complete!</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Redirecting to your converted images...
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
                  <ArrowRight className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">Going to results</span>
                </div>
              </div>
            </div>
          )}

          {showStats && <UsageStats stats={usageStats} onClose={() => setShowStats(false)} />}

          {/* Enhanced Timer Alert */}
          {timeRemaining > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-center shadow-lg">
              <div className="flex items-center justify-center space-x-2">
                <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse"></div>
                <p className="text-amber-800 dark:text-amber-200 font-medium">
                  Files will be automatically removed in {timeRemaining} minute{timeRemaining !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              {/* Enhanced Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-1">
                  <TabsTrigger 
                    value="upload" 
                    className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                  >
                    Upload Images
                  </TabsTrigger>
                  <TabsTrigger 
                    value="converted" 
                    disabled={convertedImages.length === 0}
                    className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-600 data-[state=active]:text-white"
                  >
                    <div className="flex items-center space-x-2">
                      <span>Converted</span>
                      {convertedImages.length > 0 && (
                        <span className="bg-white text-gray-800 text-xs px-2 py-1 rounded-full font-medium">
                          {convertedImages.length}
                        </span>
                      )}
                      {conversionComplete && (
                        <CheckCircle className="h-4 w-4 text-green-400" />
                      )}
                    </div>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-6">
                  {/* Enhanced Privacy Notice */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border border-blue-200 dark:border-blue-900 rounded-xl p-6 mb-6 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                        <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 text-lg">Your privacy is protected</h3>
                        <p className="text-blue-700 dark:text-blue-400 mt-1">
                          Files are processed entirely in your browser and are never uploaded to any server. They will be
                          automatically removed after 30 minutes of inactivity.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Upload Section */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    <div className="flex-1 min-w-0">
                      <FileUploader
                        onFilesAdded={handleFilesAdded}
                        maxSize={25 * 1024 * 1024} // 25MB
                        maxFiles={50}
                      />
                    </div>

                    {cameraAvailable && (
                      <Button
                        variant="outline"
                        className="w-full md:w-auto flex-shrink-0 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200 dark:border-purple-800 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-900 dark:hover:to-pink-900"
                        onClick={() => setShowCameraCapture(true)}
                      >
                        <Camera className="h-4 w-4 mr-2" />
                        Use Camera
                      </Button>
                    )}
                  </div>

                  {/* Enhanced Conversion Progress */}
                  {isConverting && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Converting Images</h3>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {conversionProgress.completedFiles} of {conversionProgress.totalFiles}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                            style={{ 
                              width: `${(conversionProgress.completedFiles / conversionProgress.totalFiles) * 100}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                      {conversionProgress.currentFile && (
                        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                          <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
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
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Your Images
                          </h2>
                          <p className="text-gray-600 dark:text-gray-400">
                            {files.length} file{files.length > 1 ? "s" : ""} ready for conversion
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {files.length > 1 && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setShowBatchRename(true)}
                              className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-amber-200 dark:border-amber-800"
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Batch Rename
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={handleClearAll}
                            className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 border-red-200 dark:border-red-800"
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
                            className="relative group bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 overflow-hidden"
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
                              <div className="absolute top-3 right-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs px-3 py-1 rounded-full font-medium shadow-lg">
                                ✓ Edited
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Enhanced Conversion Options */}
                      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Conversion Settings</h3>
                        <ConversionOptions
                          formats={formats}
                          setFormats={setFormats}
                          quality={quality}
                          setQuality={setQuality}
                          autoDownload={autoDownload}
                          setAutoDownload={setAutoDownload}
                          preserveExif={preserveExif}
                          setPreserveExif={setPreserveExif}
                        />
                      </div>

                      {/* Enhanced Convert Button */}
                      <div className="flex justify-center">
                        <Button
                          onClick={handleConvert}
                          disabled={isConverting || files.length === 0}
                          className="w-full md:w-auto px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 hover:from-blue-700 hover:via-purple-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:bg-gray-400"
                        >
                          {isConverting ? (
                            <div className="flex items-center space-x-2">
                              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
                      {/* Enhanced Results Header */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl p-6 border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <h2 className="text-2xl font-bold text-green-800 dark:text-green-300">
                                Conversion Complete!
                              </h2>
                              <p className="text-green-700 dark:text-green-400">
                                {convertedImages.length} image{convertedImages.length > 1 ? "s" : ""} successfully converted
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <Button 
                              variant="outline" 
                              onClick={handleDownloadZip} 
                              disabled={isZipping}
                              className="bg-white dark:bg-gray-800 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {isZipping ? "Creating ZIP..." : "Download ZIP"}
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={handleDownloadAll}
                              className="bg-white dark:bg-gray-800 border-green-300 dark:border-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            >
                              Download All
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Results Grid */}
                      {formats.length > 1 ? (
                        <Tabs defaultValue={formats[0]} className="w-full">
                          <TabsList className="mb-6 bg-white dark:bg-gray-800 shadow-lg rounded-xl p-1">
                            {formats.map((format) => (
                              <TabsTrigger 
                                key={format} 
                                value={format}
                                className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white"
                              >
                                {format.toUpperCase()}
                              </TabsTrigger>
                            ))}
                            <TabsTrigger 
                              value="all"
                              className="rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white"
                            >
                              All Formats
                            </TabsTrigger>
                          </TabsList>

                          {formats.map((format) => (
                            <TabsContent key={format} value={format} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {convertedImages
                                  .filter((img) => img.format === format)
                                  .map(({ url, file }, index) => (
                                    <div
                                      key={`${file.name}-${index}`}
                                      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                    >
                                      <div className="relative">
                                        <img
                                          src={url || "/placeholder.svg"}
                                          alt={file.name}
                                          className="w-full h-48 object-contain bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                                        />
                                        <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                                          {format.toUpperCase()}
                                        </div>
                                      </div>
                                      <div className="p-4 space-y-3">
                                        <div>
                                          <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                                          <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {(file.size / 1024).toFixed(1)} KB
                                          </p>
                                        </div>
                                        <Button 
                                          size="sm" 
                                          onClick={() => handleDownload(url, file.name)}
                                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
                              {convertedImages.map(({ url, file, format }, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                                >
                                  <div className="relative">
                                    <img
                                      src={url || "/placeholder.svg"}
                                      alt={file.name}
                                      className="w-full h-48 object-contain bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                                    />
                                    <div className="absolute top-3 right-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                                      {format.toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="p-4 space-y-3">
                                    <div>
                                      <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      onClick={() => handleDownload(url, file.name)}
                                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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
                          {convertedImages.map(({ url, file }, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                            >
                              <img
                                src={url || "/placeholder.svg"}
                                alt={file.name}
                                className="w-full h-48 object-contain bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900"
                              />
                              <div className="p-4 space-y-3">
                                <div>
                                  <p className="font-semibold text-gray-900 dark:text-white truncate">{file.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Button 
                                  size="sm" 
                                  onClick={() => handleDownload(url, file.name)}
                                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
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

            {/* Enhanced Sidebar */}
            <div className="lg:col-span-1">
              <div className="space-y-6 lg:sticky lg:top-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                  <DonationButton />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl overflow-hidden shadow-lg">
                  <AdPlaceholder />
                </div>
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
