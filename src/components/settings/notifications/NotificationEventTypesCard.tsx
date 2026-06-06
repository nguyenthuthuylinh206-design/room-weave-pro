import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Bell } from 'lucide-react'
import type { NotificationPreferences } from '@/hooks/useNotificationPreferences'

type Channel = 'Push' | 'Telegram' | 'Email'

interface EventDef {
  key: keyof NotificationPreferences
  label: string
  description?: string
  channels: Channel[]
}

const EVENTS: EventDef[] = [
  {
    key: 'inapp_booking_events' as keyof NotificationPreferences,
    label: 'Đặt phòng mới / Check-in / Check-out',
    description: 'Khi có đặt phòng mới, khách nhận hoặc trả phòng',
    channels: ['Push', 'Telegram'],
  },
  {
    key: 'inapp_maintenance_new',
    label: 'Yêu cầu bảo trì mới',
    description: 'Khi có yêu cầu bảo trì được tạo',
    channels: ['Push', 'Telegram', 'Email'],
  },
  {
    key: 'inapp_low_stock',
    label: 'Cảnh báo tồn kho thấp',
    description: 'Khi tồn kho chạm ngưỡng cảnh báo',
    channels: ['Push', 'Email'],
  },
  {
    key: 'inapp_laundry_delayed' as keyof NotificationPreferences,
    label: 'Giặt là: batch sắp trễ',
    description: 'Khi lô giặt sắp quá hạn nhận',
    channels: ['Push', 'Telegram'],
  },
  {
    key: 'inapp_task_assigned',
    label: 'Công việc được giao cho tôi',
    description: 'Khi quản lý giao việc mới',
    channels: ['Push', 'Telegram'],
  },
]

interface Props {
  prefs: Partial<NotificationPreferences>
  pushSubscribed: boolean
  onChange: (key: keyof NotificationPreferences, value: boolean) => void
}

const channelTone: Record<Channel, string> = {
  Push: 'border-primary/30 text-primary',
  Telegram: 'border-sky-500/30 text-sky-600 dark:text-sky-400',
  Email: 'border-amber-500/30 text-amber-600 dark:text-amber-500',
}

export function NotificationEventTypesCard({ prefs, pushSubscribed, onChange }: Props) {
  const allEventsOff = EVENTS.every((e) => prefs[e.key] === false)
  const pushOff = !pushSubscribed
  const allChannelsOff = pushOff && allEventsOff

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Loại thông báo
        </CardTitle>
        <CardDescription>
          Chọn các sự kiện bạn muốn nhận thông báo. Mỗi sự kiện có thể đến qua nhiều kênh.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {allChannelsOff && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Bạn đang tắt toàn bộ thông báo. Bạn có thể bỏ lỡ các công việc được giao.
            </span>
          </div>
        )}

        <div className="divide-y rounded-lg border">
          {EVENTS.map((evt) => {
            const value = prefs[evt.key]
            const enabled = value !== false
            return (
              <div key={String(evt.key)} className="flex items-start justify-between gap-3 p-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Label className="text-sm font-medium">{evt.label}</Label>
                    {evt.channels.map((c) => (
                      <Badge
                        key={c}
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${channelTone[c]}`}
                      >
                        {c}
                      </Badge>
                    ))}
                  </div>
                  {evt.description && (
                    <p className="text-xs text-muted-foreground">{evt.description}</p>
                  )}
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(v) => onChange(evt.key, v)}
                />
              </div>
            )
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Kênh nhận thực tế phụ thuộc vào cài đặt Push / Telegram / Email của bạn.
        </p>
      </CardContent>
    </Card>
  )
}
