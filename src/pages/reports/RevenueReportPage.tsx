import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { useRevenueReport, ReportPeriod } from '@/hooks/useRevenueReport'
import { Skeleton } from '@/components/ui/skeleton'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileRevenueReportPage } from '@/components/reports/MobileRevenueReportPage'
import { RevenueByTypeChart } from '@/components/reports/RevenueByTypeChart'
import { RevenueBySourceTable } from '@/components/reports/RevenueBySourceTable'
import { TopRoomsRevenueTable } from '@/components/reports/TopRoomsRevenueTable'
import { useRevenueExport } from '@/components/reports/useRevenueExport'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Clock,
  CheckCircle,
  Download,
  Calendar,
  FileSpreadsheet,
  FileText,
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
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)

const formatCompact = (value: number) => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`
  return value.toString()
}

export function RevenueReportPage() {
  const { isMobile } = useBreakpoint()
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const { data: report, isLoading } = useRevenueReport(period)
  const { exportExcel, exportPDF } = useRevenueExport()

  if (isMobile) return <MobileRevenueReportPage />

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Báo cáo Doanh thu" description="Phân tích chi tiết doanh thu" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="space-y-4">
        <PageHeader title="Báo cáo Doanh thu" description="Phân tích chi tiết doanh thu" />
        <div className="border rounded-lg p-10 text-center text-muted-foreground">
          Chưa có dữ liệu doanh thu
        </div>
      </div>
    )
  }

  const growthPositive = report.revenueGrowth >= 0

  const stats = [
    { label: 'Đã thu', value: formatCurrency(report.currentPeriod.paidRevenue), icon: CheckCircle, color: 'text-green-600' },
    { label: 'Chờ TT', value: formatCurrency(report.currentPeriod.pendingRevenue), icon: Clock, color: 'text-amber-600' },
    { label: 'Net Revenue', value: formatCurrency(report.currentPeriod.netRevenue), icon: DollarSign, color: 'text-foreground' },
    { label: 'Bookings', value: String(report.currentPeriod.bookingsCount), icon: CreditCard, color: 'text-foreground' },
  ]

  return (
    <div className="space-y-4">
      <PageHeader title="Báo cáo Doanh thu" description="Phân tích chi tiết doanh thu">
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-[140px] h-8">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Tuần này</SelectItem>
              <SelectItem value="month">Tháng này</SelectItem>
              <SelectItem value="quarter">Quý này</SelectItem>
              <SelectItem value="year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Xuất
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => exportExcel(report, period)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportPDF(report, period)}>
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="border rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={cn('h-4 w-4', s.color)} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
              {s.label === 'Đã thu' && report.revenueGrowth !== 0 && (
                <span className={cn('text-xs font-medium ml-auto flex items-center gap-0.5', growthPositive ? 'text-green-600' : 'text-red-600')}>
                  {growthPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(report.revenueGrowth).toFixed(1)}%
                </span>
              )}
            </div>
            <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="by-type">Theo loại</TabsTrigger>
          <TabsTrigger value="by-source">Theo nguồn</TabsTrigger>
          <TabsTrigger value="rooms">Phòng</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Trend */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-medium mb-3">Xu hướng doanh thu 6 tháng</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report.monthlyTrends}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatCompact} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#revenueGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Period comparison + Today */}
          <div className="grid grid-cols-2 gap-3">
            <div className="border rounded-lg">
              <div className="p-3 border-b">
                <h3 className="text-sm font-medium">So sánh với kỳ trước</h3>
              </div>
              <div className="divide-y">
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Kỳ trước</span>
                  <span className="font-medium">{formatCurrency(report.previousPeriod.paidRevenue)}</span>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Kỳ này</span>
                  <span className="font-medium">{formatCurrency(report.currentPeriod.paidRevenue)}</span>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span>Chênh lệch</span>
                  <span className={cn('font-semibold flex items-center gap-1', growthPositive ? 'text-green-600' : 'text-red-600')}>
                    {growthPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {formatCurrency(Math.abs(report.currentPeriod.paidRevenue - report.previousPeriod.paidRevenue))}
                  </span>
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="p-3 border-b">
                <h3 className="text-sm font-medium">Hôm nay</h3>
              </div>
              <div className="divide-y">
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Đã thu</span>
                  <span className="font-medium text-green-600">{formatCurrency(report.today.paidRevenue)}</span>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Chờ TT</span>
                  <span className="font-medium text-amber-600">{formatCurrency(report.today.pendingRevenue)}</span>
                </div>
                <div className="p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">Bookings</span>
                  <span className="font-medium">{report.today.bookingsCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Surcharges summary */}
          {report.currentPeriod.surcharges.total > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b">
                <h3 className="text-sm font-medium">Phụ thu</h3>
              </div>
              <div className="divide-y">
                {report.currentPeriod.surcharges.earlyCheckin > 0 && (
                  <div className="p-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Check-in sớm</span>
                    <span className="font-mono text-xs">{formatCurrency(report.currentPeriod.surcharges.earlyCheckin)}</span>
                  </div>
                )}
                {report.currentPeriod.surcharges.lateCheckout > 0 && (
                  <div className="p-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Checkout trễ</span>
                    <span className="font-mono text-xs">{formatCurrency(report.currentPeriod.surcharges.lateCheckout)}</span>
                  </div>
                )}
                {report.currentPeriod.surcharges.damageCharges > 0 && (
                  <div className="p-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Hư hỏng</span>
                    <span className="font-mono text-xs">{formatCurrency(report.currentPeriod.surcharges.damageCharges)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="by-type">
          <RevenueByTypeChart data={report.byType} />
        </TabsContent>

        <TabsContent value="by-source">
          <RevenueBySourceTable data={report.bySource} />
        </TabsContent>

        <TabsContent value="rooms">
          <TopRoomsRevenueTable data={report.topRooms} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
