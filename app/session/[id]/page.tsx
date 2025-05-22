"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { Download, MessageSquare, BarChart, Shield, Camera, Edit, Wand, Pencil } from "lucide-react"
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

export default function HeicConverter() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sessionId = params.id as string
  const isMobile = useMediaQuery("(max-width: 768px)")
  const workerRef = useRef<Worker | null>(null)

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
  const [fileEdits, setFileEdits] = useState<Record<string, ImageEditSettings>>({})
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
  const [pendingConversions, setPendingConversions] = useState<string[]>([])

  // Initialize web worker - using a different approach
  useEffect(() => {
    if (typeof Worker !== "undefined" && !workerRef.current) {
      try {
        // Create a worker using a blob URL
        const workerCode = `
          self.addEventListener("message", function(event) {
            const { id, file, fileName, format, quality } = event.data;
            
            // Just send back a message that we need to do the conversion on the main thread
            self.postMessage({
              id,
              needsMainThreadConversion: true,
              fileName,
              format,
              quality
            });
          });
        `

        const blob = new Blob([workerCode], { type: "application/javascript" })
        const workerUrl = URL.createObjectURL(blob)

        workerRef.current = new Worker(workerUrl)

        // Set up message handler
        workerRef.current.onmessage = (event) => {
          const { id, needsMainThreadConversion, fileName, format, quality, success, data, error } = event.data

          if (needsMainThreadConversion) {
            // We need to do the conversion on the main thread
            handleMainThreadConversion(id, fileName, format, quality)
          } else if (success && data) {
            // Process successful conversion result
            processConversionResult(id, fileName, format, data)
          } else if (error) {
            // Handle error
            handleConversionError(id, fileName, error)
          }
        }
      } catch (error) {
        console.error("Error creating web worker:", error)
      }
    }

    return () => {
      // Clean up worker
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Function to handle conversion on the main thread
  const handleMainThreadConversion = async (id: string, fileName: string, format: string, quality: number) => {
    try {
      // Find the file
      const file = files.find((f) => f.name === fileName)
      if (!file) {
        throw new Error("File not found")
      }

      // Convert the file
      const heic2any = (await import("heic2any")).default
      const blob = (await heic2any({
        blob: file,
        toType: format === "webp" ? "image/jpeg" : format,
        quality,
      })) as Blob

      // Convert to WebP if needed
      let finalBlob = blob
      if (format === "webp") {
        finalBlob = await convertToWebP(blob, quality)
      }

      // Create file and URL
      const convertedFile = new File([finalBlob], fileName.replace(/\.heic$/i, `.${format}`), {
        type: format === "webp" ? "image/webp" : format === "jpeg" ? "image/jpeg" : "image/png",
      })
      const url = URL.createObjectURL(convertedFile)

      // Add to converted images
      setConvertedImages((prev) => [...prev, { file: convertedFile, url, format }])

      // Auto-download if enabled
      if (autoDownload) {
        const a = document.createElement("a")
        a.href = url
        a.download = convertedFile.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }

      // Update progress
      setConversionProgress((prev) => ({
        ...prev,
        completedFiles: prev.completedFiles + 1,
        currentFile: "",
      }))

      // Remove from pending conversions
      setPendingConversions((prev) => prev.filter((pendingId) => pendingId !== id))
    } catch (error) {
      // Handle error
      const errorMsg = `${fileName}: ${error instanceof Error ? error.message : "Conversion failed"}`
      setConversionProgress((prev) => ({
        ...prev,
        errors: [...prev.errors, errorMsg],
        completedFiles: prev.completedFiles + 1,
      }))
      setPendingConversions((prev) => prev.filter((pendingId) => pendingId !== id))
    }
  }

  // Function to process conversion result
  const processConversionResult = (id: string, fileName: string, format: string, data: ArrayBuffer) => {
    // Create blob from array buffer
    const blob = new Blob([data], {
      type: format === "webp" ? "image/webp" : format === "jpeg" ? "image/jpeg" : "image/png",
    })

    // Create file and URL
    const file = new File([blob], fileName, { type: blob.type })
    const url = URL.createObjectURL(blob)

    // Add to converted images
    setConvertedImages((prev) => [...prev, { file, url, format }])

    // Auto-download if enabled
    if (autoDownload) {
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    // Update progress
    setConversionProgress((prev) => ({
      ...prev,
      completedFiles: prev.completedFiles + 1,
      currentFile: "",
    }))

    // Remove from pending conversions
    setPendingConversions((prev) => prev.filter((pendingId) => pendingId !== id))
  }

  // Function to handle conversion error
  const handleConversionError = (id: string, fileName: string, error: string) => {
    setConversionProgress((prev) => ({
      ...prev,
      errors: [...prev.errors, `${fileName}: ${error}`],
      completedFiles: prev.completedFiles + 1,
    }))
    setPendingConversions((prev) => prev.filter((pendingId) => pendingId !== id))
  }

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("heicConverterSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setFormats(settings.formats || ["jpeg"])
      setQuality(settings.quality || 0.8)
      setAutoDownload(settings.autoDownload || false)
      setPreserveExif(settings.preserveExif !== undefined ? settings.preserveExif : true)
    }

    const stats = localStorage.getItem("heicConverterStats")
    if (stats) {
      setUsageStats(JSON.parse(stats))
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    const settings = { formats, quality, autoDownload, preserveExif }
    localStorage.setItem("heicConverterSettings", JSON.stringify(settings))
  }, [formats, quality, autoDownload, preserveExif])

  // Verify this is the user's session
  useEffect(() => {
    const storedSessionId = localStorage.getItem("heicConverterSessionId")
    if (storedSessionId !== sessionId) {
      router.push("/")
    } else {
      const stats = JSON.parse(localStorage.getItem("heicConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        sessionsStarted: (stats.sessionsStarted || 0) + 1,
        lastUsed: new Date().toISOString(),
      }
      localStorage.setItem("heicConverterStats", JSON.stringify(updatedStats))
      setUsageStats(updatedStats)
    }
  }, [sessionId, router])

  const handleClearAll = useCallback(() => {
    convertedImages.forEach(({ url }) => {
      URL.revokeObjectURL(url)
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
  }, [convertedImages])

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

  const handleFilesAdded = useCallback(
    (newFiles: File[]) => {
      const heicFiles = newFiles.filter(
        (file) => file.name.toLowerCase().endsWith(".heic") || file.type === "image/heic",
      )

      if (heicFiles.length < newFiles.length) {
        toast({
          title: "Some files were skipped",
          description: "Only HEIC files are supported.",
          variant: "destructive",
        })
      }

      setFiles((prev) => [...prev, ...heicFiles])
    },
    [toast],
  )

  const handleRemoveFile = useCallback(
    (indexToRemove: number) => {
      setFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove))

      if (files.length === 1) {
        setExpirationTime(null)
        setTimeRemaining(0)
      }
    },
    [files.length],
  )

  const handleRenameFile = useCallback((index: number, newName: string) => {
    setFiles((prevFiles) => {
      const updatedFiles = [...prevFiles]
      const file = updatedFiles[index]
      const extension = file.name.split(".").pop() || "heic"
      const renamedFile = new File([file], `${newName}.${extension}`, { type: file.type })
      updatedFiles[index] = renamedFile
      return updatedFiles
    })
  }, [])

  const handleBatchRename = useCallback((renamedFiles: { originalFile: File; newName: string }[]) => {
    setFiles((prevFiles) => {
      return prevFiles.map((file) => {
        const renamed = renamedFiles.find((rf) => rf.originalFile === file)
        if (renamed) {
          const extension = file.name.split(".").pop() || "heic"
          return new File([file], `${renamed.newName}.${extension}`, { type: file.type })
        }
        return file
      })
    })
  }, [])

  const handleEditImage = useCallback(
    (file: File) => {
      // Create preview URL for the editor
      const createPreview = async () => {
        try {
          const heic2any = (await import("heic2any")).default
          const blob = (await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          })) as Blob

          const url = URL.createObjectURL(blob)
          setEditingFile({ file, previewUrl: url })
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
    [toast],
  )

  const handleSaveEdit = useCallback(
    (editedBlob: Blob, settings: ImageEditSettings) => {
      if (!editingFile) return

      // Store edit settings for use during conversion
      setFileEdits((prev) => ({
        ...prev,
        [editingFile.file.name]: settings,
      }))

      // Close editor
      setEditingFile(null)
    },
    [editingFile],
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
    const errors: string[] = []

    // Initialize progress
    setConversionProgress({
      totalFiles: files.length * formats.length,
      completedFiles: 0,
      currentFile: "",
      errors: [],
    })

    try {
      // If web workers are supported and initialized, use them
      if (typeof Worker !== "undefined" && workerRef.current) {
        const pendingIds: string[] = []

        // Process each file for each format
        for (const file of files) {
          for (const format of formats) {
            const conversionId = uuidv4()
            pendingIds.push(conversionId)

            // Update current file
            setConversionProgress((prev) => ({
              ...prev,
              currentFile: `${file.name} to ${format.toUpperCase()}`,
            }))

            // Send to worker - but we'll actually do the conversion on the main thread
            workerRef.current.postMessage({
              id: conversionId,
              file: null, // Don't send the file to avoid cloning issues
              fileName: file.name,
              format,
              quality,
            })
          }
        }

        // Store pending conversions
        setPendingConversions(pendingIds)
      } else {
        // Fallback to main thread conversion
        await convertOnMainThread()
      }

      // Update conversion stats
      const stats = JSON.parse(localStorage.getItem("heicConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        totalConversions: (stats.totalConversions || 0) + files.length * formats.length,
        lastUsed: new Date().toISOString(),
      }
      localStorage.setItem("heicConverterStats", JSON.stringify(updatedStats))
      setUsageStats(updatedStats)
    } catch (error) {
      console.error("Conversion error:", error)
      toast({
        title: "Conversion failed",
        description: "There was an error during conversion.",
        variant: "destructive",
      })
      setIsConverting(false)
    }
  }, [files, formats, quality, autoDownload, toast, fileEdits])

  // Main thread conversion function
  const convertOnMainThread = async () => {
    const heic2any = (await import("heic2any")).default
    const converted: { file: File; url: string; format: string }[] = []
    const errors: string[] = []

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

            // Convert HEIC to requested format
            const blob = (await heic2any({
              blob: file,
              toType: format === "webp" ? "image/jpeg" : format,
              quality,
            })) as Blob

            // Convert to WebP if requested
            let finalBlob = blob
            if (format === "webp") {
              finalBlob = await convertToWebP(blob, quality)
            }

            // Apply edits if any
            const editSettings = fileEdits[file.name]
            if (editSettings) {
              // Apply edits (simplified version)
              // In a real implementation, this would apply the edits
            }

            const convertedFile = new File([finalBlob], file.name.replace(/\.heic$/i, `.${format}`), {
              type: format === "webp" ? "image/webp" : format === "jpeg" ? "image/jpeg" : "image/png",
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
    setIsConverting(false)

    const successCount = converted.length
    const errorCount = errors.length

    if (successCount > 0) {
      toast({
        title: "Conversion complete",
        description: `Successfully converted ${successCount} file${successCount > 1 ? "s" : ""}${errorCount > 0 ? `. ${errorCount} failed.` : "."}`,
      })
    } else {
      toast({
        title: "Conversion failed",
        description: "No files were converted successfully.",
        variant: "destructive",
      })
    }
  }

  // Effect to check if all conversions are complete
  useEffect(() => {
    if (isConverting && pendingConversions.length === 0 && conversionProgress.completedFiles > 0) {
      setIsConverting(false)

      const successCount = convertedImages.length
      const errorCount = conversionProgress.errors.length

      if (successCount > 0) {
        toast({
          title: "Conversion complete",
          description: `Successfully converted ${successCount} file${successCount > 1 ? "s" : ""}${errorCount > 0 ? `. ${errorCount} failed.` : "."}`,
        })
      } else {
        toast({
          title: "Conversion failed",
          description: "No files were converted successfully.",
          variant: "destructive",
        })
      }

      // Reset current file
      setConversionProgress((prev) => ({
        ...prev,
        currentFile: "",
      }))
    }
  }, [
    isConverting,
    pendingConversions.length,
    conversionProgress.completedFiles,
    conversionProgress.errors.length,
    convertedImages.length,
    toast,
  ])

  // Helper function to convert to WebP using canvas
  const convertToWebP = async (blob: Blob, quality: number): Promise<Blob> => {
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

        canvas.toBlob(
          (webpBlob) => {
            if (webpBlob) {
              resolve(webpBlob)
            } else {
              reject(new Error("Failed to convert to WebP"))
            }
          },
          "image/webp",
          quality,
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
    localStorage.setItem("heicConverterSessionId", newSessionId)
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center">HEIC Converter</h1>
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

      {showStats && <UsageStats stats={usageStats} onClose={() => setShowStats(false)} />}

      {timeRemaining > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-6 text-center">
          <p className="text-amber-800 dark:text-amber-200">
            Files will be automatically removed in {timeRemaining} minute{timeRemaining !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <Tabs defaultValue="heic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="heic">HEIC Converter</TabsTrigger>
              <TabsTrigger value="converted" disabled={convertedImages.length === 0}>
                Converted ({convertedImages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heic" className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-md p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-800 dark:text-blue-300">Your privacy is protected</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      Files are processed entirely in your browser and are never uploaded to any server. They will be
                      automatically removed after 30 minutes of inactivity.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 mb-4">
                <FileUploader
                  onFilesAdded={handleFilesAdded}
                  acceptedTypes={{ "image/heic": [".heic"] }}
                  maxSize={25 * 1024 * 1024} // 25MB
                  maxFiles={50}
                />

                {cameraAvailable && (
                  <Button
                    variant="outline"
                    className="w-full md:w-auto flex-shrink-0"
                    onClick={() => setShowCameraCapture(true)}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Use Camera
                  </Button>
                )}
              </div>

              {isConverting && (
                <BatchProgress
                  totalFiles={conversionProgress.totalFiles}
                  completedFiles={conversionProgress.completedFiles}
                  currentFile={conversionProgress.currentFile}
                  errors={conversionProgress.errors}
                />
              )}

              {files.length > 0 && (
                <>
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <h2 className="text-xl font-semibold">
                      Preview ({files.length} file{files.length > 1 ? "s" : ""})
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {files.length > 1 && (
                        <Button variant="outline" size="sm" onClick={() => setShowBatchRename(true)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Batch Rename
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={handleClearAll}>
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="relative group">
                        <ImagePreview
                          file={file}
                          onRemove={() => handleRemoveFile(index)}
                          onRename={(newName) => handleRenameFile(index, newName)}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleEditImage(file)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    ))}
                  </div>

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

                  <div className="flex justify-center">
                    <Button
                      onClick={handleConvert}
                      disabled={isConverting || files.length === 0}
                      className="w-full md:w-auto"
                    >
                      <Wand className="h-4 w-4 mr-2" />
                      {isConverting ? "Converting..." : `Convert to ${formats.map((f) => f.toUpperCase()).join(", ")}`}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="converted" className="space-y-6">
              {convertedImages.length > 0 && (
                <>
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h2 className="text-xl font-semibold">Converted Images ({convertedImages.length})</h2>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={handleDownloadZip} disabled={isZipping}>
                        <Download className="h-4 w-4 mr-2" />
                        {isZipping ? "Creating ZIP..." : "Download as ZIP"}
                      </Button>
                      <Button variant="outline" onClick={handleDownloadAll}>
                        Download All
                      </Button>
                    </div>
                  </div>

                  {/* Group by format if multiple formats */}
                  {formats.length > 1 ? (
                    <Tabs defaultValue={formats[0]} className="w-full">
                      <TabsList className="mb-4">
                        {formats.map((format) => (
                          <TabsTrigger key={format} value={format}>
                            {format.toUpperCase()}
                          </TabsTrigger>
                        ))}
                        <TabsTrigger value="all">All</TabsTrigger>
                      </TabsList>

                      {formats.map((format) => (
                        <TabsContent key={format} value={format} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {convertedImages
                              .filter((img) => img.format === format)
                              .map(({ url, file }, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="border rounded-lg overflow-hidden dark:border-gray-700"
                                >
                                  <img
                                    src={url || "/placeholder.svg"}
                                    alt={file.name}
                                    className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-800"
                                  />
                                  <div className="p-3 flex justify-between items-center dark:bg-gray-900">
                                    <div className="truncate mr-2">
                                      <p className="font-medium truncate">{file.name}</p>
                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {(file.size / 1024).toFixed(1)} KB
                                      </p>
                                    </div>
                                    <Button size="sm" onClick={() => handleDownload(url, file.name)}>
                                      Download
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </TabsContent>
                      ))}

                      <TabsContent value="all" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {convertedImages.map(({ url, file, format }, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="border rounded-lg overflow-hidden dark:border-gray-700"
                            >
                              <div className="relative">
                                <img
                                  src={url || "/placeholder.svg"}
                                  alt={file.name}
                                  className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-800"
                                />
                                <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                                  {format.toUpperCase()}
                                </div>
                              </div>
                              <div className="p-3 flex justify-between items-center dark:bg-gray-900">
                                <div className="truncate mr-2">
                                  <p className="font-medium truncate">{file.name}</p>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {(file.size / 1024).toFixed(1)} KB
                                  </p>
                                </div>
                                <Button size="sm" onClick={() => handleDownload(url, file.name)}>
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {convertedImages.map(({ url, file }, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="border rounded-lg overflow-hidden dark:border-gray-700"
                        >
                          <img
                            src={url || "/placeholder.svg"}
                            alt={file.name}
                            className="w-full h-48 object-contain bg-gray-100 dark:bg-gray-800"
                          />
                          <div className="p-3 flex justify-between items-center dark:bg-gray-900">
                            <div className="truncate mr-2">
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <Button size="sm" onClick={() => handleDownload(url, file.name)}>
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

        {/* Sidebar - ensure it's properly isolated */}
        <div className="lg:col-span-1">
          <div className="space-y-6 lg:sticky lg:top-8">
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
  )
}
