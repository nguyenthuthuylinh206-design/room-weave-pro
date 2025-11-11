import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuotaCheck } from '@/hooks/useQuotaCheck'
import { QuotaExceededDialog } from '@/components/settings/usage/QuotaExceededDialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Hotel, HotelFormData, useCreateHotel, useUpdateHotel } from '@/hooks/useHotels'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUsers } from '@/hooks/useUsers'

const hotelSchema = z.object({
  code: z.string()
    .min(2, 'Mã phải có ít nhất 2 ký tự')
    .max(20, 'Mã không được quá 20 ký tự')
    .regex(/^[A-Z0-9-]+$/, 'Mã chỉ được chứa chữ in hoa, số và dấu gạch ngang'),
  name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  type: z.enum(['hotel', 'resort', 'apartment', 'hostel', 'other']),
  city: z.string().min(1, 'Thành phố là bắt buộc'),
  country: z.string().min(1, 'Quốc gia là bắt buộc'),
  total_rooms: z.coerce.number().min(1, 'Phải có ít nhất 1 phòng'),
  total_floors: z.coerce.number().min(1, 'Phải có ít nhất 1 tầng'),
  status: z.enum(['active', 'inactive', 'maintenance']),
  
  // Optional fields
  address: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  website: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  manager_id: z.string().optional(),
  description: z.string().optional(),
})

interface HotelFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hotel?: Hotel | null
}

export function HotelFormDialog({ open, onOpenChange, hotel }: HotelFormDialogProps) {
  const [step, setStep] = useState(1)
  const createHotel = useCreateHotel()
  const updateHotel = useUpdateHotel()
  const { users } = useUsers()
  const quotaCheck = useQuotaCheck('hotel')

  // Filter managers from users
  const managers = users?.filter(u => 
    u.role === 'hotel_manager' || u.role === 'owner' || u.role === 'super_admin'
  ) || []

  const form = useForm<HotelFormData>({
    resolver: zodResolver(hotelSchema),
    defaultValues: {
      code: hotel?.code || '',
      name: hotel?.name || '',
      type: hotel?.type || 'hotel',
      city: hotel?.city || '',
      country: hotel?.country || 'Việt Nam',
      total_rooms: hotel?.total_rooms || 1,
      total_floors: hotel?.total_floors || 1,
      description: hotel?.description || '',
      status: hotel?.status || 'active',
      address: hotel?.address || '',
      state: hotel?.state || '',
      postal_code: hotel?.postal_code || '',
      phone: hotel?.phone || '',
      email: hotel?.email || '',
      website: hotel?.website || '',
      manager_id: hotel?.manager_id || undefined,
    },
  })

  useEffect(() => {
    if (open && hotel) {
      form.reset({
        code: hotel.code,
        name: hotel.name,
        type: hotel.type,
        city: hotel.city || '',
        country: hotel.country,
        total_rooms: hotel.total_rooms,
        total_floors: hotel.total_floors,
        description: hotel.description || '',
        status: hotel.status,
        address: hotel.address || '',
        state: hotel.state || '',
        postal_code: hotel.postal_code || '',
        phone: hotel.phone || '',
        email: hotel.email || '',
        website: hotel.website || '',
        manager_id: hotel.manager_id || undefined,
      })
    } else if (open && !hotel) {
      form.reset({
        code: '',
        name: '',
        type: 'hotel',
        city: '',
        country: 'Việt Nam',
        total_rooms: 1,
        total_floors: 1,
        description: '',
        status: 'active',
        address: '',
        state: '',
        postal_code: '',
        phone: '',
        email: '',
        website: '',
        manager_id: undefined,
      })
    }
  }, [open, hotel, form])

  const onSubmit = async (data: HotelFormData) => {
    // Check quota for new hotels
    if (!hotel && !quotaCheck.checkQuota()) {
      return
    }

    if (hotel) {
      await updateHotel.mutateAsync({ id: hotel.id, data })
    } else {
      await createHotel.mutateAsync(data)
    }
    onOpenChange(false)
    setStep(1)
  }

  const handleClose = () => {
    onOpenChange(false)
    setStep(1)
  }

  const nextStep = async () => {
    const fields = getStepFields(step)
    const valid = await form.trigger(fields as any)
    if (valid) setStep(step + 1)
  }

  const prevStep = () => setStep(step - 1)

  const getStepFields = (currentStep: number): string[] => {
    switch (currentStep) {
      case 1:
        return ['code', 'name', 'type', 'city', 'country']
      case 2:
        return ['total_rooms', 'total_floors', 'status']
      default:
        return []
    }
  }

  const totalSteps = 2
  const progress = (step / totalSteps) * 100

  return (
    <>
      <QuotaExceededDialog
        open={quotaCheck.showDialog}
        onOpenChange={quotaCheck.setShowDialog}
        resourceType="hotel"
        currentUsage={quotaCheck.currentUsage}
        limit={quotaCheck.limit}
      />
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{hotel ? 'Chỉnh sửa Khách sạn' : 'Thêm Khách sạn Mới'}</DialogTitle>
          <DialogDescription>
            {!hotel && `Bước ${step} / ${totalSteps}`}
          </DialogDescription>
        </DialogHeader>

        {!hotel && <Progress value={progress} className="h-2" />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 1: Thông tin cơ bản */}
            {step === 1 && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã Khách sạn *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="VD: HN01, SGN-01, DA001" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>
                        Mã gồm 2-20 ký tự (chữ in hoa, số, dấu gạch ngang)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên Khách sạn *</FormLabel>
                      <FormControl>
                        <Input placeholder="Grand Hotel Hanoi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loại hình *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại hình" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="hotel">Khách sạn</SelectItem>
                          <SelectItem value="resort">Resort</SelectItem>
                          <SelectItem value="apartment">Căn hộ</SelectItem>
                          <SelectItem value="hostel">Hostel</SelectItem>
                          <SelectItem value="other">Khác</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thành phố *</FormLabel>
                        <FormControl>
                          <Input placeholder="Hà Nội" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quốc gia *</FormLabel>
                        <FormControl>
                          <Input placeholder="Việt Nam" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Quy mô & Trạng thái */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="total_rooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tổng số Phòng *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="total_floors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tổng số Tầng *</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Trạng thái *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn trạng thái" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Đang hoạt động</SelectItem>
                          <SelectItem value="inactive">Tạm ngưng</SelectItem>
                          <SelectItem value="maintenance">Bảo trì</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              {step > 1 && !hotel && (
                <Button type="button" variant="outline" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
              )}
              {step < totalSteps && !hotel && (
                <Button type="button" onClick={nextStep} className="ml-auto">
                  Tiếp theo
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
              {(step === totalSteps || hotel) && (
                <Button
                  type="submit"
                  disabled={createHotel.isPending || updateHotel.isPending}
                  className={!hotel && step > 1 ? 'ml-auto' : ''}
                >
                  {hotel ? 'Cập nhật' : 'Tạo'} Khách sạn
                </Button>
              )}
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    </>
  )
}
