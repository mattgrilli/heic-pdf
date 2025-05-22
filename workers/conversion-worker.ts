// This file will be used as a Web Worker for image conversion
// We'll use a different approach to avoid ES module issues

// Define the message event types
type WorkerInput = {
  id: string
  file: ArrayBuffer
  fileName: string
  format: "jpeg" | "png" | "webp"
  quality: number
  watermark?: {
    text?: string
    image?: ArrayBuffer
    position: "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight"
    opacity: number
  }
  resize?: {
    width?: number
    height?: number
    maintainAspectRatio: boolean
  }
  rotation?: 0 | 90 | 180 | 270
}

type WorkerOutput = {
  id: string
  success: boolean
  fileName: string
  data?: ArrayBuffer
  format: string
  error?: string
}

// Listen for messages from the main thread
self.addEventListener("message", async (event: MessageEvent<WorkerInput>) => {
  const { id, file, fileName, format, quality, watermark, resize, rotation } = event.data

  try {
    // We'll use the main thread to do the conversion instead
    // Just send back a message to do the conversion there
    self.postMessage({
      id,
      needsMainThreadConversion: true,
      fileName,
      format,
      quality,
      watermark,
      resize,
      rotation,
    })
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      id,
      success: false,
      fileName,
      format,
      error: error instanceof Error ? error.message : "Unknown error",
    } as WorkerOutput)
  }
})
