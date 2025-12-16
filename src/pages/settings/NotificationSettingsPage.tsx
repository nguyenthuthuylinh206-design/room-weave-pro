import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Bell, Smartphone, Loader2, Save } from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useNotificationPreferences, NotificationPreferences } from '@/hooks/useNotificationPreferences'

export function NotificationSettingsPage() {
  const { isSupported, isSubscribed, isLoading: pushLoading, permission, subscribe, unsubscribe } = usePushNotifications()
  const { preferences, isLoading: prefsLoading, savePreferences, isSaving } = useNotificationPreferences()
  
  const [localPrefs, setLocalPrefs] = useState<Partial<NotificationPreferences>>({})
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences)
    }
  }, [preferences])

  const handleChange = (key: keyof NotificationPreferences, value: boolean | number | string) => {
    setLocalPrefs(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    await savePreferences(localPrefs)
    setHasChanges(false)
  }

  const handleCancel = () => {
    setLocalPrefs(preferences)
    setHasChanges(false)
  }

  if (prefsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

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
                    disabled={pushLoading}
                  >
                    {pushLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
              <Switch 
                checked={localPrefs.email_low_stock ?? true}
                onCheckedChange={(v) => handleChange('email_low_stock', v)}
              />
            </div>
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Lô giặt đã hoàn thành</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi lô giặt được nhận về
                </p>
              </div>
              <Switch 
                checked={localPrefs.email_laundry_completed ?? true}
                onCheckedChange={(v) => handleChange('email_laundry_completed', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Yêu cầu bảo trì mới</Label>
                <p className="text-sm text-muted-foreground">
                  Email khi có yêu cầu bảo trì được tạo
                </p>
              </div>
              <Switch 
                checked={localPrefs.email_maintenance_new ?? true}
                onCheckedChange={(v) => handleChange('email_maintenance_new', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Đơn hàng được phê duyệt</Label>
                <p className="text-sm text-muted-foreground">
                  Thông báo khi đơn đặt hàng được phê duyệt
                </p>
              </div>
              <Switch 
                checked={localPrefs.email_po_approved ?? true}
                onCheckedChange={(v) => handleChange('email_po_approved', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Báo cáo tổng hợp hàng ngày</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi báo cáo tổng hợp vào mỗi sáng
                </p>
              </div>
              <Switch 
                checked={localPrefs.email_daily_report ?? false}
                onCheckedChange={(v) => handleChange('email_daily_report', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Báo cáo tuần</Label>
                <p className="text-sm text-muted-foreground">
                  Gửi báo cáo tổng hợp hàng tuần
                </p>
              </div>
              <Switch 
                checked={localPrefs.email_weekly_report ?? true}
                onCheckedChange={(v) => handleChange('email_weekly_report', v)}
              />
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
              <Switch 
                checked={localPrefs.inapp_realtime ?? true}
                onCheckedChange={(v) => handleChange('inapp_realtime', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Cảnh báo tồn kho</Label>
              <Switch 
                checked={localPrefs.inapp_low_stock ?? true}
                onCheckedChange={(v) => handleChange('inapp_low_stock', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Lô giặt hoàn thành</Label>
              <Switch 
                checked={localPrefs.inapp_laundry_completed ?? true}
                onCheckedChange={(v) => handleChange('inapp_laundry_completed', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Bảo trì mới</Label>
              <Switch 
                checked={localPrefs.inapp_maintenance_new ?? true}
                onCheckedChange={(v) => handleChange('inapp_maintenance_new', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Nhiệm vụ được giao</Label>
              <Switch 
                checked={localPrefs.inapp_task_assigned ?? true}
                onCheckedChange={(v) => handleChange('inapp_task_assigned', v)}
              />
            </div>
            <Separator />

            <div className="flex items-center justify-between">
              <Label>Yêu cầu phê duyệt</Label>
              <Switch 
                checked={localPrefs.inapp_approval_request ?? true}
                onCheckedChange={(v) => handleChange('inapp_approval_request', v)}
              />
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
                    value={localPrefs.low_stock_threshold ?? 20}
                    onChange={(e) => handleChange('low_stock_threshold', parseInt(e.target.value) || 0)}
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
                    value={localPrefs.critical_stock_threshold ?? 5}
                    onChange={(e) => handleChange('critical_stock_threshold', parseInt(e.target.value) || 0)}
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
                    value={localPrefs.overdue_maintenance_days ?? 3}
                    onChange={(e) => handleChange('overdue_maintenance_days', parseInt(e.target.value) || 0)}
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
                    value={localPrefs.laundry_delay_hours ?? 24}
                    onChange={(e) => handleChange('laundry_delay_hours', parseInt(e.target.value) || 0)}
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
                <Input 
                  id="daily-time" 
                  type="time" 
                  value={localPrefs.daily_report_time ?? '08:00'}
                  onChange={(e) => handleChange('daily_report_time', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekly-day">Báo cáo hàng tuần</Label>
                <select
                  id="weekly-day"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={localPrefs.weekly_report_day ?? 1}
                  onChange={(e) => handleChange('weekly_report_day', parseInt(e.target.value))}
                >
                  <option value={0}>Chủ nhật</option>
                  <option value={1}>Thứ Hai</option>
                  <option value={2}>Thứ Ba</option>
                  <option value={3}>Thứ Tư</option>
                  <option value={4}>Thứ Năm</option>
                  <option value={5}>Thứ Sáu</option>
                  <option value={6}>Thứ Bảy</option>
                </select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bật giờ im lặng</Label>
                  <p className="text-sm text-muted-foreground">
                    Không gửi thông báo trong khoảng thời gian này
                  </p>
                </div>
                <Switch 
                  checked={localPrefs.quiet_hours_enabled ?? false}
                  onCheckedChange={(v) => handleChange('quiet_hours_enabled', v)}
                />
              </div>
              
              {localPrefs.quiet_hours_enabled && (
                <div className="flex items-center gap-2">
                  <Input 
                    type="time" 
                    value={localPrefs.quiet_hours_start ?? '22:00'}
                    onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                    className="w-32" 
                  />
                  <span className="text-muted-foreground">đến</span>
                  <Input 
                    type="time" 
                    value={localPrefs.quiet_hours_end ?? '07:00'}
                    onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                    className="w-32" 
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleCancel} disabled={!hasChanges || isSaving}>
            Hủy
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Lưu thay đổi
          </Button>
        </div>
      </div>
    </div>
  )
}
