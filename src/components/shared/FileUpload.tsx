import { useState } from 'react'
import { FileText, X, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  files: string[]
  onChange: (files: string[]) => void
  maxFiles?: number
  accept?: string
}

export function FileUpload({ 
  files, 
  onChange, 
  maxFiles = 5,
  accept = ".pdf,.doc,.docx,.xls,.xlsx"
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleRemove = (index: number) => {
    onChange(files.filter((_, i) => i !== index))
  }
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    // TODO: Upload files to storage and get URLs
    console.log('Upload files:', selectedFiles)
    // For now, just add dummy URLs
    const newFiles = selectedFiles.map(f => URL.createObjectURL(f))
    onChange([...files, ...newFiles].slice(0, maxFiles))
  }
  
  return (
    <div className="space-y-4">
      {files.length > 0 && (
        <div className="grid gap-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border p-3"
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">
                Tài liệu {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {files.length < maxFiles && (
        <div
          className={cn(
            "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-border"
          )}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            // Handle file drop
          }}
        >
          <input
            type="file"
            accept={accept}
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
          <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Kéo thả file hoặc click để chọn
          </p>
          <p className="text-xs text-muted-foreground">
            Tối đa {maxFiles} files
          </p>
        </div>
      )}
    </div>
  )
}
