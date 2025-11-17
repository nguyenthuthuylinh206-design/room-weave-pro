import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, Package, Download } from 'lucide-react'

export const MobileOperationsReportPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Báo cáo vận hành"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Transaction Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tổng quan giao dịch</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <p className="text-2xl font-bold">125</p>
                </div>
                <p className="text-xs text-muted-foreground">Nhập kho</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  <p className="text-2xl font-bold">98</p>
                </div>
                <p className="text-xs text-muted-foreground">Xuất kho</p>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Package className="h-4 w-4 text-blue-500" />
                  <p className="text-2xl font-bold">15</p>
                </div>
                <p className="text-xs text-muted-foreground">Điều chỉnh</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Items by Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top giao dịch nhiều nhất</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {[
              { name: 'Khăn tắm trắng', in: 45, out: 38 },
              { name: 'Chăn ga gối đệm', in: 32, out: 28 },
              { name: 'Dầu gội đầu', in: 28, out: 25 },
              { name: 'Nước rửa tay', in: 25, out: 22 },
            ].map((item, index) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <div className="flex gap-3 text-sm">
                  <span className="text-green-600">↑{item.in}</span>
                  <span className="text-red-600">↓{item.out}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Stocktake Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Kết quả kiểm kê</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Tổng mặt hàng kiểm</span>
              <span className="font-semibold">125</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Khớp đúng</span>
              <span className="font-semibold text-green-600">118</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Chênh lệch thừa</span>
              <span className="font-semibold text-blue-600">4</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm">Chênh lệch thiếu</span>
              <span className="font-semibold text-red-600">3</span>
            </div>
          </CardContent>
        </Card>

        {/* Efficiency Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hiệu suất vận hành</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Độ chính xác</span>
                  <span className="font-semibold text-green-600">94.4%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: '94.4%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Tỷ lệ hoàn thành đúng hạn</span>
                  <span className="font-semibold text-blue-600">88%</span>
                </div>
                <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full" style={{ width: '88%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => console.log('Export operations report')}
        >
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
