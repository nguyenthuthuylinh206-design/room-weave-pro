import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Package, DollarSign, Star, Download, TrendingUp, TrendingDown, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { useLaundryReport } from '@/hooks/useReports'
import { useReportExport } from '@/hooks/useReportExport'
import { formatCurrency } from '@/lib/utils'
import { subDays, format } from 'date-fns'
import { Progress } from '@/components/ui/progress'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { DateRangePicker } from '@/components/shared/DateRangePicker'

export const MobileLaundryReportPage = () => {
  const { t } = useTranslation()
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })

  const { data: reportData, isLoading } = useLaundryReport(dateRange)
  const { exportToExcel, isExporting } = useReportExport()

  const handleExportExcel = async () => {
    if (!reportData) return
    
    const { summary, by_vendor, monthly_trend, items_analysis } = reportData
    
    const exportData = {
      title: t('reports.laundry.pageTitle', 'Báo cáo Giặt là'),
      dateRange,
      sheets: [
        {
          name: 'Tổng quan',
          data: [
            { 'Chỉ số': 'Tổng lô', 'Giá trị': summary.total_batches },
            { 'Chỉ số': 'Tổng items', 'Giá trị': summary.total_items },
            { 'Chỉ số': 'Tổng cân nặng (kg)', 'Giá trị': summary.total_weight },
            { 'Chỉ số': 'Tổng chi phí', 'Giá trị': summary.total_cost },
            { 'Chỉ số': 'Chi phí TB/lô', 'Giá trị': summary.avg_cost_per_batch },
            { 'Chỉ số': 'Chi phí TB/kg', 'Giá trị': summary.avg_cost_per_kg },
            { 'Chỉ số': 'Chất lượng TB', 'Giá trị': summary.avg_quality },
            { 'Chỉ số': 'Tỷ lệ đúng hạn (%)', 'Giá trị': summary.on_time_rate },
          ],
        },
        {
          name: 'Theo nhà cung cấp',
          data: by_vendor.map(v => ({
            'Nhà cung cấp': v.vendor_name,
            'Số lô': v.batches,
            'Items': v.items,
            'Cân nặng (kg)': v.weight,
            'Chi phí': v.cost,
            'Giá/kg': v.cost_per_kg,
            'Chất lượng': v.quality,
            'Đúng hạn (%)': v.on_time_rate,
            'Vấn đề': v.issues,
          })),
        },
        {
          name: 'Xu hướng theo tháng',
          data: monthly_trend.map(m => ({
            'Tháng': m.month,
            'Số lô': m.batches,
            'Items': m.items,
            'Chi phí': m.cost,
          })),
        },
        {
          name: 'Phân tích mặt hàng',
          data: (items_analysis || []).map(item => ({
            'Mã': item.item_code,
            'Tên': item.item_name,
            'Danh mục': item.category_name,
            'Số lần giặt': item.total_washed,
            'Cân nặng (kg)': item.total_weight_kg,
            'Hỏng': item.total_damaged,
            'Mất': item.total_lost,
            'Chi phí ước tính': item.estimated_cost,
          })),
        },
      ],
    }
    await exportToExcel(exportData)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title={t('reports.laundry.pageTitle', 'Báo cáo giặt là')} showBack />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <MobileDetailHeader title={t('reports.laundry.pageTitle', 'Báo cáo giặt là')} showBack />
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Không có dữ liệu</p>
        </div>
      </div>
    )
  }

  const { summary, by_vendor, monthly_trend, period_comparison, processing_stats, damage_breakdown } = reportData

  // Calculate comparison percentages
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const batchesChange = getChangePercent(period_comparison?.current?.batches || 0, period_comparison?.previous?.batches || 0)
  const costChange = getChangePercent(period_comparison?.current?.cost || 0, period_comparison?.previous?.cost || 0)
  const qualityChange = (period_comparison?.current?.avg_quality || 0) - (period_comparison?.previous?.avg_quality || 0)

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title={t('reports.laundry.pageTitle', 'Báo cáo giặt là')}
        showBack
      />

      <div className="p-4 space-y-4">
        {/* Date Range */}
        <Card>
          <CardContent className="p-4">
            <DateRangePicker
              value={{ from: dateRange.start, to: dateRange.end }}
              onChange={(range) => 
                setDateRange({
                  start: range.from || new Date(),
                  end: range.to || new Date(),
                })
              }
            />
          </CardContent>
        </Card>

        {/* Period Comparison Cards */}
        {period_comparison && (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{t('reports.laundry.comparison.batches', 'Số lô')}</p>
                  <div className={`flex items-center gap-0.5 text-xs ${batchesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {batchesChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{Math.abs(batchesChange).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-xl font-bold">{period_comparison.current?.batches || 0}</p>
                <p className="text-xs text-muted-foreground">vs {period_comparison.previous?.batches || 0}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{t('reports.laundry.comparison.cost', 'Chi phí')}</p>
                  <div className={`flex items-center gap-0.5 text-xs ${costChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {costChange <= 0 ? <ArrowDownRight className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                    <span>{Math.abs(costChange).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-xl font-bold">{(summary.total_cost / 1000000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground">vs {((period_comparison.previous?.cost || 0) / 1000000).toFixed(1)}M</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{t('reports.laundry.comparison.quality', 'Chất lượng')}</p>
                  <div className={`flex items-center gap-0.5 text-xs ${qualityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {qualityChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    <span>{qualityChange >= 0 ? '+' : ''}{qualityChange.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <p className="text-xl font-bold">{summary.avg_quality.toFixed(1)}</p>
                </div>
                <p className="text-xs text-muted-foreground">vs {period_comparison.previous?.avg_quality || 0}/5</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{t('reports.laundry.stats.onTimeRate', 'Đúng hạn')}</p>
                </div>
                <p className="text-xl font-bold text-green-600">{summary.on_time_rate}%</p>
                <Progress value={summary.on_time_rate} className="h-1.5 mt-1" />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{summary.total_batches}</p>
              <p className="text-xs text-muted-foreground">{t('reports.laundry.stats.totalBatches', 'Tổng lô')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{(summary.total_cost / 1000000).toFixed(1)}M</p>
              <p className="text-xs text-muted-foreground">{t('reports.laundry.stats.totalCost', 'Chi phí')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{summary.avg_quality.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">{t('reports.laundry.stats.avgQuality', 'Đánh giá TB')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Processing Stats */}
        {processing_stats && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('reports.laundry.processing.title', 'Thời gian xử lý')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-blue-600">{processing_stats.avg_days}</p>
                  <p className="text-xs text-muted-foreground">TB (ngày)</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-green-600">{processing_stats.on_time_count}</p>
                  <p className="text-xs text-muted-foreground">Đúng hạn</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-red-600">{processing_stats.late_count}</p>
                  <p className="text-xs text-muted-foreground">Trễ hạn</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cost Trend Mini Chart */}
        {monthly_trend && monthly_trend.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('reports.laundry.charts.monthlyCost', 'Xu hướng chi phí')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={monthly_trend.slice(-6)}>
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Cost Analysis by Vendor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.laundry.vendorPerformance', 'Chi phí theo nhà cung cấp')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {by_vendor.map((vendor) => (
              <div key={vendor.vendor_id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{vendor.vendor_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{vendor.batches} lô</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs">{vendor.quality.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-primary font-semibold">
                    {formatCurrency(vendor.cost)}
                  </span>
                  <p className="text-xs text-muted-foreground">{formatCurrency(vendor.cost_per_kg)}/kg</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Damage Stats */}
        {damage_breakdown && damage_breakdown.damage_rate > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('reports.laundry.damageBreakdown', 'Tình trạng hư hỏng')}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold text-red-600">{formatCurrency(damage_breakdown.total_damage_value)}</p>
                  <p className="text-xs text-muted-foreground">Giá trị thiệt hại</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-lg font-bold text-orange-600">{damage_breakdown.damage_rate}%</p>
                  <p className="text-xs text-muted-foreground">Tỷ lệ hư hỏng</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Performance Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('reports.laundry.performance', 'Hiệu suất')}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Trung bình/lô</span>
              <span className="font-semibold">{formatCurrency(summary.avg_cost_per_batch)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Trung bình/kg</span>
              <span className="font-semibold">{formatCurrency(summary.avg_cost_per_kg)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">Tổng cân nặng</span>
              <span className="font-semibold">{summary.total_weight.toFixed(0)} kg</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm">Tổng items</span>
              <span className="font-semibold">{summary.total_items.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          className="w-full"
          variant="outline"
          onClick={handleExportExcel}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Đang xuất...' : t('reports.exportExcel', 'Xuất báo cáo Excel')}
        </Button>
      </div>
    </div>
  )
}