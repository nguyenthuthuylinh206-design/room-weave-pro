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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { userFormSchema, type UserFormData } from '@/lib/validations/user.schemas'
import { useHotels } from '@/hooks/useHotels'
import { useAvailableUserLevels } from '@/hooks/useUserLevels'
import { usePositions } from '@/hooks/usePositions'
import { useUser } from '@/hooks/useUser'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Eye, EyeOff, Info } from 'lucide-react'
import { UserWithRelations } from '@/types/database.types'

interface UserFormDialogProps {
  user?: UserWithRelations | null
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
  const [showPassword, setShowPassword] = useState(false)
  const { data: hotels, isLoading: hotelsLoading } = useHotels({ status: 'active' })
  const { data: userLevels, isLoading: levelsLoading } = useAvailableUserLevels()
  const { user: currentUser } = useUser()

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      userLevelCode: 'staff',
      hotelId: null,
      positionId: null,
    },
  })
  
  const selectedLevel = form.watch('userLevelCode')
  const { data: positions } = usePositions(
    selectedLevel === 'tenant_owner' ? undefined : selectedLevel as 'manager' | 'staff'
  )

  // Determine available user levels based on current user's level
  const getAvailableUserLevels = () => {
    if (!currentUser) return []
    
    const currentUserLevel = currentUser.user_level_code
    
    if (currentUserLevel === 'tenant_owner') {
      return userLevels?.filter(l => l.code === 'manager' || l.code === 'staff') || []
    } else if (currentUserLevel === 'manager') {
      return userLevels?.filter(l => l.code === 'manager' || l.code === 'staff') || []
    } else {
      return []
    }
  }

  const availableUserLevels = getAvailableUserLevels()

  // Reset form when dialog opens
  useEffect(() => {
    if (open && !user) {
      form.reset({
        fullName: '',
        email: '',
        password: '',
        userLevelCode: 'staff',
        hotelId: null,
        positionId: null,
      })
    }
  }, [open, user, form])

  // Check if hotel is required
  const isHotelRequired = selectedLevel === 'manager'

  // Check if position is required
  const isPositionRequired = selectedLevel === 'manager' || selectedLevel === 'staff'

  const handleFormSubmit = async (data: UserFormData) => {
    // Validate hotel requirement
    if (isHotelRequired && !data.hotelId) {
      form.setError('hotelId', {
        type: 'manual',
        message: 'Quản lý phải được gán cho một khách sạn',
      })
      return
    }

    // Validate position requirement
    if (isPositionRequired && !data.positionId) {
      form.setError('positionId', {
        type: 'manual',
        message: 'Vui lòng chọn chức vụ',
      })
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(data)
      onOpenChange(false)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getLevelLabel = (code: string) => {
    switch (code) {
      case 'tenant_owner':
        return 'Chủ sở hữu'
      case 'manager':
        return 'Quản lý'
      case 'staff':
        return 'Nhân viên'
      default:
        return code
    }
  }

  const getLevelDescription = (code: string) => {
    switch (code) {
      case 'manager':
        return 'Quản lý khách sạn và giám sát nhân viên'
      case 'staff':
        return 'Nhân viên thực hiện công việc hàng ngày'
      default:
        return ''
    }
  }

  if (levelsLoading || hotelsLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {user ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
            </DialogTitle>
            <DialogDescription>
              {user 
                ? 'Cập nhật thông tin người dùng' 
                : 'Tạo tài khoản mới cho người dùng và phân quyền truy cập'
              }
            </DialogDescription>
          </DialogHeader>

          {currentUser && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Người dùng mới sẽ báo cáo cho: <strong>{currentUser.full_name}</strong>
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ và tên *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nhập họ và tên" {...field} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password - only for new users */}
              {!user && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mật khẩu *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Nhập mật khẩu"
                            {...field}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* User Level */}
              <FormField
                control={form.control}
                name="userLevelCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cấp bậc *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!user}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cấp bậc" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUserLevels.map((level) => (
                          <SelectItem key={level.code} value={level.code}>
                            <div className="flex flex-col">
                              <span className="font-medium">{getLevelLabel(level.code)}</span>
                              {getLevelDescription(level.code) && (
                                <span className="text-xs text-muted-foreground">
                                  {getLevelDescription(level.code)}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hotel - Required for managers */}
              <FormField
                control={form.control}
                name="hotelId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Khách sạn {isHotelRequired && '*'}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn khách sạn" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {hotels?.map((hotel) => (
                          <SelectItem key={hotel.id} value={hotel.id}>
                            {hotel.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Position - Required for managers and staff */}
              <FormField
                control={form.control}
                name="positionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Chức vụ {isPositionRequired && '*'}
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                      disabled={!selectedLevel || selectedLevel === 'tenant_owner'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chức vụ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions?.map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Hủy
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Đang xử lý...' : user ? 'Cập nhật' : 'Tạo người dùng'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
