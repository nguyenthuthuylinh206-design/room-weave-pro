import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRevenueReport } from '@/hooks/useRevenueReport'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileRevenueReportPage } from '@/components/reports/MobileRevenueReportPage'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Clock, 
  CheckCircle,
  Download,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

const formatCompact = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`
  }
  return value.toString()
}

export function RevenueReportPage() {
  const { isMobile } = useBreakpoint()
  const { data: report, isLoading } = useRevenueReport()
  const [period, setPeriod] = useState('month')

  if (isMobile) {
    return <MobileRevenueReportPage />
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Doanh thu" description="Phân tích chi tiết doanh thu" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Doanh thu" description="Phân tích chi tiết doanh thu" />
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Chưa có dữ liệu doanh thu
          </CardContent>
        </Card>
      </div>
    )
  }

  const growthPositive = report.revenueGrowth >= 0

  const summaryCards = [
    {
      title: 'Doanh thu tháng này',
      value: report.thisMonth.paidRevenue,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      change: report.revenueGrowth,
    },
    {
      title: 'Chờ thanh toán',
      value: report.thisMonth.pendingRevenue,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Số booking đã thanh toán',
      value: report.thisMonth.paidBookingsCount,
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      isCurrency: false,
    },
    {
      title: 'Giá trị TB/booking',
      value: report.thisMonth.averageBookingValue,
      icon: CreditCard,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Báo cáo Doanh thu" 
        description="Phân tích chi tiết doanh thu và lợi nhuận"
      >
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} className={cn(card.bgColor)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={cn('h-5 w-5', card.color)} />
                {card.change !== undefined && (
                  <div className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    card.change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  )}>
                    {card.change >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(card.change).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-1">{card.title}</p>
              <p className={cn('text-2xl font-bold', card.color)}>
                {card.isCurrency === false 
                  ? card.value 
                  : formatCurrency(card.value)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Xu hướng doanh thu 6 tháng gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={report.monthlyTrends}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatCompact}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    formatCurrency(value), 
                    name === 'revenue' ? 'Doanh thu' : 'Bookings'
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  name="Doanh thu"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">So sánh với tháng trước</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Doanh thu tháng trước</span>
                <span className="font-semibold">{formatCurrency(report.lastMonth.paidRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">Doanh thu tháng này</span>
                <span className="font-semibold">{formatCurrency(report.thisMonth.paidRevenue)}</span>
              </div>
              <div className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                growthPositive ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'
              )}>
                <span className="text-sm text-muted-foreground">Chênh lệch</span>
                <div className="flex items-center gap-2">
                  {growthPositive ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={cn(
                    'font-semibold',
                    growthPositive ? 'text-green-600' : 'text-red-600'
                  )}>
                    {formatCurrency(Math.abs(report.thisMonth.paidRevenue - report.lastMonth.paidRevenue))}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Thống kê hôm nay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Đã thanh toán</span>
                </div>
                <span className="font-semibold text-green-600">{formatCurrency(report.today.paidRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-sm">Chờ thanh toán</span>
                </div>
                <span className="font-semibold text-amber-600">{formatCurrency(report.today.pendingRevenue)}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm">Số booking</span>
                </div>
                <span className="font-semibold text-blue-600">{report.today.bookingsCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
