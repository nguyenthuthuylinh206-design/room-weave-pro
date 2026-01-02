import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, Package, DollarSign, Star, Clock, TrendingUp, TrendingDown, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { StatCard } from '@/components/ui/stat-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useLaundryReport } from '@/hooks/useReports'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileLaundryReportPage } from '@/components/reports/MobileLaundryReportPage'
import { formatCurrency } from '@/lib/utils'
import { subDays } from 'date-fns'
import { Skeleton } from '@/components/ui/skeleton'

export function LaundryReportPage() {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: reportData, isLoading, error } = useLaundryReport(dateRange)

  if (isMobile) {
    return <MobileLaundryReportPage />
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Giặt là" description="Đang tải dữ liệu...">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </PageHeader>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border rounded-lg p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Giặt là" description="Lỗi khi tải dữ liệu">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </PageHeader>
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p>Không thể tải dữ liệu báo cáo. Vui lòng thử lại sau.</p>
          <p className="text-xs mt-2">{String(error)}</p>
        </div>
      </div>
    )
  }

  // No data state
  if (!reportData) {
    return (
      <div className="space-y-6">
        <PageHeader title="Báo cáo Giặt là" description="Phân tích chi phí và hiệu suất giặt là">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </PageHeader>
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          Chưa có dữ liệu trong khoảng thời gian này
        </div>
      </div>
    )
  }

  const { summary, by_vendor = [], monthly_trend = [] } = reportData

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo Giặt là"
        description="Phân tích chi phí và hiệu suất dịch vụ giặt là"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
        </div>
      </PageHeader>
      
      {/* Date Range */}
      <div className="border rounded-lg p-4">
        <DateRangePicker
          value={{ from: dateRange.start, to: dateRange.end }}
          onChange={(range) => 
            setDateRange({
              start: range.from || new Date(),
              end: range.to || new Date(),
            })
          }
        />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          title="Tổng số lô"
          value={summary?.total_batches || 0}
          icon={Package}
          description={`${((summary?.total_batches || 0) / 30).toFixed(1)} lô/ngày`}
        />
        <StatCard
          title="Tổng items"
          value={(summary?.total_items || 0).toLocaleString()}
          icon={Package}
          description={`${summary?.total_weight?.toFixed(0) || 0} kg`}
        />
        <StatCard
          title="Tổng chi phí"
          value={formatCurrency(summary?.total_cost || 0)}
          icon={DollarSign}
          description={`${formatCurrency(summary?.avg_cost_per_kg || 0)}/kg`}
        />
        <StatCard
          title="Chất lượng TB"
          value={`${(summary?.avg_quality || 0).toFixed(1)}/5`}
          icon={Star}
          description={`${(summary?.on_time_rate || 0).toFixed(0)}% đúng hạn`}
        />
      </div>

      {/* Monthly Trend Chart */}
      {monthly_trend.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="text-sm font-medium mb-4">Xu hướng chi phí theo tháng</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly_trend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis 
                tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                className="text-xs"
              />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Tháng ${label}`}
              />
              <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Vendor Performance Table */}
      {by_vendor.length > 0 && (
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <h3 className="text-sm font-medium">Hiệu suất nhà cung cấp</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead className="text-right">Số lô</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Chi phí</TableHead>
                <TableHead className="text-right">₫/kg</TableHead>
                <TableHead className="text-right">Chất lượng</TableHead>
                <TableHead className="text-right">Đúng hạn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {by_vendor.map((vendor) => (
                <TableRow key={vendor.vendor_id}>
                  <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                  <TableCell className="text-right">{vendor.batches}</TableCell>
                  <TableCell className="text-right">{vendor.items.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(vendor.cost)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(vendor.cost_per_kg)}</TableCell>
                  <TableCell className="text-right">
                    <span className="flex items-center justify-end gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {vendor.quality.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={vendor.on_time_rate >= 90 ? 'text-green-600' : vendor.on_time_rate >= 70 ? 'text-amber-600' : 'text-red-600'}>
                      {vendor.on_time_rate.toFixed(0)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Empty state for vendor */}
      {by_vendor.length === 0 && (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Chưa có dữ liệu nhà cung cấp</p>
        </div>
      )}
    </div>
  )
}
