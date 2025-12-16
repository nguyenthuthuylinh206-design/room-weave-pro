import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Settings, Bell, Shield, Palette } from 'lucide-react'
import { SeedDataButton } from '@/components/settings/SeedDataButton'
import { MobileSettingsPage } from '@/components/settings/MobileSettingsPage'
import { useBreakpoint } from '@/lib/breakpoints'
import { useTranslation } from 'react-i18next'

export function SettingsPage() {
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation('settings')

  if (isMobile) {
    return <MobileSettingsPage />
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('general.description', 'Quản lý cài đặt hệ thống và tùy chọn')}
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Demo Data - Only for owners */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>{t('demoData.title', 'Dữ liệu Demo')}</CardTitle>
            </div>
            <CardDescription>
              {t('demoData.description', 'Tạo dữ liệu demo để thử nghiệm hệ thống')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeedDataButton />
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>{t('notifications.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('notifications.description', 'Cấu hình các loại thông báo bạn muốn nhận')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif">{t('notifications.email', 'Thông báo email')}</Label>
              <Switch id="email-notif" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notif">{t('notifications.push', 'Thông báo đẩy')}</Label>
              <Switch id="push-notif" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-notif">{t('notifications.batch', 'Thông báo lô giặt')}</Label>
              <Switch id="batch-notif" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>{t('appearance.title', 'Giao diện')}</CardTitle>
            </div>
            <CardDescription>
              {t('appearance.description', 'Tùy chỉnh giao diện ứng dụng')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('appearance.displayMode', 'Chế độ hiển thị')}</Label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">{t('general.lightMode')}</Button>
                <Button variant="outline" className="flex-1">{t('general.darkMode')}</Button>
                <Button variant="default" className="flex-1">{t('appearance.system', 'Hệ thống')}</Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="compact">{t('appearance.compact', 'Chế độ thu gọn')}</Label>
              <Switch id="compact" />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>{t('system.title', 'Cài đặt hệ thống')}</CardTitle>
            </div>
            <CardDescription>
              {t('system.description', 'Cấu hình các tham số hệ thống')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t('general.currency')}</Label>
              <Input id="currency" value="VND" readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">{t('general.timezone')}</Label>
              <Input id="timezone" value="Asia/Ho_Chi_Minh" readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('general.language')}</Label>
              <Input id="language" value="Tiếng Việt" readOnly />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>{t('security.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('security.description', 'Cài đặt liên quan đến bảo mật')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="2fa">{t('security.twoFactor')}</Label>
              <Switch id="2fa" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="session">{t('security.sessions')}</Label>
              <Button variant="outline" size="sm">{t('common:manage', 'Quản lý')}</Button>
            </div>
            <Separator />
            <Button variant="outline" className="w-full">
              {t('profile.changePassword')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">{t('common:cancel', 'Hủy')}</Button>
        <Button>{t('common:saveChanges', 'Lưu thay đổi')}</Button>
      </div>
    </div>
  )
}
