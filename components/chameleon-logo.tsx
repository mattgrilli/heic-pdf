import NextImage from "next/image"
import { cn } from "@/lib/utils"

// App icon: the mascot's head and curled tail on a forest-green tile
export function ChameleonLogo({ className }: { className?: string }) {
  return (
    <NextImage
      src="/logo.webp"
      alt=""
      width={128}
      height={128}
      priority
      className={cn("h-8 w-8", className)}
    />
  )
}
