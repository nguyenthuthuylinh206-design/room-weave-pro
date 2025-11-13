import { UseFormReturn } from 'react-hook-form'
import { Upload, X, Star, CheckCircle2, AlertCircle, XCircle, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useUser } from '@/hooks/useUser'
import type { RoomCheckFormData } from '@/types/rooms.types'

interface ReviewStepProps {
  form: UseFormReturn<RoomCheckFormData>
  room: any
}

export function ReviewStep({ form, room }: ReviewStepProps) {
  const { tenantId } = useUser()
  const { uploadImages, isUploading } = useImageUpload()
  const [photos, setPhotos] = useState<string[]>([])
  
  const checkType = form.watch('check_type')
  const cleanlinessScore = form.watch('cleanliness_score')
  const itemsComplete = form.watch('items_complete')
  const itemsMissing = form.watch('items_missing') || []
  const itemsDamaged = form.watch('items_damaged') || []
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !tenantId) return
    
    if (photos.length + files.length > 10) {
      toast.error('Tối đa 10 ảnh')
      return
    }
    
    try {
      const uploaded = await uploadImages(files, tenantId)
      const urls = uploaded.map(img => img.url)
      const newPhotos = [...photos, ...urls]
      
      setPhotos(newPhotos)
      form.setValue('photos', newPhotos)
      toast.success(`Đã tải lên ${uploaded.length} ảnh`)
    } catch (error) {
      toast.error('Lỗi tải ảnh lên. Vui lòng thử lại.')
      console.error('Upload error:', error)
    }
  }
  
  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index)
    setPhotos(newPhotos)
    form.setValue('photos', newPhotos)
  }
  
  const getCheckTypeLabel = () => {
    switch (checkType) {
      case 'daily': return 'Kiểm tra hàng ngày'
      case 'checkin': return 'Kiểm tra check-in'
      case 'checkout': return 'Kiểm tra check-out'
      case 'maintenance': return 'Kiểm tra bảo trì'
      default: return checkType
    }
  }
  
  return (
    <div className="space-y-6">
      {/* Cleanliness Score - Moved here */}
      <FormField
        control={form.control}
        name="cleanliness_score"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-base">Đánh giá độ sạch sẽ phòng</FormLabel>
            <div className="pt-2">
              <div className="flex items-center justify-center gap-3 mb-3">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => field.onChange(score)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 ${
                        score <= (cleanlinessScore || 0)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-center text-muted-foreground font-medium">
                {cleanlinessScore === 5 && '⭐ Rất tốt - Phòng sạch sẽ hoàn hảo'}
                {cleanlinessScore === 4 && '⭐ Tốt - Phòng sạch sẽ'}
                {cleanlinessScore === 3 && '⭐ Trung bình - Cần cải thiện'}
                {cleanlinessScore === 2 && '⚠️ Kém - Cần dọn dẹp'}
                {cleanlinessScore === 1 && '❌ Rất kém - Cần dọn dẹp ngay'}
              </p>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Summary Card */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-4">Tóm tắt kiểm tra</h3>
          
          <dl className="space-y-3">
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">Phòng</dt>
              <dd className="font-medium">{room.room_number} - {room.room_type}</dd>
            </div>
            
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">Loại kiểm tra</dt>
              <dd>
                <Badge>{getCheckTypeLabel()}</Badge>
              </dd>
            </div>
            
            <div className="flex items-center justify-between">
              <dt className="text-sm text-muted-foreground">Trạng thái đồ dùng</dt>
              <dd className="flex items-center gap-2">
                {itemsComplete ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-green-600 font-medium">Đầy đủ</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">Không đầy đủ</span>
                  </>
                )}
              </dd>
            </div>
            
            {itemsMissing.length > 0 && (
              <div className="pt-3 border-t">
                <dt className="text-sm text-muted-foreground mb-2">Đồ dùng thiếu ({itemsMissing.length} items)</dt>
                <dd className="space-y-1">
                  {itemsMissing.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <AlertCircle className="h-3 w-3 text-yellow-600" />
                      <span>{item.item_name || 'Unknown item'}</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}
            
            {itemsDamaged.length > 0 && (
              <div className="pt-3 border-t">
                <dt className="text-sm text-muted-foreground mb-2">Đồ dùng hư hỏng ({itemsDamaged.length} items)</dt>
                <dd className="space-y-1">
                  {itemsDamaged.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <XCircle className="h-3 w-3 text-red-600" />
                      <span>{item.item_name || 'Unknown item'}</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}
            
            {photos.length > 0 && (
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">Ảnh đính kèm</dt>
                <dd className="font-medium">{photos.length} ảnh</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
      
      {/* Notes */}
      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Ghi chú (tùy chọn)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Thêm ghi chú về tình trạng phòng..."
                className="min-h-[100px]"
                maxLength={1000}
                {...field}
              />
            </FormControl>
            <p className="text-sm text-muted-foreground">
              {field.value?.length || 0}/1000 ký tự
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Photo Upload */}
      <div className="space-y-3">
        <label className="text-sm font-medium">
          Ảnh (tùy chọn, tối đa 10 ảnh)
        </label>
        
        {photos.length > 0 && (
          <div className="grid grid-cols-4 gap-3">
            {photos.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="aspect-square w-full rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {photos.length < 10 && (
          <div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              id="photo-upload"
            />
            <label htmlFor="photo-upload">
              <Button
                type="button"
                variant="outline"
                disabled={isUploading}
                className="w-full"
                asChild
              >
                <div>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tải lên...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Thêm ảnh
                    </>
                  )}
                </div>
              </Button>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
