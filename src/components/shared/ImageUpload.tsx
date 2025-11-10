import { useState } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  className?: string
}

export function ImageUpload({ images, onChange, maxImages = 5, className }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }
  
  const handleFiles = (files: File[]) => {
    const remainingSlots = maxImages - images.length
    const filesToProcess = files.slice(0, remainingSlots)
    
    filesToProcess.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        onChange([...images, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  
  const handleDragLeave = () => {
    setIsDragging(false)
  }
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }
  
  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square">
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {images.length < maxImages && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="flex cursor-pointer flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">Tải ảnh lên</p>
              <p className="text-xs text-muted-foreground">
                Kéo thả hoặc nhấp để chọn ({images.length}/{maxImages})
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}
