"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Camera, CameraIcon as FlipCamera, ImageIcon } from "lucide-react"

interface CameraCaptureProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (file: File) => void
}

export function CameraCapture({ isOpen, onClose, onCapture }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize camera when dialog opens
  useEffect(() => {
    if (!isOpen) return

    const startCamera = async () => {
      try {
        // Check if device has multiple cameras
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter((device) => device.kind === "videoinput")
        setHasMultipleCameras(videoDevices.length > 1)

        // Start camera stream
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        })

        setStream(newStream)

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
      }
    }

    startCamera()

    // Cleanup function
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [isOpen, facingMode])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to data URL
    const dataUrl = canvas.toDataURL("image/jpeg")
    setCapturedImage(dataUrl)

    // Stop camera stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  const handleSave = () => {
    if (!capturedImage || !canvasRef.current) return

    // Convert data URL to Blob
    canvasRef.current.toBlob(
      (blob) => {
        if (!blob) return

        // Create File object
        const file = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: "image/jpeg" })

        // Pass file to parent component
        onCapture(file)

        // Reset state and close dialog
        setCapturedImage(null)
        onClose()
      },
      "image/jpeg",
      0.95,
    )
  }

  const handleRetake = () => {
    setCapturedImage(null)

    // Restart camera
    const startCamera = async () => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        })

        setStream(newStream)

        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (error) {
        console.error("Error accessing camera:", error)
      }
    }

    startCamera()
  }

  const switchCamera = () => {
    // Toggle between front and back camera
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"))

    // Stop current stream
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Camera Capture</DialogTitle>
        </DialogHeader>

        <div className="relative aspect-video bg-black rounded-md overflow-hidden">
          {!capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {hasMultipleCameras && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 rounded-full"
                  onClick={switchCamera}
                >
                  <FlipCamera className="h-4 w-4" />
                </Button>
              )}
            </>
          ) : (
            <img src={capturedImage || "/placeholder.svg"} alt="Captured" className="w-full h-full object-cover" />
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter>
          {!capturedImage ? (
            <Button onClick={handleCapture} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Capture Photo
            </Button>
          ) : (
            <div className="flex w-full gap-2">
              <Button variant="outline" onClick={handleRetake} className="flex-1">
                <Camera className="h-4 w-4 mr-2" />
                Retake
              </Button>
              <Button onClick={handleSave} className="flex-1">
                <ImageIcon className="h-4 w-4 mr-2" />
                Use Photo
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
