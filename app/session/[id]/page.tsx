"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { FileUploader } from "@/components/file-uploader"
import { ImagePreview } from "@/components/image-preview"
import { ConversionOptions } from "@/components/conversion-options"
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

export default function HeicConverter() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const sessionId = params.id as string

  const [files, setFiles] = useState<File[]>([])
  const [convertedImages, setConvertedImages] = useState<{ file: File; url: string }[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [format, setFormat] = useState<"jpeg" | "png">("jpeg")
  const [quality, setQuality] = useState(0.8)
  const [expirationTime, setExpirationTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [isZipping, setIsZipping] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [usageStats, setUsageStats] = useState({
    totalConversions: 0,
    sessionsStarted: 0,
    lastUsed: "",
  })

  // Load usage stats from localStorage
  useEffect(() => {
    const stats = localStorage.getItem("heicConverterStats")
    if (stats) {
      setUsageStats(JSON.parse(stats))
    }
  }, [])

  // Verify this is the user's session
  useEffect(() => {
    const storedSessionId = localStorage.getItem("heicConverterSessionId")
    if (storedSessionId !== sessionId) {
      // Redirect to home if session IDs don't match
      router.push("/")
    } else {
      // Update sessions started count
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
    // Revoke object URLs to prevent memory leaks
    convertedImages.forEach(({ url }) => {
      URL.revokeObjectURL(url)
    })

    setFiles([])
    setConvertedImages([])
    setExpirationTime(null)
    setTimeRemaining(0)
  }, [convertedImages])

  useEffect(() => {
    // Set expiration time when files are added (30 minutes from now)
    if (files.length > 0 && !expirationTime) {
      const expiration = new Date()
      expiration.setMinutes(expiration.getMinutes() + 30)
      setExpirationTime(expiration)
    }

    // Clear everything when time expires
    if (expirationTime) {
      const interval = setInterval(() => {
        const now = new Date()
        const diff = expirationTime.getTime() - now.getTime()

        if (diff <= 0) {
          // Time expired, clear everything
          handleClearAll()
          setExpirationTime(null)
          setTimeRemaining(0)
          toast({
            title: "Files expired",
            description: "Your files have been automatically removed after 30 minutes.",
          })
        } else {
          // Update time remaining in minutes
          setTimeRemaining(Math.ceil(diff / (1000 * 60)))
        }
      }, 30000) // Check every 30 seconds

      return () => clearInterval(interval)
    }
  }, [files.length, expirationTime, handleClearAll, toast])

  const handleFilesAdded = useCallback(
    (newFiles: File[]) => {
      // Filter out non-HEIC files
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

      // If removing the last file, reset expiration time
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

      // Get the file extension
      const extension = file.name.split(".").pop() || "heic"

      // Create a new file with the new name
      const renamedFile = new File([file], `${newName}.${extension}`, { type: file.type })

      updatedFiles[index] = renamedFile
      return updatedFiles
    })
  }, [])

  const handleConvert = useCallback(async () => {
    if (files.length === 0) return

    setIsConverting(true)
    const converted: { file: File; url: string }[] = []

    try {
      // Dynamically import heic2any to avoid SSR issues
      const heic2any = (await import("heic2any")).default

      for (const file of files) {
        const blob = (await heic2any({
          blob: file,
          toType: format,
          quality,
        })) as Blob

        const convertedFile = new File([blob], file.name.replace(/\.heic$/i, `.${format}`), {
          type: format === "jpeg" ? "image/jpeg" : "image/png",
        })

        const url = URL.createObjectURL(convertedFile)
        converted.push({ file: convertedFile, url })
      }

      setConvertedImages(converted)

      // Update conversion stats
      const stats = JSON.parse(localStorage.getItem("heicConverterStats") || "{}")
      const updatedStats = {
        ...stats,
        totalConversions: (stats.totalConversions || 0) + files.length,
        lastUsed: new Date().toISOString(),
      }
      localStorage.setItem("heicConverterStats", JSON.stringify(updatedStats))
      setUsageStats(updatedStats)

      toast({
        title: "Conversion complete",
        description: `Successfully converted ${files.length} file${files.length > 1 ? "s" : ""}.`,
      })
    } catch (error) {
      console.error("Conversion error:", error)
      toast({
        title: "Conversion failed",
        description: "There was an error converting your files.",
        variant: "destructive",
      })
    } finally {
      setIsConverting(false)
    }
  }, [files, format, quality, toast])

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

      // Add each file to the zip
      for (const { file, url } of convertedImages) {
        const response = await fetch(url)
        const blob = await response.blob()
        zip.file(file.name, blob)
      }

      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: "blob" })
      const zipUrl = URL.createObjectURL(zipBlob)

      // Download the zip file
      const a = document.createElement("a")
      a.href = zipUrl
      a.download = `converted_images_${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Clean up
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
    // Generate a new session ID
    const newSessionId = uuidv4()
    localStorage.setItem("heicConverterSessionId", newSessionId)

    // Redirect to the new session
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
          <Button variant="outline" size="sm" onClick={() => setShowFeedback(!showFeedback)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Feedback
          </Button>
          <Button variant="outline" size="sm" onClick={handleNewSession}>
            Start New Session
          </Button>
        </div>
      </div>

      {showStats && <UsageStats stats={usageStats} onClose={() => setShowStats(false)} />}

      {showFeedback && <FeedbackForm onClose={() => setShowFeedback(false)} />}

      {timeRemaining > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-6 text-center">
          <p className="text-amber-800 dark:text-amber-200">
            Files will be automatically removed in {timeRemaining} minute{timeRemaining !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Tabs defaultValue="heic" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="heic">HEIC Converter</TabsTrigger>
              <TabsTrigger value="converted" disabled={convertedImages.length === 0}>
                Converted ({convertedImages.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="heic" className="space-y-6">
              <FileUploader onFilesAdded={handleFilesAdded} acceptedTypes={{ "image/heic": [".heic"] }} />

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

                  <ConversionOptions format={format} setFormat={setFormat} quality={quality} setQuality={setQuality} />

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

        <div className="lg:col-span-1 space-y-6">
          <DonationButton />
          <AdPlaceholder />
        </div>
      </div>

      <Toaster />
    </div>
  )
}
