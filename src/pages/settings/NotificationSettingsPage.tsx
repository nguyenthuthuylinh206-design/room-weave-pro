import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, Smartphone, Loader2 } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export function NotificationSettingsPage() {
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = usePushNotifications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cài đặt thông báo</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý các loại thông báo và cảnh báo hệ thống
        </p>
      </div>

      <div className="space-y-6">
        {/* Push Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Thông báo đẩy (Push Notifications)
            </CardTitle>
            <CardDescription>Nhận thông báo ngay cả khi không mở ứng dụng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported ? (
              <div className="text-sm text-muted-foreground">
                Trình duyệt của bạn không hỗ trợ thông báo đẩy.
              </div>
            ) : permission === 'denied' ? (
              <div className="text-sm text-destructive">
                Bạn đã chặn thông báo. Vui lòng bật lại trong cài đặt trình duyệt.
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-0.5">
                    <Label>Bật thông báo đẩy</Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận cảnh báo tồn kho, bảo trì và cập nhật quan trọng
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSubscribed && <Badge variant="secondary">Đã bật</Badge>}
                  <Button
                    variant={isSubscribed ? "outline" : "default"}
                    size="sm"
                    onClick={isSubscribed ? unsubscribe : subscribe}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {isSubscribed ? 'Tắt' : 'Bật ngay'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Thông báo Email</CardTitle>
            <CardDescription>Chọn các sự kiện nhận thông báo qua email</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Cảnh báo tồn kho thấp</Label>
                <p className="text-sm text-muted-foreground">
                  Nhận email khi tồn kho dưới mức tối thiểu
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lô giặt đã nhận</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi lô giặt được nhận về
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Yêu cầu bảo trì mới</Label>
                <p className="text-sm text-muted-foreground">
                  Email khi có yêu cầu bảo trì được tạo
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Đơn hàng được phê duyệt</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi đơn đặt hàng được phê duyệt
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Báo cáo tổng hợp hàng ngày</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi báo cáo tổng hợp vào mỗi sáng
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Thông báo trong ứng dụng</CardTitle>
            <CardDescription>Cấu hình thông báo real-time</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Cập nhật theo thời gian thực</Label>
              <Switch defaultChecked />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Nhiệm vụ được giao</Label>
              <Switch defaultChecked />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Yêu cầu phê duyệt</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle>Ngưỡng cảnh báo</CardTitle>
            <CardDescription>Thiết lập các mức cảnh báo tự động</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="low-stock">Ngưỡng tồn kho thấp</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="low-stock"
                    type="number"
                    defaultValue={20}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">đơn vị</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="critical-stock">Tồn kho nguy hiểm</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="critical-stock"
                    type="number"
                    defaultValue={5}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">đơn vị</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overdue-maintenance">Bảo trì quá hạn</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="overdue-maintenance"
                    type="number"
                    defaultValue={3}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">ngày</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="laundry-delay">Giặt ủi chậm trễ</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="laundry-delay"
                    type="number"
                    defaultValue={24}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">giờ</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Lịch thông báo</CardTitle>
            <CardDescription>Thiết lập thời gian gửi báo cáo định kỳ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="daily-time">Báo cáo hàng ngày</Label>
                <Input id="daily-time" type="time" defaultValue="08:00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly-time">Báo cáo hàng tuần</Label>
                <div className="flex gap-2">
                  <Input id="weekly-day" type="text" defaultValue="Thứ 2" className="flex-1" />
                  <Input id="weekly-time" type="time" defaultValue="09:00" className="w-32" />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Giờ im lặng</Label>
              <p className="text-sm text-muted-foreground">
                Không gửi thông báo trong khoảng thời gian này
              </p>
              <div className="flex items-center gap-2">
                <Input type="time" defaultValue="22:00" className="w-32" />
                <span className="text-muted-foreground">đến</span>
                <Input type="time" defaultValue="07:00" className="w-32" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline">Hủy</Button>
          <Button>Lưu thay đổi</Button>
        </div>
      </div>
    </div>
  )
}
