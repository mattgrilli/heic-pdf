"use client"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Share2, Twitter, Facebook, Linkedin, Link, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function SocialShare() {
  const { toast } = useToast()
  const shareUrl = typeof window !== "undefined" ? window.location.origin : ""
  const shareTitle = "Free HEIC to JPEG/PNG Converter - No Upload Required!"
  const shareText = "Convert HEIC images to JPEG or PNG format right in your browser. No file upload needed!"

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link copied",
      description: "The link has been copied to your clipboard.",
    })
  }

  // Check if native sharing is available (mainly mobile devices)
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <div>
      {hasNativeShare ? (
        <Button variant="outline" size="sm" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                  "_blank",
                )
              }
            >
              <Twitter className="h-4 w-4 mr-2" />
              Twitter
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")
              }
            >
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                window.open(
                  `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
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
                  `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareText + "\n\n" + shareUrl)}`,
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
