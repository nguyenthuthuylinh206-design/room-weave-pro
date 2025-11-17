import { useState } from 'react'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, DollarSign, Star, Download } from 'lucide-react'

export const MobileLaundryReportPage = () => {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Báo cáo giặt là"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Date Range */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-2">
              <Label>Từ ngày</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Đến ngày</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">45</p>
              <p className="text-xs text-muted-foreground">Tổng lô</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">25M</p>
              <p className="text-xs text-muted-foreground">Chi phí</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">4.5</p>
              <p className="text-xs text-muted-foreground">Đánh giá TB</p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi phí theo nhà cung cấp</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {[
              { vendor: 'Giặt là Ánh Dương', cost: 12000000, batches: 20 },
              { vendor: 'Giặt là Hương Lan', cost: 8000000, batches: 15 },
              { vendor: 'Giặt là Mai Linh', cost: 5000000, batches: 10 },
            ].map((item) => (
              <div key={item.vendor} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{item.vendor}</p>
                  <p className="text-xs text-muted-foreground">{item.batches} lô</p>
                </div>
                <span className="text-primary font-semibold">
                  {formatCurrency(item.cost)}
                </span>
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
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Trung bình/lô</span>
              <span className="font-semibold">{formatCurrency(555555)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Thời gian xử lý TB</span>
              <span className="font-semibold">3.2 ngày</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Tỷ lệ hư hỏng</span>
              <span className="font-semibold text-red-500">2.1%</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm">Tỷ lệ đúng hẹn</span>
              <span className="font-semibold text-green-500">95%</span>
            </div>
          </CardContent>
        </Card>

        {/* Quality Ratings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Đánh giá chất lượng</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((stars) => (
                <div key={stars} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-16">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm">{stars}</span>
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-yellow-500 h-full"
                        style={{ width: `${[65, 25, 8, 2, 0][5 - stars]}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right">
                    {[29, 11, 4, 1, 0][5 - stars]} lô
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => console.log('Export laundry report')}
        >
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
