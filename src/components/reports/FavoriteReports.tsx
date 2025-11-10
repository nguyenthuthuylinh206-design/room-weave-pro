import { useState } from 'react'
import { Star, Play, Calendar, MoreVertical } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatRelativeTime } from '@/lib/utils'

interface FavoriteReport {
  id: string
  name: string
  type: string
  lastRun?: Date
  frequency?: string
}

export function FavoriteReports() {
  // TODO: Load from user preferences
  const [favorites] = useState<FavoriteReport[]>([
    {
      id: '1',
      name: 'Báo cáo tồn kho cuối ngày',
      type: 'inventory',
      lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      name: 'Chi phí vận hành tháng',
      type: 'financial',
      lastRun: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      id: '3',
      name: 'Hiệu suất nhà cung cấp',
      type: 'laundry',
      lastRun: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ])
  
  const handleRunReport = (report: FavoriteReport) => {
    console.log('Run report:', report)
    // TODO: Navigate to report with saved filters
  }
  
  const handleScheduleReport = (report: FavoriteReport) => {
    console.log('Schedule report:', report)
    // TODO: Open schedule dialog
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <CardTitle>Báo cáo yêu thích</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {favorites.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Chưa có báo cáo yêu thích
          </p>
        ) : (
          <div className="space-y-3">
            {favorites.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
              >
                <div className="flex-1">
                  <p className="font-medium">{report.name}</p>
                  {report.lastRun && (
                    <p className="text-xs text-muted-foreground">
                      Chạy lần cuối: {formatRelativeTime(report.lastRun.toISOString())}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRunReport(report)}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Chạy lại
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleScheduleReport(report)}>
                        <Calendar className="mr-2 h-4 w-4" />
                        Lên lịch
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Star className="mr-2 h-4 w-4" />
                        Bỏ yêu thích
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
