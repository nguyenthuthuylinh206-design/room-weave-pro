import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUser } from '@/hooks/useUser'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Building2, Briefcase, Lock, Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Xác nhận mật khẩu phải có ít nhất 6 ký tự'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
})

type ProfileFormData = z.infer<typeof profileSchema>
type PasswordFormData = z.infer<typeof passwordSchema>

export const MobileUserProfilePage = () => {
  const navigate = useNavigate()
  const { user, refetch } = useUser()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  })

  const onUpdateProfile = async (data: ProfileFormData) => {
    if (!user?.id) return

    setIsUpdating(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: data.full_name,
          email: data.email,
        })
        .eq('id', user.id)

      if (error) throw error

      await refetch()
      toast.success('Cập nhật thông tin thành công!')
    } catch (error) {
      toast.error('Lỗi khi cập nhật thông tin')
    } finally {
      setIsUpdating(false)
    }
  }

  const onChangePassword = async (data: PasswordFormData) => {
    setIsChangingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (error) throw error

      resetPassword()
      toast.success('Đổi mật khẩu thành công!')
    } catch (error) {
      toast.error('Lỗi khi đổi mật khẩu')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Thông tin cá nhân"
        onBack={() => navigate('/settings')}
      />

      <div className="p-4 space-y-4">
        {/* Current Info Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Thông tin hiện tại
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cấp bậc:</span>
              <Badge variant="secondary">{user?.user_level_code}</Badge>
            </div>
            {user?.hotel_id && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Khách sạn:</span>
                <span className="font-medium text-xs">{user.hotel_id}</span>
              </div>
            )}
            {user?.position_id && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Vị trí:</span>
                <span className="font-medium text-xs">{user.position_id}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Cập nhật thông tin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Họ và tên</Label>
                <Input
                  id="full_name"
                  placeholder="Nguyễn Văn A"
                  {...registerProfile('full_name')}
                />
                {profileErrors.full_name && (
                  <p className="text-xs text-destructive">{profileErrors.full_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  {...registerProfile('email')}
                />
                {profileErrors.email && (
                  <p className="text-xs text-destructive">{profileErrors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isUpdating}
              >
                <Save className="h-4 w-4 mr-2" />
                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Đổi mật khẩu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Mật khẩu mới</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...registerPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...registerPassword('confirmPassword')}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                disabled={isChangingPassword}
              >
                <Lock className="h-4 w-4 mr-2" />
                {isChangingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
