"use client"

import { useState, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { FileUploader } from "@/components/file-uploader"
import { ImagePreview } from "@/components/image-preview"
import { ConversionOptions } from "@/components/conversion-options"
import { PdfEditor } from "@/components/pdf-editor"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { v4 as uuidv4 } from "uuid"

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

  // Verify this is the user's session
  useEffect(() => {
    const storedSessionId = localStorage.getItem("heicConverterSessionId")
    if (storedSessionId !== sessionId) {
      // Redirect to home if session IDs don't match
      router.push("/")
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
        <h1 className="text-3xl font-bold text-center">File Converter & Editor</h1>
        <Button variant="outline" size="sm" onClick={handleNewSession} className="mt-4 md:mt-0">
          Start New Session
        </Button>
      </div>

      {timeRemaining > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6 text-center">
          <p className="text-amber-800">
            Files will be automatically removed in {timeRemaining} minute{timeRemaining !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      <Tabs defaultValue="heic" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="heic">HEIC Converter</TabsTrigger>
          <TabsTrigger value="pdf">PDF Editor</TabsTrigger>
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
                  <ImagePreview key={`${file.name}-${index}`} file={file} />
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

        <TabsContent value="pdf" className="space-y-6">
          <PdfEditor />
        </TabsContent>

        <TabsContent value="converted" className="space-y-6">
          {convertedImages.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Converted Images ({convertedImages.length})</h2>
                <Button variant="outline" onClick={handleDownloadAll}>
                  Download All
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {convertedImages.map(({ url, file }, index) => (
                  <div key={`${file.name}-${index}`} className="border rounded-lg overflow-hidden">
                    <img
                      src={url || "/placeholder.svg"}
                      alt={file.name}
                      className="w-full h-48 object-contain bg-gray-100"
                    />
                    <div className="p-3 flex justify-between items-center">
                      <div className="truncate mr-2">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
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

      <Toaster />
    </div>
  )
}
