import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wrench, Clock, CheckCircle, DollarSign, Download } from 'lucide-react'

export const MobileMaintenanceReportPage = () => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Báo cáo bảo trì"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Request Summary */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Wrench className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">45</p>
              <p className="text-xs text-muted-foreground">Tổng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-xl font-bold">12</p>
              <p className="text-xs text-muted-foreground">Đang xử lý</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-xl font-bold">30</p>
              <p className="text-xs text-muted-foreground">Hoàn thành</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-xl font-bold">15M</p>
              <p className="text-xs text-muted-foreground">Chi phí</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi phí theo loại</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {[
              { type: 'Điện', cost: 6000000, percent: 40 },
              { type: 'Nước', cost: 4500000, percent: 30 },
              { type: 'Điều hòa', cost: 3000000, percent: 20 },
              { type: 'Khác', cost: 1500000, percent: 10 },
            ].map((item) => (
              <div key={item.type} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.type}</span>
                  <span className="text-primary">{formatCurrency(item.cost)}</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* MTTR & MTBF */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">MTTR</p>
              <p className="text-2xl font-bold text-primary">4.2h</p>
              <p className="text-xs text-muted-foreground mt-1">
                Thời gian sửa chữa TB
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-2">MTBF</p>
              <p className="text-2xl font-bold text-green-600">180h</p>
              <p className="text-xs text-muted-foreground mt-1">
                Thời gian giữa các lỗi
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sự cố thường xuyên</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {[
              { issue: 'Điều hòa không lạnh', count: 12, avgTime: '3.5h' },
              { issue: 'Đèn hỏng', count: 8, avgTime: '1.2h' },
              { issue: 'Ống nước rò rỉ', count: 6, avgTime: '2.8h' },
              { issue: 'Ổ khóa kẹt', count: 4, avgTime: '1.5h' },
            ].map((item, index) => (
              <div key={item.issue} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3 flex-1">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.issue}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} lần · TB: {item.avgTime}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hiệu suất</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Tỷ lệ hoàn thành đúng hạn</span>
                <span className="font-semibold text-green-600">92%</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: '92%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Mức độ hài lòng</span>
                <span className="font-semibold text-blue-600">4.5/5</span>
              </div>
              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: '90%' }} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => console.log('Export maintenance report')}
        >
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
