import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { compressImage } from '@/lib/imageCompression'
import { toast } from 'sonner'

interface ImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  maxImages?: number
  className?: string
}

export function ImageUpload({ images, onChange, maxImages = 5, className }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }
  
  const handleFiles = async (files: File[]) => {
    const remainingSlots = maxImages - images.length
    const filesToProcess = files.slice(0, remainingSlots)
    
    if (filesToProcess.length === 0) return
    
    setIsCompressing(true)
    const compressedImages: string[] = []
    
    try {
      for (const file of filesToProcess) {
        // Kiểm tra loại file
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} không phải là file ảnh`)
          continue
        }
        
        // Nén và resize ảnh: quality 0.7, max 1200x1200px
        const compressed = await compressImage(file, 0.7, 1200, 1200)
        compressedImages.push(compressed)
      }
      
      onChange([...images, ...compressedImages])
      
      if (compressedImages.length > 0) {
        toast.success(`Đã tải lên ${compressedImages.length} ảnh (tối đa 1200x1200px)`)
      }
    } catch (error) {
      console.error('Error compressing images:', error)
      toast.error('Lỗi khi xử lý ảnh')
    } finally {
      setIsCompressing(false)
    }
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
            isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            isCompressing && 'pointer-events-none opacity-50'
          )}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
            id="image-upload"
            disabled={isCompressing}
          />
          <label htmlFor="image-upload" className="flex cursor-pointer flex-col items-center gap-2">
            {isCompressing ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {isCompressing ? 'Đang nén ảnh...' : 'Tải ảnh lên'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isCompressing 
                  ? 'Vui lòng đợi...' 
                  : `Kéo thả hoặc nhấp để chọn (${images.length}/${maxImages})`
                }
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  )
}
