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
import { useIsMobile } from '@/hooks/use-mobile'

export function SettingsPage() {
  const isMobile = useIsMobile()

  if (isMobile) {
    return <MobileSettingsPage />
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt"
        description="Quản lý cài đặt hệ thống và tùy chọn"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Demo Data - Only for owners */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Dữ liệu Demo</CardTitle>
            </div>
            <CardDescription>
              Tạo dữ liệu demo để thử nghiệm hệ thống
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
              <CardTitle>Thông báo</CardTitle>
            </div>
            <CardDescription>
              Cấu hình các loại thông báo bạn muốn nhận
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notif">Thông báo email</Label>
              <Switch id="email-notif" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="push-notif">Thông báo đẩy</Label>
              <Switch id="push-notif" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="batch-notif">Thông báo lô giặt</Label>
              <Switch id="batch-notif" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Giao diện</CardTitle>
            </div>
            <CardDescription>
              Tùy chỉnh giao diện ứng dụng
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Chế độ hiển thị</Label>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">Sáng</Button>
                <Button variant="outline" className="flex-1">Tối</Button>
                <Button variant="default" className="flex-1">Hệ thống</Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="compact">Chế độ thu gọn</Label>
              <Switch id="compact" />
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Cài đặt hệ thống</CardTitle>
            </div>
            <CardDescription>
              Cấu hình các tham số hệ thống
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">Đơn vị tiền tệ</Label>
              <Input id="currency" value="VND" readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Múi giờ</Label>
              <Input id="timezone" value="Asia/Ho_Chi_Minh" readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Ngôn ngữ</Label>
              <Input id="language" value="Tiếng Việt" readOnly />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle>Bảo mật</CardTitle>
            </div>
            <CardDescription>
              Cài đặt liên quan đến bảo mật
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="2fa">Xác thực 2 bước</Label>
              <Switch id="2fa" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="session">Phiên đăng nhập</Label>
              <Button variant="outline" size="sm">Quản lý</Button>
            </div>
            <Separator />
            <Button variant="outline" className="w-full">
              Đổi mật khẩu
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Hủy</Button>
        <Button>Lưu thay đổi</Button>
      </div>
    </div>
  )
}
