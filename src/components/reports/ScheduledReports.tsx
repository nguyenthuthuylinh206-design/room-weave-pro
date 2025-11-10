import { useState } from 'react'
import { Calendar, Mail, Clock, MoreVertical, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Switch } from '@/components/ui/switch'

interface ScheduledReport {
  id: string
  name: string
  email: string
  frequency: string
  time: string
  active: boolean
}

export function ScheduledReports() {
  const [schedules, setSchedules] = useState<ScheduledReport[]>([
    {
      id: '1',
      name: 'Tồn kho cuối ngày',
      email: 'manager@hotel.com',
      frequency: 'Hàng ngày',
      time: '18:00',
      active: true,
    },
    {
      id: '2',
      name: 'Tổng hợp tuần',
      email: 'owner@hotel.com',
      frequency: 'Thứ 2 hàng tuần',
      time: '09:00',
      active: true,
    },
  ])
  
  const handleToggle = (id: string) => {
    setSchedules(schedules.map(s => 
      s.id === id ? { ...s, active: !s.active } : s
    ))
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <CardTitle>Báo cáo tự động</CardTitle>
          </div>
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Thêm lịch
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có lịch báo cáo tự động
          </p>
        ) : (
          <div className="space-y-3">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="flex items-start justify-between rounded-lg border p-3"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{schedule.name}</p>
                    <Badge variant={schedule.active ? 'default' : 'secondary'}>
                      {schedule.active ? 'Đang chạy' : 'Tạm dừng'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {schedule.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {schedule.frequency} lúc {schedule.time}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={schedule.active}
                    onCheckedChange={() => handleToggle(schedule.id)}
                  />
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Sửa</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Xóa
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
