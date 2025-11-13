import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save } from 'lucide-react'
import { useQuotaCheck } from '@/hooks/useQuotaCheck'
import { QuotaExceededDialog } from '@/components/settings/usage/QuotaExceededDialog'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useRoom, useCreateRoom, useUpdateRoom } from '@/hooks/useRooms'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { HotelBadge } from '@/components/layout/HotelBadge'
import { toast } from 'sonner'

const roomSchema = z.object({
  room_number: z.string().min(1, 'Số phòng là bắt buộc'),
  room_type: z.string().min(1, 'Loại phòng là bắt buộc'),
  floor: z.number().min(1, 'Tầng phải >= 1'),
  area_sqm: z.number().min(0, 'Diện tích phải >= 0').optional(),
  max_guests: z.number().min(1, 'Số khách tối đa phải >= 1'),
  base_price: z.number().min(0, 'Giá cơ bản phải >= 0'),
  bed_type: z.string().optional(),
  view_type: z.string().optional(),
  has_window: z.boolean(),
  has_balcony: z.boolean(),
  smoking_allowed: z.boolean(),
  notes: z.string().optional(),
})

type RoomFormData = z.infer<typeof roomSchema>

export function RoomFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: room, isLoading: roomLoading } = useRoom(id)
  const createRoom = useCreateRoom()
  const updateRoom = useUpdateRoom()
  const quotaCheck = useQuotaCheck('room')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      max_guests: 2,
      base_price: 0,
      has_window: true,
      has_balcony: false,
      smoking_allowed: false,
    },
  })

  useEffect(() => {
    if (room && isEdit) {
      // Normalize values to lowercase to match Select options
      // Return undefined for null/empty values so Select shows placeholder
      const normalizeValue = (value: string | null | undefined) => {
        if (!value) return undefined
        return value.toLowerCase()
      }

      reset({
        room_number: room.room_number || '',
        room_type: normalizeValue(room.room_type) as any,
        floor: room.floor || 1,
        area_sqm: room.area_sqm || undefined,
        max_guests: room.max_guests || 2,
        base_price: room.base_price || 0,
        bed_type: normalizeValue(room.bed_type) as any,
        view_type: normalizeValue(room.view_type) as any,
        has_window: room.has_window ?? true,
        has_balcony: room.has_balcony ?? false,
        smoking_allowed: room.smoking_allowed ?? false,
        notes: room.notes || '',
      })
    }
  }, [room, isEdit, reset])

  const onSubmit = async (data: RoomFormData) => {
    // Prevent creation when in All Hotels mode
    if (isAllHotelsMode) {
      toast.error('Vui lòng chọn một khách sạn cụ thể trước khi tạo phòng')
      return
    }

    // Check if hotel is selected
    if (!selectedHotel?.id) {
      toast.error('Vui lòng chọn khách sạn trước khi tạo phòng')
      return
    }

    // Check quota for new rooms
    if (!isEdit && !quotaCheck.checkQuota()) {
      return
    }

    // Check for duplicate room numbers in the same hotel
    const { data: existingRooms, error: checkError } = await supabase
      .from('rooms')
      .select('id, room_number')
      .eq('hotel_id', selectedHotel.id)
      .eq('room_number', data.room_number)

    if (checkError) {
      toast.error('Lỗi kiểm tra số phòng trùng lặp')
      return
    }

    // If editing, exclude current room from duplicate check
    const duplicateExists = isEdit 
      ? existingRooms?.some(r => r.id !== id)
      : existingRooms && existingRooms.length > 0

    if (duplicateExists) {
      toast.error(`Số phòng "${data.room_number}" đã tồn tại trong khách sạn này`)
      return
    }

    try {
      if (isEdit) {
        await updateRoom.mutateAsync({
          id: id!,
          data: {
            ...data,
            updated_at: new Date().toISOString(),
          },
        })
        // Navigate back to detail page after editing
        navigate(`/rooms/${id}`)
      } else {
        const newRoom = await createRoom.mutateAsync({
          ...data,
          tenant_id: tenantId,
          hotel_id: selectedHotel.id,
          status: 'vacant',
          amenities: [],
        })
        // Navigate to new room detail page after creating
        navigate(`/rooms/${newRoom.id}`)
      }
    } catch (error) {
      // Error handled by mutation
    }
  }

  if (roomLoading && isEdit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Đang tải...</h1>
        </div>
      </div>
    )
  }

  return (
    <>
      <QuotaExceededDialog
        open={quotaCheck.showDialog}
        onOpenChange={quotaCheck.setShowDialog}
        resourceType="room"
        currentUsage={quotaCheck.currentUsage}
        limit={quotaCheck.limit}
      />
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {isEdit ? 'Chỉnh sửa phòng' : 'Thêm phòng mới'}
            </h1>
            <p className="text-muted-foreground">
              {isEdit ? 'Cập nhật thông tin phòng' : 'Nhập thông tin phòng mới'}
            </p>
          </div>
          <HotelBadge />
        </div>

        {/* Alert for All Hotels Mode */}
        {isAllHotelsMode && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn đang ở chế độ xem tất cả khách sạn. Vui lòng chọn một khách sạn cụ thể để tạo phòng mới.
            </AlertDescription>
          </Alert>
        )}

        {!isAllHotelsMode && !selectedHotel && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Chưa chọn khách sạn. Vui lòng chọn khách sạn từ menu trên cùng.
            </AlertDescription>
          </Alert>
        )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cơ bản</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="room_number">Số phòng *</Label>
                <Input id="room_number" {...register('room_number')} />
                {errors.room_number && (
                  <p className="text-sm text-destructive">{errors.room_number.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room_type">Loại phòng *</Label>
                <Select
                  value={watch('room_type')}
                  onValueChange={(value) => setValue('room_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại phòng..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="deluxe">Deluxe</SelectItem>
                    <SelectItem value="suite">Suite</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                  </SelectContent>
                </Select>
                {errors.room_type && (
                  <p className="text-sm text-destructive">{errors.room_type.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="floor">Tầng *</Label>
                <Input
                  id="floor"
                  type="number"
                  {...register('floor', { valueAsNumber: true })}
                />
                {errors.floor && (
                  <p className="text-sm text-destructive">{errors.floor.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area_sqm">Diện tích (m²)</Label>
                <Input
                  id="area_sqm"
                  type="number"
                  step="0.01"
                  {...register('area_sqm', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_guests">Số khách tối đa *</Label>
                <Input
                  id="max_guests"
                  type="number"
                  {...register('max_guests', { valueAsNumber: true })}
                />
                {errors.max_guests && (
                  <p className="text-sm text-destructive">{errors.max_guests.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="base_price">Giá cơ bản (₫) *</Label>
                <Input
                  id="base_price"
                  type="number"
                  step="0.01"
                  {...register('base_price', { valueAsNumber: true })}
                />
                {errors.base_price && (
                  <p className="text-sm text-destructive">{errors.base_price.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chi tiết phòng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bed_type">Loại giường</Label>
                <Select
                  value={watch('bed_type')}
                  onValueChange={(value) => setValue('bed_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại giường..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Đơn</SelectItem>
                    <SelectItem value="double">Đôi</SelectItem>
                    <SelectItem value="queen">Queen</SelectItem>
                    <SelectItem value="king">King</SelectItem>
                    <SelectItem value="twin">Twin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="view_type">Hướng nhìn</Label>
                <Select
                  value={watch('view_type')}
                  onValueChange={(value) => setValue('view_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn hướng nhìn..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="city">Thành phố</SelectItem>
                    <SelectItem value="sea">Biển</SelectItem>
                    <SelectItem value="mountain">Núi</SelectItem>
                    <SelectItem value="garden">Vườn</SelectItem>
                    <SelectItem value="pool">Hồ bơi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_window"
                  checked={watch('has_window')}
                  onCheckedChange={(checked) => setValue('has_window', !!checked)}
                />
                <Label htmlFor="has_window" className="cursor-pointer">
                  Có cửa sổ
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has_balcony"
                  checked={watch('has_balcony')}
                  onCheckedChange={(checked) => setValue('has_balcony', !!checked)}
                />
                <Label htmlFor="has_balcony" className="cursor-pointer">
                  Có ban công
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="smoking_allowed"
                  checked={watch('smoking_allowed')}
                  onCheckedChange={(checked) => setValue('smoking_allowed', !!checked)}
                />
                <Label htmlFor="smoking_allowed" className="cursor-pointer">
                  Cho phép hút thuốc
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Ghi chú</Label>
              <Textarea id="notes" {...register('notes')} rows={3} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => navigate('/rooms')}>
            Hủy
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting || isAllHotelsMode || !selectedHotel}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Đang lưu...' : isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </form>
    </div>
    </>
  )
}
