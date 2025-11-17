import { useState } from 'react'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const PERIODS = [
  { id: 'month', label: 'Tháng này' },
  { id: 'last-month', label: 'Tháng trước' },
  { id: 'quarter', label: 'Quý này' },
  { id: 'year', label: 'Năm nay' },
]

export const MobileFinancialReportPage = () => {
  const [period, setPeriod] = useState('month')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Báo cáo tài chính"
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                period === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <p className="text-xs text-muted-foreground">Tổng thu</p>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(150000000)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-500">+12.5%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-red-500" />
                <p className="text-xs text-muted-foreground">Tổng chi</p>
              </div>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(85000000)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingDown className="h-3 w-3 text-red-500" />
                <span className="text-xs text-red-500">-5.2%</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profit */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-sm mb-2">Lợi nhuận ròng</p>
            <p className="text-3xl font-bold">{formatCurrency(65000000)}</p>
            <p className="text-sm mt-2 opacity-90">Tỷ suất lợi nhuận: 43.3%</p>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Chi phí theo danh mục</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {[
              { name: 'Đồ dùng & Vật tư', amount: 35000000, percent: 41 },
              { name: 'Giặt là', amount: 25000000, percent: 29 },
              { name: 'Bảo trì', amount: 15000000, percent: 18 },
              { name: 'Khác', amount: 10000000, percent: 12 },
            ].map((item) => (
              <div key={item.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-primary">{formatCurrency(item.amount)}</span>
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

        {/* Trend Chart Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Xu hướng doanh thu</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-48 flex items-end justify-between gap-2">
              {[65, 72, 68, 85, 90, 78, 95].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-primary rounded-t"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">T{i + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={() => console.log('Export financial report')}
        >
          <Download className="h-4 w-4 mr-2" />
          Xuất báo cáo Excel
        </Button>
      </div>
    </div>
  )
}
