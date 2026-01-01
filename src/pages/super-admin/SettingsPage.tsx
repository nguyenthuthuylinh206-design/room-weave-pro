import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Shield, Bell, Database } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
  const { t } = useTranslation('superAdmin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('titles.settings')}</h1>
        <p className="text-muted-foreground mt-2">
          Cấu hình hệ thống Super Admin
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Bảo Mật
            </CardTitle>
            <CardDescription>
              Cấu hình bảo mật cho cổng Super Admin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Xác thực 2 lớp (2FA)</Label>
                <p className="text-sm text-muted-foreground">
                  Yêu cầu xác thực 2 lớp khi đăng nhập
                </p>
              </div>
              <Switch disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Giới hạn IP</Label>
                <p className="text-sm text-muted-foreground">
                  Chỉ cho phép truy cập từ các IP được phép
                </p>
              </div>
              <Switch disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Thông Báo
            </CardTitle>
            <CardDescription>
              Cấu hình thông báo cho Super Admin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email khi có tenant mới đăng ký</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận email thông báo khi có tenant chờ phê duyệt
                </p>
              </div>
              <Switch disabled />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cảnh báo thanh toán thất bại</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận thông báo khi có thanh toán thất bại
                </p>
              </div>
              <Switch disabled />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Hệ Thống
            </CardTitle>
            <CardDescription>
              Cấu hình hệ thống nền tảng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Các cài đặt hệ thống đang được phát triển</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
