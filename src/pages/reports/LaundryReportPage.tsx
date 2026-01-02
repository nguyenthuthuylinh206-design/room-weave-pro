import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Download, FileText, Star, TrendingUp, TrendingDown, Lightbulb, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { HotelFilterCard } from '@/components/reports/HotelFilterCard'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Progress } from '@/components/ui/progress'
import { useLaundryReport } from '@/hooks/useReports'
import { useReportExport } from '@/hooks/useReportExport'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileLaundryReportPage } from '@/components/reports/MobileLaundryReportPage'
import { formatCurrency } from '@/lib/utils'
import { subDays, format } from 'date-fns'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export function LaundryReportPage() {
  const { t } = useTranslation()
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const chartRefs = useRef<HTMLElement[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: reportData, isLoading } = useLaundryReport(dateRange)
  const { exportToPDF, exportToExcel, isExporting } = useReportExport()

  if (isMobile) {
    return <MobileLaundryReportPage />
  }
  
  if (isLoading || !reportData) {
    return <div className="flex items-center justify-center h-64">Đang tải...</div>
  }
  
  const { summary, by_vendor, monthly_trend, period_comparison, processing_stats, items_analysis, damage_breakdown, cost_optimization } = reportData

  // Calculate comparison percentages
  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  const batchesChange = getChangePercent(period_comparison?.current?.batches || 0, period_comparison?.previous?.batches || 0)
  const itemsChange = getChangePercent(period_comparison?.current?.items || 0, period_comparison?.previous?.items || 0)
  const costChange = getChangePercent(period_comparison?.current?.cost || 0, period_comparison?.previous?.cost || 0)
  const qualityChange = (period_comparison?.current?.avg_quality || 0) - (period_comparison?.previous?.avg_quality || 0)

  const handleExportPDF = async () => {
    const dateRangeStr = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`
    
    const exportData = {
      title: t('reports.laundry.pageTitle', 'Báo cáo Giặt là'),
      dateRange: dateRangeStr,
      summary: {
        total_batches: summary.total_batches,
        total_items: summary.total_items,
        total_cost: summary.total_cost,
        avg_quality: summary.avg_quality,
        on_time_rate: summary.on_time_rate,
      },
      tables: [
        {
          title: t('reports.laundry.vendorPerformance', 'Hiệu suất nhà cung cấp'),
          headers: ['Đơn vị', 'Số lô', 'Chi phí', '₫/kg', 'Chất lượng', 'Đúng giờ'],
          rows: by_vendor.map(v => [
            v.vendor_name,
            v.batches.toString(),
            formatCurrency(v.cost),
            formatCurrency(v.cost_per_kg),
            `${v.quality}/5`,
            `${v.on_time_rate}%`,
          ]),
        },
      ],
    }
    await exportToPDF(exportData, 'laundry_report', chartRefs.current)
  }

  const handleExportExcel = async () => {
    const dateRangeStr = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`
    
    const exportData = {
      title: t('reports.laundry.pageTitle', 'Báo cáo Giặt là'),
      dateRange: dateRangeStr,
      summary: {
        total_batches: summary.total_batches,
        total_items: summary.total_items,
        total_weight: summary.total_weight,
        total_cost: summary.total_cost,
        avg_cost_per_batch: summary.avg_cost_per_batch,
        avg_cost_per_kg: summary.avg_cost_per_kg,
        avg_quality: summary.avg_quality,
        on_time_rate: summary.on_time_rate,
      },
      tables: [
        {
          title: 'Theo nhà cung cấp',
          headers: ['Nhà cung cấp', 'Số lô', 'Items', 'Cân nặng', 'Chi phí', 'Giá/kg', 'Chất lượng', 'Đúng hạn'],
          rows: by_vendor.map(v => [
            v.vendor_name,
            v.batches,
            v.items,
            v.weight,
            v.cost,
            v.cost_per_kg,
            v.quality,
            v.on_time_rate,
          ]),
        },
        {
          title: 'Xu hướng theo tháng',
          headers: ['Tháng', 'Số lô', 'Items', 'Chi phí'],
          rows: monthly_trend.map(m => [
            m.month,
            m.batches,
            m.items,
            m.cost,
          ]),
        },
        {
          title: 'Phân tích mặt hàng',
          headers: ['Mã', 'Tên', 'Danh mục', 'Số lần giặt', 'Cân nặng', 'Hỏng', 'Mất', 'Chi phí'],
          rows: (items_analysis || []).map(item => [
            item.item_code,
            item.item_name,
            item.category_name,
            item.total_washed,
            item.total_weight_kg,
            item.total_damaged,
            item.total_lost,
            item.estimated_cost,
          ]),
        },
      ],
      chartData: monthly_trend,
    }
    await exportToExcel(exportData, 'laundry_report')
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports.laundry.pageTitle', 'Báo cáo Giặt là')}
        description={t('reports.laundry.pageDescription', 'Phân tích chi phí và hiệu suất dịch vụ giặt là')}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('common.back', 'Quay lại')}
          </Button>
          <Button variant="outline" onClick={handleExportPDF} disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" />
            {t('reports.exportPDF', 'Xuất PDF')}
          </Button>
          <Button variant="outline" onClick={handleExportExcel} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {t('reports.exportExcel', 'Xuất Excel')}
          </Button>
        </div>
      </PageHeader>
      
      {/* Hotel Filter */}
      <HotelFilterCard />
      
      {/* Date Range */}
      <Card>
        <CardContent className="pt-6">
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
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">{t('reports.laundry.tabs.overview', 'Tổng quan')}</TabsTrigger>
          <TabsTrigger value="cost">{t('reports.laundry.tabs.cost', 'Chi phí chi tiết')}</TabsTrigger>
          <TabsTrigger value="quality">{t('reports.laundry.tabs.quality', 'Chất lượng & Dịch vụ')}</TabsTrigger>
          <TabsTrigger value="items">{t('reports.laundry.tabs.items', 'Phân tích mặt hàng')}</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Period Comparison Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('reports.laundry.comparison.batches', 'Số lô')}</p>
                    <p className="text-2xl font-bold">{period_comparison?.current?.batches || 0}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${batchesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {batchesChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{Math.abs(batchesChange).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs kỳ trước: {period_comparison?.previous?.batches || 0}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('reports.laundry.comparison.items', 'Số items')}</p>
                    <p className="text-2xl font-bold">{(period_comparison?.current?.items || 0).toLocaleString()}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${itemsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {itemsChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{Math.abs(itemsChange).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs kỳ trước: {(period_comparison?.previous?.items || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('reports.laundry.comparison.cost', 'Chi phí')}</p>
                    <p className="text-2xl font-bold">{formatCurrency(period_comparison?.current?.cost || 0).replace('₫', '')}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${costChange <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {costChange <= 0 ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    <span>{Math.abs(costChange).toFixed(1)}%</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs kỳ trước: {formatCurrency(period_comparison?.previous?.cost || 0)}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('reports.laundry.comparison.quality', 'Chất lượng')}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                      <p className="text-2xl font-bold">{period_comparison?.current?.avg_quality || 0}</p>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${qualityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {qualityChange >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    <span>{qualityChange >= 0 ? '+' : ''}{qualityChange.toFixed(1)}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  vs kỳ trước: {period_comparison?.previous?.avg_quality || 0}/5
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Processing Stats */}
          {processing_stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-muted-foreground">{t('reports.laundry.processing.avgDays', 'Thời gian xử lý TB')}</p>
                  <p className="text-3xl font-bold">{processing_stats.avg_days}</p>
                  <p className="text-xs text-muted-foreground">ngày</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.laundry.processing.minDays', 'Nhanh nhất')}</p>
                  <p className="text-3xl font-bold text-green-600">{processing_stats.min_days}</p>
                  <p className="text-xs text-muted-foreground">ngày</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.laundry.processing.maxDays', 'Chậm nhất')}</p>
                  <p className="text-3xl font-bold text-red-600">{processing_stats.max_days}</p>
                  <p className="text-xs text-muted-foreground">ngày</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground">{t('reports.laundry.processing.onTime', 'Đúng hạn / Trễ')}</p>
                  <p className="text-3xl font-bold">
                    <span className="text-green-600">{processing_stats.on_time_count}</span>
                    <span className="text-muted-foreground mx-1">/</span>
                    <span className="text-red-600">{processing_stats.late_count}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">lô</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.totalBatches', 'Tổng lô')}</p>
                <p className="text-3xl font-bold">{summary.total_batches}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(summary.total_batches / 30).toFixed(1)} lô/ngày TB
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.totalItems', 'Tổng items')}</p>
                <p className="text-3xl font-bold">{summary.total_items.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(summary.total_items / (summary.total_batches || 1))} items/lô TB
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.totalWeight', 'Cân nặng')}</p>
                <p className="text-3xl font-bold">{summary.total_weight.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  kg • {(summary.total_weight / (summary.total_batches || 1)).toFixed(1)} kg/lô
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.totalCost', 'Chi phí')}</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(summary.total_cost).replace('₫', '')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(summary.avg_cost_per_batch)}/lô
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.avgQuality', 'Chất lượng TB')}</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                  <p className="text-3xl font-bold">{summary.avg_quality.toFixed(1)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">/5.0</p>
              </CardContent>
            </Card>
          </div>
          
          {/* Laundry Trend */}
          <Card ref={(el) => el && (chartRefs.current[0] = el)}>
            <CardHeader>
              <CardTitle>{t('reports.laundry.charts.trend', 'Xu hướng giặt là')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    yAxisId="left"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === 'Chi phí') return formatCurrency(value)
                      return value
                    }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left"
                    dataKey="batches" 
                    name="Số lô"
                    fill="#3b82f6" 
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="items" 
                    name="Items"
                    stroke="#10b981" 
                    strokeWidth={2}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="cost" 
                    name="Chi phí"
                    stroke="#ef4444" 
                    strokeWidth={2}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Cost Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.laundry.charts.costAnalysis', 'Phân tích chi phí')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Chi phí/kg</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary.avg_cost_per_kg)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Chi phí/item</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary.total_cost / (summary.total_items || 1))}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Chi phí/lô</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(summary.avg_cost_per_batch)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Tỷ lệ đúng hạn</p>
                    <p className="text-2xl font-bold">{summary.on_time_rate}%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Vendor Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.laundry.vendorPerformance', 'So sánh hiệu suất nhà cung cấp')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Đơn vị</TableHead>
                      <TableHead className="text-center">Số lô</TableHead>
                      <TableHead className="text-center">Items</TableHead>
                      <TableHead className="text-right">Chi phí</TableHead>
                      <TableHead className="text-right">₫/kg</TableHead>
                      <TableHead className="text-center">Chất lượng</TableHead>
                      <TableHead className="text-center">Đúng giờ</TableHead>
                      <TableHead className="text-center">Vấn đề</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {by_vendor.map((vendor) => {
                      const score = (
                        (vendor.quality / 5) * 40 +
                        (vendor.on_time_rate / 100) * 40 +
                        (vendor.issues === 0 ? 20 : Math.max(0, 20 - vendor.issues * 5))
                      )
                      
                      return (
                        <TableRow key={vendor.vendor_id}>
                          <TableCell className="font-medium">{vendor.vendor_name}</TableCell>
                          <TableCell className="text-center">{vendor.batches}</TableCell>
                          <TableCell className="text-center">{vendor.items}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(vendor.cost)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(vendor.cost_per_kg)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{vendor.quality.toFixed(1)}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Progress value={vendor.on_time_rate} className="h-2 w-16" />
                              <span className="text-xs">{vendor.on_time_rate.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {vendor.issues > 0 ? (
                              <Badge variant="destructive">{vendor.issues}</Badge>
                            ) : (
                              <span className="text-green-600">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={
                              score >= 80 ? 'bg-green-100 text-green-800' :
                              score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {score.toFixed(1)}/100
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          
          {/* Cost Optimization Opportunities */}
          {cost_optimization && (
            <Card className="border-blue-200">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-blue-600">{t('reports.laundry.costOptimization', '💡 Cơ hội tiết kiệm')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cost_optimization.cheapest_vendor && cost_optimization.most_expensive_vendor && (
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">So sánh giá nhà cung cấp</p>
                          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <li>• Rẻ nhất: <span className="text-green-600 font-medium">{cost_optimization.cheapest_vendor.name}</span> - {formatCurrency(cost_optimization.cheapest_vendor.cost_per_kg)}/kg</li>
                            <li>• Đắt nhất: <span className="text-red-600 font-medium">{cost_optimization.most_expensive_vendor.name}</span> - {formatCurrency(cost_optimization.most_expensive_vendor.cost_per_kg)}/kg</li>
                          </ul>
                        </div>
                        {cost_optimization.potential_monthly_savings > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            Tiết kiệm: {formatCurrency(cost_optimization.potential_monthly_savings)}/tháng
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* TAB 2: Cost Detail */}
        <TabsContent value="cost" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.laundry.charts.monthlyCost', 'Chi phí hàng tháng')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(0)}M`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="cost" name="Chi phí" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Cost by Vendor Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.laundry.charts.costByVendor', 'Chi phí theo nhà cung cấp')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={by_vendor.map(v => ({ name: v.vendor_name, value: v.cost }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {by_vendor.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-3">
                  {by_vendor.map((vendor, index) => (
                    <div key={vendor.vendor_id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium">{vendor.vendor_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(vendor.cost)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(vendor.cost_per_kg)}/kg</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 3: Quality & Service */}
        <TabsContent value="quality" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.avgQuality', 'Chất lượng TB')}</p>
                <div className="flex items-center justify-center gap-1 my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${
                        i < Math.round(summary.avg_quality)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-2xl font-bold">{summary.avg_quality.toFixed(1)}/5.0</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.timeliness', 'Đúng giờ TB')}</p>
                <div className="flex items-center justify-center gap-1 my-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-6 w-6 ${
                        i < Math.round(summary.avg_timeliness)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-2xl font-bold">{summary.avg_timeliness.toFixed(1)}/5.0</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">{t('reports.laundry.stats.onTimeRate', 'Tỷ lệ đúng hạn')}</p>
                <p className="text-4xl font-bold my-2">{summary.on_time_rate.toFixed(0)}%</p>
                <Progress value={summary.on_time_rate} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* Damage Breakdown */}
          {damage_breakdown && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <CardTitle>{t('reports.laundry.damageBreakdown', 'Phân tích hư hỏng')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Tổng giá trị thiệt hại</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(damage_breakdown.total_damage_value)}</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Tỷ lệ hư hỏng</p>
                    <p className="text-2xl font-bold text-orange-600">{damage_breakdown.damage_rate}%</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-sm text-muted-foreground">Số items có vấn đề</p>
                    <p className="text-2xl font-bold">{(damage_breakdown.by_item || []).length}</p>
                  </div>
                </div>
                
                {damage_breakdown.by_item && damage_breakdown.by_item.length > 0 && (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên item</TableHead>
                          <TableHead className="text-center">Hỏng</TableHead>
                          <TableHead className="text-center">Mất</TableHead>
                          <TableHead className="text-right">Giá trị thiệt hại</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {damage_breakdown.by_item.slice(0, 10).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell className="text-center">
                              {item.damaged > 0 ? (
                                <Badge variant="outline" className="text-orange-600">{item.damaged}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.lost > 0 ? (
                                <Badge variant="destructive">{item.lost}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right text-red-600 font-medium">
                              {formatCurrency(item.value)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>{t('reports.laundry.charts.qualityTrend', 'Xu hướng chất lượng')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="month" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    domain={[0, 5]}
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="quality" 
                    name="Chất lượng"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="timeliness" 
                    name="Đúng giờ"
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Items Analysis */}
        <TabsContent value="items" className="space-y-6">
          {items_analysis && items_analysis.length > 0 ? (
            <>
              {/* Top Items Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.laundry.charts.topItems', 'Top 10 Items theo số lần giặt')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={items_analysis.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis 
                        dataKey="item_name" 
                        type="category" 
                        width={150}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="total_washed" name="Số lần giặt" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Items Table */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('reports.laundry.itemsAnalysis', 'Chi tiết phân tích mặt hàng')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Mã</TableHead>
                          <TableHead>Tên item</TableHead>
                          <TableHead>Danh mục</TableHead>
                          <TableHead className="text-center">Số lần giặt</TableHead>
                          <TableHead className="text-center">Cân nặng (kg)</TableHead>
                          <TableHead className="text-center">Hỏng</TableHead>
                          <TableHead className="text-center">Mất</TableHead>
                          <TableHead className="text-right">Chi phí ước tính</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items_analysis.map((item) => (
                          <TableRow key={item.item_id}>
                            <TableCell className="font-mono text-sm">{item.item_code}</TableCell>
                            <TableCell className="font-medium">{item.item_name}</TableCell>
                            <TableCell>{item.category_name}</TableCell>
                            <TableCell className="text-center">{item.total_washed}</TableCell>
                            <TableCell className="text-center">{item.total_weight_kg.toFixed(1)}</TableCell>
                            <TableCell className="text-center">
                              {item.total_damaged > 0 ? (
                                <Badge variant="outline" className="text-orange-600">{item.total_damaged}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.total_lost > 0 ? (
                                <Badge variant="destructive">{item.total_lost}</Badge>
                              ) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.estimated_cost)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('reports.laundry.noItemsData', 'Không có dữ liệu phân tích mặt hàng trong kỳ này')}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}