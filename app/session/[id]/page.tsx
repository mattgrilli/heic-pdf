"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { FileUploader } from "@/components/file-uploader"
import { ImagePreview } from "@/components/image-preview"
import { ConversionOptions } from "@/components/conversion-options"
import { BatchProgress } from "@/components/batch-progress"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"
import { AdPlaceholder } from "@/components/ad-placeholder"
import { DonationButton } from "@/components/donation-button"
import { FeedbackForm } from "@/components/feedback-form"
import { Download, MessageSquare, BarChart } from "lucide-react"
import JSZip from "jszip"
import { UsageStats } from "@/components/usage-stats"
import { ThemeToggle } from "@/components/theme-toggle"
import { SocialShare } from "@/components/social-share"

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

  const [files, setFiles] = useState<File[]>([])
  const [convertedImages, setConvertedImages] = useState<{ file: File; url: string }[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [format, setFormat] = useState<"jpeg" | "png" | "webp">("jpeg")
  const [quality, setQuality] = useState(0.8)
  const [autoDownload, setAutoDownload] = useState(false)
  const [expirationTime, setExpirationTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isZipping, setIsZipping] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showStats, setShowStats] = useState(false)
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

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("heicConverterSettings")
    if (savedSettings) {
      const settings = JSON.parse(savedSettings)
      setFormat(settings.format || "jpeg")
      setQuality(settings.quality || 0.8)
      setAutoDownload(settings.autoDownload || false)
    }

    const stats = localStorage.getItem("heicConverterStats")
    if (stats) {
      setUsageStats(JSON.parse(stats))
    }
  }, [])

  // Save settings to localStorage
  useEffect(() => {
    const settings = { format, quality, autoDownload }
    localStorage.setItem("heicConverterSettings", JSON.stringify(settings))
  }, [format, quality, autoDownload])

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

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return

    setIsConverting(true)
    const converted: { file: File; url: string }[] = []
    const errors: string[] = []

    // Initialize progress
    setConversionProgress({
      totalFiles: files.length,
      completedFiles: 0,
      currentFile: "",
      errors: [],
    })

    try {
      const heic2any = (await import("heic2any")).default

      // Process files in batches to prevent memory issues
      const batchSize = 5
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize)

        // Process batch concurrently
        const batchPromises = batch.map(async (file, batchIndex) => {
          const globalIndex = i + batchIndex

          try {
            // Update current file
            setConversionProgress((prev) => ({
              ...prev,
              currentFile: file.name,
            }))

            // Add delay for large files to prevent browser freeze
            if (file.size > 10 * 1024 * 1024) {
              // 10MB
              await new Promise((resolve) => setTimeout(resolve, 100))
            }

            const blob = (await heic2any({
              blob: file,
              toType: format === "webp" ? "image/jpeg" : format, // Fallback for WebP
              quality,
            })) as Blob

            // Convert to WebP if requested (using canvas)
            let finalBlob = blob
            if (format === "webp") {
              finalBlob = await convertToWebP(blob, quality)
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

            return { file: convertedFile, url }
          } catch (error) {
            const errorMsg = `${file.name}: ${error instanceof Error ? error.message : "Conversion failed"}`
            errors.push(errorMsg)
            console.error(`Error converting ${file.name}:`, error)
            return null
          } finally {
            // Update progress
            setConversionProgress((prev) => ({
              ...prev,
              completedFiles: prev.completedFiles + 1,
              errors: [...prev.errors, ...errors.slice(prev.errors.length)],
            }))
          }
        })

        const batchResults = await Promise.all(batchPromises)
        converted.push(...(batchResults.filter((result) => result !== null) as { file: File; url: string }[]))

        // Small delay between batches
        if (i + batchSize < files.length) {
          await new Promise((resolve) => setTimeout(resolve, 50))
        }
      }

      setConvertedImages(converted)

      // Update conversion stats
      const stats = JSON.parse(localStorage.getItem("heicConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        totalConversions: (stats.totalConversions || 0) + converted.length,
        lastUsed: new Date().toISOString(),
      }
      localStorage.setItem("heicConverterStats", JSON.stringify(updatedStats))
      setUsageStats(updatedStats)

      // Final progress update
      setConversionProgress((prev) => ({
        ...prev,
        currentFile: "",
      }))

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
    } catch (error) {
      console.error("Conversion error:", error)
      toast({
        title: "Conversion failed",
        description: "There was an error during conversion.",
        variant: "destructive",
      })
    } finally {
      setIsConverting(false)
    }
  }, [files, format, quality, autoDownload, toast])

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

      for (const { file, url } of convertedImages) {
        const response = await fetch(url)
        const blob = await response.blob()
        zip.file(file.name, blob)
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

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center">HEIC Converter</h1>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
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
              <FileUploader
                onFilesAdded={handleFilesAdded}
                acceptedTypes={{ "image/heic": [".heic"] }}
                maxSize={25 * 1024 * 1024} // 25MB
                maxFiles={50}
              />

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
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">
                      Preview ({files.length} file{files.length > 1 ? "s" : ""})
                    </h2>
                    <Button variant="outline" onClick={handleClearAll}>
                      Clear All
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {files.map((file, index) => (
                      <ImagePreview
                        key={`${file.name}-${index}`}
                        file={file}
                        onRemove={() => handleRemoveFile(index)}
                        onRename={(newName) => handleRenameFile(index, newName)}
                      />
                    ))}
                  </div>

                  <ConversionOptions
                    format={format}
                    setFormat={setFormat}
                    quality={quality}
                    setQuality={setQuality}
                    autoDownload={autoDownload}
                    setAutoDownload={setAutoDownload}
                  />

                  <div className="flex justify-center">
                    <Button
                      onClick={handleConvert}
                      disabled={isConverting || files.length === 0}
                      className="w-full md:w-auto"
                    >
                      {isConverting ? "Converting..." : "Convert Files"}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="converted" className="space-y-6">
              {convertedImages.length > 0 && (
                <>
                  <div className="flex justify-between items-center">
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

      {showFeedback && <FeedbackForm onClose={() => setShowFeedback(false)} />}

      <Toaster />
    </div>
  )
}
