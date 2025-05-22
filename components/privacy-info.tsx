"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Info, Shield, Server, Clock, Lock } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function PrivacyInfo() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Info className="h-4 w-4" />
          <span>About</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>About HEIC Converter</DialogTitle>
          <DialogDescription>Information about how this tool works and handles your data</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="privacy" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="how">How It Works</TabsTrigger>
            <TabsTrigger value="tech">Technology</TabsTrigger>
          </TabsList>

          <TabsContent value="privacy" className="space-y-4 mt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Your Privacy Is Protected</h3>
                <p className="text-sm text-muted-foreground">
                  Your files are processed entirely in your browser. They are never uploaded to any server.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">No Server Processing</h3>
                <p className="text-sm text-muted-foreground">
                  All conversion happens locally on your device using your browser's capabilities. Your images never
                  leave your computer.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Automatic Cleanup</h3>
                <p className="text-sm text-muted-foreground">
                  For your security, all files are automatically removed from memory after 30 minutes of inactivity, or
                  when you close the browser tab.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium">Session Isolation</h3>
                <p className="text-sm text-muted-foreground">
                  Each user gets a unique session. Your files are not accessible to other users of this tool.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="how" className="space-y-4 mt-4">
            <p className="text-sm">
              This tool uses modern web technologies to convert HEIC images to JPEG, PNG, or WebP formats directly in
              your browser:
            </p>

            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                <span className="font-medium">Upload:</span> Select HEIC files from your device (they stay on your
                computer)
              </li>
              <li>
                <span className="font-medium">Preview:</span> The tool generates previews of your HEIC images
              </li>
              <li>
                <span className="font-medium">Convert:</span> When you click "Convert", your browser processes the files
                locally
              </li>
              <li>
                <span className="font-medium">Download:</span> Save the converted images to your device
              </li>
              <li>
                <span className="font-medium">Cleanup:</span> Files are removed from memory after 30 minutes or when you
                close the tab
              </li>
            </ol>

            <p className="text-sm text-muted-foreground mt-2">
              The entire process happens on your device - no server processing or file uploads required.
            </p>
          </TabsContent>

          <TabsContent value="tech" className="space-y-4 mt-4">
            <p className="text-sm">This tool is built with the following technologies:</p>

            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Next.js - React framework</li>
              <li>heic2any - JavaScript library for HEIC conversion</li>
              <li>Browser's Canvas API - For WebP conversion</li>
              <li>LocalStorage - For settings and session management</li>
              <li>JSZip - For creating ZIP archives of converted images</li>
            </ul>

            <p className="text-sm text-muted-foreground mt-2">
              All processing is done client-side using JavaScript and modern browser APIs. No server-side processing is
              involved in the conversion process.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
