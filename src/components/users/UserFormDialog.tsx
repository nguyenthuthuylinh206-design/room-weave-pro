import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { userFormSchema, type UserFormData } from '@/lib/validations/user.schemas'
import { useHotels } from '@/hooks/useHotels'
import { useAvailableUserLevels } from '@/hooks/useUserLevels'
import { User } from '@/types/database.types'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

interface UserFormDialogProps {
  user?: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: UserFormData) => Promise<void>
}

export function UserFormDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
}: UserFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { data: hotels, isLoading: hotelsLoading } = useHotels({ status: 'active' })
  const { data: userLevels, isLoading: levelsLoading } = useAvailableUserLevels()

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      userLevelCode: 'staff',
      hotelId: null,
      department: null,
      status: 'active',
      notes: '',
    },
  })

  // Reset form when user changes or dialog opens
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          fullName: user.full_name,
          email: user.email,
          phone: user.phone || '',
          userLevelCode: (user.user_level_code || 'staff') as any,
          hotelId: user.hotel_id,
          department: user.department as any,
          status: user.status as any,
          notes: user.notes || '',
        })
      } else {
        form.reset({
          fullName: '',
          email: '',
          phone: '',
          userLevelCode: 'staff',
          hotelId: null,
          department: null,
          status: 'active',
          notes: '',
        })
      }
    }
  }, [open, user, form])

  const handleSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true)
      await onSubmit(data)
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedLevel = form.watch('userLevelCode')
  const needsDepartment = selectedLevel === 'manager' || selectedLevel === 'staff'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
          </DialogTitle>
          <DialogDescription>
            {user
              ? 'Cập nhật thông tin người dùng trong hệ thống'
              : 'Tạo tài khoản mới cho người dùng và phân quyền truy cập'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Họ và tên *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nguyễn Văn A" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...field}
                      disabled={!!user}
                    />
                  </FormControl>
                  {user && (
                    <p className="text-xs text-muted-foreground">
                      Email không thể thay đổi sau khi tạo
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Số điện thoại</FormLabel>
                  <FormControl>
                    <Input placeholder="0123456789" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* User Level */}
            <FormField
              control={form.control}
              name="userLevelCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cấp độ người dùng *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={levelsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn cấp độ" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {userLevels?.map((level) => (
                        <SelectItem key={level.code} value={level.code}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {levelsLoading && <LoadingSpinner size="sm" />}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Hotel */}
            <FormField
              control={form.control}
              name="hotelId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Khách sạn</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                    value={field.value || 'none'}
                    disabled={hotelsLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn khách sạn" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Không chọn khách sạn</SelectItem>
                      {hotels?.map((hotel) => (
                        <SelectItem key={hotel.id} value={hotel.id}>
                          {hotel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hotelsLoading && <LoadingSpinner size="sm" />}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department (only if role requires it) */}
            {needsDepartment && (
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bộ phận</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === 'none' ? null : value)}
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn bộ phận" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Không chọn bộ phận</SelectItem>
                        <SelectItem value="housekeeping">Buồng phòng</SelectItem>
                        <SelectItem value="laundry">Giặt là</SelectItem>
                        <SelectItem value="inventory">Kho</SelectItem>
                        <SelectItem value="maintenance">Bảo trì</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Status */}
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
                      <SelectItem value="active">Hoạt động</SelectItem>
                      <SelectItem value="inactive">Không hoạt động</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú nội bộ</FormLabel>
                  <FormControl>
                    <Input placeholder="Ghi chú về người dùng..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <div className="mr-2">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
                {user ? 'Cập nhật' : 'Tạo mới'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
