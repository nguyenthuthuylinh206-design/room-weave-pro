import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, CheckCircle, AlertCircle, Download } from 'lucide-react'
import { useRoomsReportData, DateRange } from '@/hooks/useRoomsReportData'
import { Skeleton } from '@/components/ui/skeleton'

interface MobileRoomsReportPageProps {
  dateRange?: DateRange
}

export const MobileRoomsReportPage = ({ dateRange }: MobileRoomsReportPageProps) => {
  const defaultDateRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }
  
  const { data, isLoading } = useRoomsReportData(dateRange || defaultDateRange)
  
  const roomStats = data?.roomStats || { total: 0, vacant: 0, cleaning: 0, maintenance: 0 }
  const checkStats = data?.checkStats || { total_checks: 0, avg_score: 0, issues_found: 0 }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader title="Báo cáo phòng" showBack />

      <div className="p-4 space-y-4">
        {/* Room Status Overview */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
              {isLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : (
                <p className="text-xl font-bold">{roomStats.total}</p>
              )}
              <p className="text-xs text-muted-foreground">Tổng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              {isLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : (
                <p className="text-xl font-bold">{roomStats.vacant}</p>
              )}
              <p className="text-xs text-muted-foreground">Sẵn sàng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              {isLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : (
                <p className="text-xl font-bold">{roomStats.cleaning}</p>
              )}
              <p className="text-xs text-muted-foreground">Đang dọn</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
              {isLoading ? <Skeleton className="h-6 w-8 mx-auto" /> : (
                <p className="text-xl font-bold">{roomStats.maintenance}</p>
              )}
              <p className="text-xs text-muted-foreground">Bảo trì</p>
            </CardContent>
          </Card>
        </div>

        {/* Utilization */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tỷ lệ sử dụng phòng</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : data?.utilizationByType && data.utilizationByType.length > 0 ? (
              <div className="space-y-3">
                {data.utilizationByType.map((room) => (
                  <div key={room.room_type_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{room.room_type}</span>
                      <span className="text-muted-foreground">
                        {room.occupied}/{room.total} ({room.rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${room.rate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Không có dữ liệu</p>
            )}
          </CardContent>
        </Card>

        {/* Check History Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lịch sử kiểm tra (30 ngày)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Tổng lượt kiểm tra</span>
              {isLoading ? <Skeleton className="h-5 w-12" /> : (
                <span className="font-semibold">{checkStats.total_checks}</span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Điểm trung bình</span>
              {isLoading ? <Skeleton className="h-5 w-12" /> : (
                <span className="font-semibold text-green-600">{checkStats.avg_score}/100</span>
              )}
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm">Vấn đề phát hiện</span>
              {isLoading ? <Skeleton className="h-5 w-12" /> : (
                <span className="font-semibold text-red-600">{checkStats.issues_found}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vấn đề thường gặp</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : data?.topIssues && data.topIssues.length > 0 ? (
              data.topIssues.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm">{item.item_name || 'Không xác định'}</span>
                  </div>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Không có vấn đề</p>
            )}
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button className="w-full" variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
