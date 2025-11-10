import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTenant } from '@/hooks/useTenant'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const generalSettingsSchema = z.object({
  name: z.string().min(2, 'Tên công ty phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  settings: z.object({
    timezone: z.string().default('Asia/Ho_Chi_Minh'),
    language: z.enum(['vi', 'en']).default('vi'),
    currency: z.string().default('VND'),
    date_format: z.string().default('DD/MM/YYYY'),
  }),
})

type GeneralSettingsForm = z.infer<typeof generalSettingsSchema>

export function GeneralSettingsPage() {
  const { tenant, isLoading } = useTenant()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<GeneralSettingsForm>({
    resolver: zodResolver(generalSettingsSchema),
    values: tenant ? {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone || '',
      settings: {
        timezone: (tenant.settings as any)?.timezone || 'Asia/Ho_Chi_Minh',
        language: (tenant.settings as any)?.language || 'vi',
        currency: (tenant.settings as any)?.currency || 'VND',
        date_format: (tenant.settings as any)?.date_format || 'DD/MM/YYYY',
      },
    } : undefined,
  })

  const onSubmit = async (data: GeneralSettingsForm) => {
    if (!tenant) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          settings: data.settings,
        })
        .eq('id', tenant.id)

      if (error) throw error

      toast({
        title: 'Đã lưu',
        description: 'Cài đặt đã được cập nhật thành công',
      })
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt chung</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý thông tin và cấu hình chung của hệ thống
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Information */}
        <Card>
          <CardHeader>
            <CardTitle>Thông tin công ty</CardTitle>
            <CardDescription>Thông tin cơ bản về doanh nghiệp của bạn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tên công ty *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="VD: Khách sạn ABC"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@hotel.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Số điện thoại</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="0901234567"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Regional Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Cài đặt khu vực</CardTitle>
            <CardDescription>Múi giờ, ngôn ngữ và đơn vị tiền tệ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Múi giờ</Label>
                <Select
                  value={watch('settings.timezone')}
                  onValueChange={(value) => setValue('settings.timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Ho_Chi_Minh">GMT+7 (Hồ Chí Minh)</SelectItem>
                    <SelectItem value="Asia/Bangkok">GMT+7 (Bangkok)</SelectItem>
                    <SelectItem value="Asia/Singapore">GMT+8 (Singapore)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ngôn ngữ</Label>
                <Select
                  value={watch('settings.language')}
                  onValueChange={(value: 'vi' | 'en') => setValue('settings.language', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Đơn vị tiền tệ</Label>
                <Select
                  value={watch('settings.currency')}
                  onValueChange={(value) => setValue('settings.currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VND">VND (₫)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Định dạng ngày</Label>
                <Select
                  value={watch('settings.date_format')}
                  onValueChange={(value) => setValue('settings.date_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline">
            Hủy
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  )
}
