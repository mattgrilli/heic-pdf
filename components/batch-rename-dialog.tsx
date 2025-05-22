"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface BatchRenameDialogProps {
  files: File[]
  isOpen: boolean
  onClose: () => void
  onRename: (newNames: { originalFile: File; newName: string }[]) => void
}

export function BatchRenameDialog({ files, isOpen, onClose, onRename }: BatchRenameDialogProps) {
  const [pattern, setPattern] = useState("{name}")
  const [patternType, setPatternType] = useState<"custom" | "sequence" | "date">("custom")
  const [startNumber, setStartNumber] = useState(1)
  const [previewNames, setPreviewNames] = useState<string[]>([])
  const [includeOriginalExtension, setIncludeOriginalExtension] = useState(true)
  const [dateFormat, setDateFormat] = useState("yyyy-MM-dd")

  // Generate preview names when pattern or files change
  useEffect(() => {
    if (!files.length) return

    const newNames = files.map((file, index) => {
      const fileName = file.name.replace(/\.[^/.]+$/, "") // Remove extension
      const fileExt = file.name.split(".").pop() || "heic"
      const now = new Date()

      let newName = pattern

      if (patternType === "sequence") {
        const sequenceNumber = startNumber + index
        newName = `${pattern}-${sequenceNumber.toString().padStart(2, "0")}`
      } else if (patternType === "date") {
        // Format date based on dateFormat
        const year = now.getFullYear()
        const month = (now.getMonth() + 1).toString().padStart(2, "0")
        const day = now.getDate().toString().padStart(2, "0")
        const hours = now.getHours().toString().padStart(2, "0")
        const minutes = now.getMinutes().toString().padStart(2, "0")

        const formattedDate = dateFormat
          .replace("yyyy", year.toString())
          .replace("MM", month)
          .replace("dd", day)
          .replace("HH", hours)
          .replace("mm", minutes)

        newName = `${pattern}-${formattedDate}`
      }

      // Replace placeholders
      newName = newName
        .replace("{name}", fileName)
        .replace("{index}", (index + 1).toString())
        .replace("{index2}", (index + 1).toString().padStart(2, "0"))
        .replace("{index3}", (index + 1).toString().padStart(3, "0"))

      // Add original extension if needed
      if (includeOriginalExtension) {
        newName = `${newName}.${fileExt}`
      } else {
        newName = newName
      }

      return newName
    })

    setPreviewNames(newNames)
  }, [files, pattern, patternType, startNumber, includeOriginalExtension, dateFormat])

  const handleSubmit = () => {
    const renamedFiles = files.map((file, index) => ({
      originalFile: file,
      newName: previewNames[index].replace(/\.[^/.]+$/, ""), // Remove extension for storage
    }))
    onRename(renamedFiles)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Rename Files</DialogTitle>
          <DialogDescription>
            Rename multiple files at once using patterns. Preview the results below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <RadioGroup
            value={patternType}
            onValueChange={(value) => setPatternType(value as any)}
            className="grid grid-cols-3 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Custom Pattern</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="sequence" id="sequence" />
              <Label htmlFor="sequence">Sequential</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="date" id="date" />
              <Label htmlFor="date">Date-based</Label>
            </div>
          </RadioGroup>

          <div className="grid gap-4">
            {patternType === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="pattern">Pattern</Label>
                <Input
                  id="pattern"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="e.g., vacation-{index}"
                />
                <p className="text-xs text-muted-foreground">
                  Available placeholders: {"{name}"} - original filename, {"{index}"} - number, {"{index2}"} - number
                  with leading zero
                </p>
              </div>
            )}

            {patternType === "sequence" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g., vacation"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startNumber">Start Number</Label>
                  <Input
                    id="startNumber"
                    type="number"
                    min="0"
                    value={startNumber}
                    onChange={(e) => setStartNumber(Number.parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>
            )}

            {patternType === "date" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    value={pattern}
                    onChange={(e) => setPattern(e.target.value)}
                    placeholder="e.g., photo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <select
                    id="dateFormat"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={dateFormat}
                    onChange={(e) => setDateFormat(e.target.value)}
                  >
                    <option value="yyyy-MM-dd">yyyy-MM-dd</option>
                    <option value="yyyyMMdd">yyyyMMdd</option>
                    <option value="dd-MM-yyyy">dd-MM-yyyy</option>
                    <option value="yyyy-MM-dd-HH-mm">yyyy-MM-dd-HH-mm</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="keepExtension"
                checked={includeOriginalExtension}
                onCheckedChange={(checked) => setIncludeOriginalExtension(!!checked)}
              />
              <Label htmlFor="keepExtension">Keep original file extension</Label>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Preview</h3>
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Original Name</TableHead>
                    <TableHead>New Name</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.slice(0, 5).map((file, index) => (
                    <TableRow key={index}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">{file.name}</TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]">{previewNames[index]}</TableCell>
                    </TableRow>
                  ))}
                  {files.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        {files.length - 5} more files...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Rename {files.length} Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
