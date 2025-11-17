import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Home, CheckCircle, AlertCircle, Download } from 'lucide-react'

export const MobileRoomsReportPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Báo cáo phòng"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Room Status Overview */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">120</p>
              <p className="text-xs text-muted-foreground">Tổng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold">95</p>
              <p className="text-xs text-muted-foreground">Sẵn sàng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-xl font-bold">18</p>
              <p className="text-xs text-muted-foreground">Đang dọn</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <AlertCircle className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-xl font-bold">7</p>
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
            <div className="space-y-3">
              {[
                { type: 'Deluxe', total: 50, used: 42, percent: 84 },
                { type: 'Standard', total: 40, used: 35, percent: 88 },
                { type: 'Suite', total: 30, used: 22, percent: 73 },
              ].map((room) => (
                <div key={room.type} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{room.type}</span>
                    <span className="text-muted-foreground">
                      {room.used}/{room.total} ({room.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${room.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Deficiencies by Room Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Thiếu hụt theo loại phòng</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {[
              { type: 'Deluxe', missing: 12 },
              { type: 'Standard', missing: 8 },
              { type: 'Suite', missing: 5 },
            ].map((item) => (
              <div key={item.type} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{item.type}</span>
                <span className="text-red-500 font-semibold">{item.missing} món</span>
              </div>
            ))}
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
              <span className="font-semibold">450</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Điểm trung bình</span>
              <span className="font-semibold text-green-600">4.3/5</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Phát hiện vấn đề</span>
              <span className="font-semibold text-red-600">25</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm">Đã khắc phục</span>
              <span className="font-semibold text-green-600">23</span>
            </div>
          </CardContent>
        </Card>

        {/* Top Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vấn đề thường gặp</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {[
              { issue: 'Thiếu khăn tắm', count: 8 },
              { issue: 'Đèn hỏng', count: 6 },
              { issue: 'Vệ sinh chưa sạch', count: 5 },
              { issue: 'Điều hòa không hoạt động', count: 4 },
            ].map((item, index) => (
              <div key={item.issue} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="text-sm">{item.issue}</span>
                </div>
                <span className="font-semibold">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => console.log('Export rooms report')}
        >
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
