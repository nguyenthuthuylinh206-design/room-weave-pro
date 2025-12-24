import { UseFormReturn } from 'react-hook-form'
import { Upload, X, Star, CheckCircle2, AlertCircle, XCircle, Loader2, Shirt, Droplets, Tv, Armchair, Send, RefreshCw, Package, Wrench, Minus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useImageUpload } from '@/hooks/useImageUpload'
import { useUser } from '@/hooks/useUser'
import type { RoomCheckFormData, LaundryItem, ConsumedItem, LostItem, ReplacedItem } from '@/types/rooms.types'

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
  
  // New detailed tracking
  const itemsSentToLaundry = form.watch('items_sent_to_laundry') || []
  const itemsConsumed = form.watch('items_consumed') || []
  const itemsLost = form.watch('items_lost') || []
  const itemsReplaced = form.watch('items_replaced') || []
  
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

  // Calculate totals
  const totalLaundry = itemsSentToLaundry.reduce((sum, i) => sum + i.quantity, 0)
  const totalConsumed = itemsConsumed.reduce((sum, i) => sum + i.quantity, 0)
  const totalLost = itemsLost.reduce((sum, i) => sum + i.quantity, 0)
  const totalReplaced = itemsReplaced.reduce((sum, i) => sum + i.quantity, 0)
  const totalDamaged = itemsDamaged.length
  const estimatedLossValue = itemsLost.reduce((sum, i) => sum + (i.estimated_value || 0), 0)
  
  const hasActions = totalLaundry > 0 || totalConsumed > 0 || totalLost > 0 || totalReplaced > 0 || totalDamaged > 0
  
  return (
    <div className="space-y-6">
      {/* Cleanliness Score */}
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
      
      {/* Summary Card - Enhanced */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            📋 Tóm tắt kiểm tra phòng {room.room_number}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{getCheckTypeLabel()}</Badge>
            <Badge variant={itemsComplete ? 'default' : 'destructive'}>
              {itemsComplete ? (
                <><CheckCircle2 className="mr-1 h-3 w-3" /> Đầy đủ</>
              ) : (
                <><AlertCircle className="mr-1 h-3 w-3" /> Có vấn đề</>
              )}
            </Badge>
          </div>
          
          {hasActions && (
            <>
              <Separator />
              
              {/* Linen Section */}
              {(itemsSentToLaundry.length > 0 || itemsReplaced.length > 0 || itemsLost.filter(i => i.item_type === 'linen').length > 0 || itemsMissing.filter(i => i.reason === 'shortage').length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Shirt className="h-4 w-4 text-blue-600" />
                    <span>Đồ vải</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    {itemsSentToLaundry.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Send className="h-3 w-3" />
                        <span>Lấy giặt: {totalLaundry} items</span>
                        <span className="text-xs">({itemsSentToLaundry.map(i => i.item_name).join(', ')})</span>
                      </div>
                    )}
                    {itemsReplaced.length > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-3 w-3" />
                        <span>Đã thay mới: {totalReplaced} items</span>
                      </div>
                    )}
                    {itemsLost.filter(i => i.item_type === 'linen').length > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <XCircle className="h-3 w-3" />
                        <span>Mất: {itemsLost.filter(i => i.item_type === 'linen').reduce((s, i) => s + i.quantity, 0)} items</span>
                      </div>
                    )}
                    {itemsMissing.filter(i => i.reason === 'shortage').length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Minus className="h-3 w-3" />
                          <span>Thiếu đồ: {itemsMissing.filter(i => i.reason === 'shortage').reduce((s, i) => s + i.shortage, 0)} items</span>
                        </div>
                        <div className="pl-5 text-xs text-muted-foreground">
                          {itemsMissing.filter(i => i.reason === 'shortage').map((item, idx) => (
                            <span key={idx}>• {item.item_name} (thiếu {item.shortage}){idx < itemsMissing.filter(i => i.reason === 'shortage').length - 1 ? ', ' : ''}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Consumable Section */}
              {itemsConsumed.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Droplets className="h-4 w-4 text-cyan-600" />
                    <span>Đồ tiêu hao</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-3 w-3" />
                      <span>Khách đã dùng: {totalConsumed} items</span>
                    </div>
                    {itemsConsumed.filter(i => i.need_refill).length > 0 && (
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Cần bổ sung: {itemsConsumed.filter(i => i.need_refill).reduce((s, i) => s + i.quantity, 0)} items</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Equipment Section */}
              {(itemsLost.filter(i => i.item_type === 'equipment').length > 0 || itemsDamaged.length > 0) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Tv className="h-4 w-4 text-purple-600" />
                    <span>Thiết bị</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    {itemsLost.filter(i => i.item_type === 'equipment').length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-destructive">
                          <XCircle className="h-3 w-3" />
                          <span>Mất: {itemsLost.filter(i => i.item_type === 'equipment').length} items</span>
                        </div>
                        {itemsLost.filter(i => i.item_type === 'equipment' && i.estimated_value).map((item, idx) => (
                          <div key={idx} className="pl-5 text-xs text-muted-foreground">
                            • {item.item_name}: ~{item.estimated_value?.toLocaleString()}đ
                          </div>
                        ))}
                      </div>
                    )}
                    {itemsDamaged.length > 0 && (
                      <div className="flex items-center gap-2 text-warning">
                        <Wrench className="h-3 w-3" />
                        <span>Hỏng: {itemsDamaged.length} items</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Furniture Section */}
              {itemsLost.filter(i => i.item_type === 'furniture').length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Armchair className="h-4 w-4 text-amber-600" />
                    <span>Nội thất</span>
                  </div>
                  <div className="pl-6 space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-3 w-3" />
                      <span>Mất: {itemsLost.filter(i => i.item_type === 'furniture').reduce((s, i) => s + i.quantity, 0)} items</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Total Loss Value */}
              {estimatedLossValue > 0 && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-destructive">Tổng giá trị thiệt hại ước tính:</span>
                    <span className="font-bold text-destructive">{estimatedLossValue.toLocaleString()}đ</span>
                  </div>
                </>
              )}
            </>
          )}
          
          {!hasActions && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Không có vấn đề nào được ghi nhận</span>
            </div>
          )}
          
          {photos.length > 0 && (
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Ảnh đính kèm</span>
              <span className="font-medium">{photos.length} ảnh</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warning for issues */}
      {(totalLost > 0 || totalDamaged > 0) && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-destructive">Cảnh báo</p>
                <p className="text-sm text-muted-foreground">
                  Khi hoàn tất kiểm tra, hệ thống sẽ:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                  {totalLost > 0 && <li>Tạo thông báo cho quản lý về {totalLost} đồ dùng bị mất</li>}
                  {totalDamaged > 0 && <li>Tạo yêu cầu bảo trì cho {totalDamaged} thiết bị hỏng</li>}
                  {itemsSentToLaundry.length > 0 && <li>Ghi nhận {totalLaundry} đồ vải cần giặt</li>}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
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
