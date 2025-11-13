import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuotaCheck } from '@/hooks/useQuotaCheck'
import { QuotaExceededDialog } from '@/components/settings/usage/QuotaExceededDialog'
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
  FormDescription
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
import { Info, AlertCircle, Crown, Users as UsersIcon, UserCheck, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  const { data: hotels, isLoading: hotelsLoading } = useHotels({ status: 'active' })
  const { data: userLevels, isLoading: levelsLoading } = useAvailableUserLevels()
  const { user: currentUser } = useUser()
  const quotaCheck = useQuotaCheck('user')

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      userLevelCode: 'staff',
      hotelId: null,
      positionId: null,
      department: null,
      status: 'active',
      notes: '',
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
      // Owner can create manager and staff
      return userLevels?.filter(l => l.code === 'manager' || l.code === 'staff') || []
    } else if (currentUserLevel === 'manager') {
      // Manager can create manager and staff
      return userLevels?.filter(l => l.code === 'manager' || l.code === 'staff') || []
    } else {
      // Staff cannot create users
      return []
    }
  }

  const availableUserLevels = getAvailableUserLevels()

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
    // Check quota for new users
    if (!user) {
      const canProceed = await quotaCheck.checkQuota()
      
      if (!canProceed) {
        return
      }
    }

    try {
      setIsSubmitting(true)
      await onSubmit(data)
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      // Check if it's a quota error from database
      if (error?.message?.includes('Quota exceeded')) {
        quotaCheck.setShowDialog(true)
      }
      console.error('Submit error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const needsPosition = selectedLevel === 'manager' || selectedLevel === 'staff'
  const needsHotel = selectedLevel === 'manager'

  const getUserLevelIcon = (code: string) => {
    switch (code) {
      case 'tenant_owner':
        return <Crown className="h-4 w-4 text-yellow-500" />
      case 'manager':
        return <UsersIcon className="h-4 w-4 text-green-500" />
      case 'staff':
        return <UserCheck className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  const getUserLevelDescription = (code: string) => {
    switch (code) {
      case 'manager':
        return 'Quản lý có thể tạo Quản lý khác và Nhân viên, quản lý khách sạn'
      case 'staff':
        return 'Nhân viên thực hiện công việc hàng ngày'
      default:
        return ''
    }
  }

  return (
    <>
      <QuotaExceededDialog
        open={quotaCheck.showDialog}
        onOpenChange={quotaCheck.setShowDialog}
        resourceType="user"
        currentUsage={quotaCheck.currentUsage}
        limit={quotaCheck.limit}
      />
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

          {/* Hierarchy hint */}
          {!user && currentUser && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Người dùng mới sẽ báo cáo cho: <strong>{currentUser.full_name}</strong>
              </AlertDescription>
            </Alert>
          )}

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
                      <FormDescription className="text-xs">
                        Email không thể thay đổi sau khi tạo
                      </FormDescription>
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
                    <FormLabel className="flex items-center gap-2">
                      Cấp bậc *
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-2 text-sm">
                              <p className="font-semibold">Hệ thống phân cấp:</p>
                              <div>👑 <strong>Chủ sở hữu:</strong> Toàn quyền trong hệ thống</div>
                              <div>👥 <strong>Quản lý:</strong> Quản lý khách sạn, tạo Quản lý và Nhân viên</div>
                              <div>👤 <strong>Nhân viên:</strong> Thực hiện công việc hàng ngày</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={levelsLoading || !!user}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cấp bậc" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableUserLevels.map((level) => (
                          <SelectItem key={level.code} value={level.code}>
                            <div className="flex items-center gap-2">
                              {getUserLevelIcon(level.code)}
                              {level.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedLevel && !user && (
                      <FormDescription className="flex items-start gap-2 text-xs">
                        <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{getUserLevelDescription(selectedLevel)}</span>
                      </FormDescription>
                    )}
                    {!user && currentUser && (
                      <FormDescription className="text-xs">
                        Người này sẽ báo cáo cho: <strong>{currentUser.full_name}</strong>
                      </FormDescription>
                    )}
                    {levelsLoading && <LoadingSpinner size="sm" />}
                    {user && (
                      <FormDescription className="text-xs">
                        Cấp bậc không thể thay đổi sau khi tạo
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hotel - Required for Manager */}
              {(selectedLevel === 'manager' || selectedLevel === 'staff') && (
                <FormField
                  control={form.control}
                  name="hotelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Khách sạn {selectedLevel === 'manager' && '*'}
                        {selectedLevel === 'manager' && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-sm">Quản lý phải được gán cho một khách sạn cụ thể</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                        disabled={hotelsLoading}
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
                      {selectedLevel === 'manager' && (
                        <FormDescription className="text-xs">
                          Người dùng sẽ quản lý khách sạn được chọn
                        </FormDescription>
                      )}
                      {hotelsLoading && <LoadingSpinner size="sm" />}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Position - Required for Manager and Staff */}
              {needsPosition && (
                <FormField
                  control={form.control}
                  name="positionId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chức vụ</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
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
              )}

              {/* Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trạng thái</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Đang xử lý...</span>
                    </>
                  ) : user ? (
                    'Cập nhật'
                  ) : (
                    'Tạo người dùng'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  )
}
