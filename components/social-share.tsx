"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Share2, Twitter, Facebook, Linkedin, Link, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SocialShare() {
  const { toast } = useToast()
  const shareTitle = "Free Image Converter & Compressor - No Upload Required!"
  const shareText = "Convert and compress HEIC, JPEG, PNG, and WebP images right in your browser. No file upload needed!"

  const shareUrl = () => window.location.origin

  // Decide which share UI to show only after mount — the server can't know
  // whether the browser supports navigator.share, and branching during SSR
  // causes a hydration mismatch
  const [hasNativeShare, setHasNativeShare] = useState(false)
  useEffect(() => {
    setHasNativeShare(!!navigator.share)
  }, [])

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl(),
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl())
    toast({
      title: "Link copied",
      description: "The link has been copied to your clipboard.",
    })
  }

  return (
    <div>
      {hasNativeShare ? (
        <Button variant="ghost" size="icon" onClick={handleShare} title="Share">
          <Share2 className="h-4 w-4" />
          <span className="sr-only">Share</span>
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" title="Share">
              <Share2 className="h-4 w-4" />
              <span className="sr-only">Share</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl())}`,
                  "_blank",
                )
              }
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`, "_blank")
              }
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`,
                  "_blank",
                )
              }
            >
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl())}`,
                  "_blank",
                )
              }
            >
              <Mail className="h-4 w-4 mr-2" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={copyToClipboard}>
              <Link className="h-4 w-4 mr-2" />
              Copy Link
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
