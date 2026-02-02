import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, CreditCard } from 'lucide-react'
import { useRevenueReport } from '@/hooks/useRevenueReport'
import { formatCurrency } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const formatCompact = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

export const MobileRevenueReportPage = () => {
  const { data: report, isLoading } = useRevenueReport()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title="Báo cáo doanh thu" showBack />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border rounded-lg p-3">
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-40" />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title="Báo cáo doanh thu" showBack />
        <div className="p-4">
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            Chưa có dữ liệu doanh thu
          </div>
        </div>
      </div>
    )
  }

  const growthPositive = report.revenueGrowth >= 0

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader title="Báo cáo doanh thu" showBack />

      <div className="p-4 space-y-4">
        {/* Stats Summary - 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border rounded-lg p-3 bg-green-50 dark:bg-green-950/30">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-xs text-muted-foreground">Tháng này</span>
              </div>
              {report.revenueGrowth !== 0 && (
                <div className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  growthPositive ? 'text-green-600' : 'text-red-600'
                )}>
                  {growthPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(report.revenueGrowth).toFixed(1)}%
                </div>
              )}
            </div>
            <p className="text-lg font-bold text-green-600">{formatCurrency(report.thisMonth.paidRevenue)}</p>
          </div>
          
          <div className="border rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Chờ TT</span>
            </div>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(report.thisMonth.pendingRevenue)}</p>
          </div>
          
          <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-muted-foreground">Đã thanh toán</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{report.thisMonth.paidBookingsCount}</p>
            <p className="text-xs text-muted-foreground">booking</p>
          </div>
          
          <div className="border rounded-lg p-3 bg-purple-50 dark:bg-purple-950/30">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="h-4 w-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">TB/booking</span>
            </div>
            <p className="text-lg font-bold text-purple-600">{formatCurrency(report.thisMonth.averageBookingValue)}</p>
          </div>
        </div>

        {/* Revenue Trend Mini Chart */}
        {report.monthlyTrends.length > 0 && (
          <div className="border rounded-lg p-3">
            <h3 className="text-sm font-medium mb-3">Xu hướng 6 tháng</h3>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={report.monthlyTrends}>
                <defs>
                  <linearGradient id="mobileRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  hide 
                  tickFormatter={formatCompact}
                />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#mobileRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Today Stats */}
        <div className="border rounded-lg">
          <div className="p-3 border-b">
            <h3 className="text-sm font-medium">Hôm nay</h3>
          </div>
          <div className="divide-y">
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Đã thanh toán</span>
              </div>
              <span className="font-semibold text-green-600">{formatCurrency(report.today.paidRevenue)}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm">Chờ thanh toán</span>
              </div>
              <span className="font-semibold text-amber-600">{formatCurrency(report.today.pendingRevenue)}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm">Số booking</span>
              </div>
              <span className="font-semibold text-blue-600">{report.today.bookingsCount}</span>
            </div>
          </div>
        </div>

        {/* Month Comparison */}
        <div className="border rounded-lg">
          <div className="p-3 border-b">
            <h3 className="text-sm font-medium">So sánh với tháng trước</h3>
          </div>
          <div className="divide-y">
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tháng trước</span>
              <span className="font-medium">{formatCurrency(report.lastMonth.paidRevenue)}</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tháng này</span>
              <span className="font-medium">{formatCurrency(report.thisMonth.paidRevenue)}</span>
            </div>
            <div className={cn(
              'p-3 flex items-center justify-between',
              growthPositive ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
            )}>
              <span className="text-sm">Chênh lệch</span>
              <div className="flex items-center gap-1">
                {growthPositive ? (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={cn('font-semibold', growthPositive ? 'text-green-600' : 'text-red-600')}>
                  {formatCurrency(Math.abs(report.thisMonth.paidRevenue - report.lastMonth.paidRevenue))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
