import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, TrendingUp, TrendingDown } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DateRangePicker } from '@/components/shared/DateRangePicker'
import { HotelFilterCard } from '@/components/reports/HotelFilterCard'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { useFinancialReport } from '@/hooks/useReports'
import { useReportExport } from '@/hooks/useReportExport'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileFinancialReportPage } from '@/components/reports/MobileFinancialReportPage'
import { formatCurrency } from '@/lib/utils'
import { subDays } from 'date-fns'
import { cn } from '@/lib/utils'

export function FinancialReportPage() {
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const chartRefs = useRef<HTMLElement[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: reportData, isLoading } = useFinancialReport(dateRange)
  const { exportToPDF, exportToExcel, isExporting } = useReportExport()

  if (isMobile) {
    return <MobileFinancialReportPage />
  }
  
  if (isLoading || !reportData) {
    return <div>Loading...</div>
  }
  
  // Handle both old and new API response structure
  const summary = (reportData as any).cost_summary || (reportData as any).summary || {
    total_cost: 0,
    purchase_cost: 0,
    laundry_cost: 0,
    maintenance_cost: 0
  }
  const monthly_trend = reportData.monthly_trend || []
  const cost_by_category = (reportData as any).cost_by_category || []
  
  // Calculate percentages safely
  const totalCost = summary.total_cost || 0
  const purchasePercent = totalCost > 0 ? (summary.purchase_cost / totalCost) * 100 : 0
  const laundryPercent = totalCost > 0 ? (summary.laundry_cost / totalCost) * 100 : 0
  const maintenancePercent = totalCost > 0 ? (summary.maintenance_cost / totalCost) * 100 : 0
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo Tài chính"
        description="Phân tích chi phí và hiệu quả tài chính"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          <Button variant="outline" onClick={() => exportToPDF({
            title: 'Báo cáo Tài chính',
            dateRange: `${dateRange.start.toLocaleDateString('vi-VN')} - ${dateRange.end.toLocaleDateString('vi-VN')}`,
            summary,
          }, 'financial')} disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>
          <Button variant="outline" onClick={() => exportToExcel({
            title: 'Báo cáo Tài chính',
            dateRange: `${dateRange.start.toLocaleDateString('vi-VN')} - ${dateRange.end.toLocaleDateString('vi-VN')}`,
            summary,
          }, 'financial')} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            Xuất Excel
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
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="purchase">Mua sắm</TabsTrigger>
          <TabsTrigger value="laundry">Giặt là</TabsTrigger>
          <TabsTrigger value="maintenance">Bảo trì</TabsTrigger>
          <TabsTrigger value="roi">ROI & Hiệu quả</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Total Costs */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                <p className="text-3xl font-bold">{formatCurrency(summary.total_cost)}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Chi phí mua sắm</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.purchase_cost)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={purchasePercent} className="h-2" />
                  <span className="text-xs text-muted-foreground">{purchasePercent.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Chi phí giặt là</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.laundry_cost)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={laundryPercent} className="h-2" />
                  <span className="text-xs text-muted-foreground">{laundryPercent.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Chi phí bảo trì</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.maintenance_cost)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={maintenancePercent} className="h-2" />
                  <span className="text-xs text-muted-foreground">{maintenancePercent.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Cost Trend */}
          <Card ref={(el) => el && (chartRefs.current[0] = el)}>
            <CardHeader>
              <CardTitle>Xu hướng chi phí</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthly_trend}>
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
                  <Line 
                    type="monotone" 
                    dataKey="purchase" 
                    name="Mua sắm"
                    stroke="#10b981" 
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="laundry" 
                    name="Giặt là"
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="maintenance" 
                    name="Bảo trì"
                    stroke="#f97316" 
                    strokeWidth={2}
                    dot={{ fill: '#f97316', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Cost Breakdown by Category */}
          <Card ref={(el) => el && (chartRefs.current[1] = el)}>
            <CardHeader>
              <CardTitle>Chi phí theo danh mục</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={monthly_trend}>
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
                  <Area 
                    type="monotone" 
                    dataKey="purchase" 
                    name="Mua sắm"
                    stackId="1"
                    stroke="#10b981" 
                    fill="#10b981"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="laundry" 
                    name="Giặt là"
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="maintenance" 
                    name="Bảo trì"
                    stackId="1"
                    stroke="#f97316" 
                    fill="#f97316"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Budget vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Ngân sách vs Thực tế</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Mua sắm</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(summary.purchase_cost)} / 20M
                      </span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        90%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={90} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Giặt là</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(summary.laundry_cost)} / 10M
                      </span>
                      <Badge variant="default" className="bg-yellow-100 text-yellow-800">
                        120% Vượt
                      </Badge>
                    </div>
                  </div>
                  <Progress value={120} className="h-2" />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Bảo trì</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(summary.maintenance_cost)} / 3M
                      </span>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        83%
                      </Badge>
                    </div>
                  </div>
                  <Progress value={83} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 2: ROI & Efficiency */}
        <TabsContent value="roi" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chỉ số hiệu quả hoạt động (KPIs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Inventory Turnover Ratio</p>
                    <Badge variant="secondary">8.1x</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hiện tại</span>
                      <span className="font-medium">8.1x</span>
                    </div>
                    <Progress value={67.5} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Benchmark</span>
                      <span className="font-medium">10-12x</span>
                    </div>
                  </div>
                  <p className="text-xs text-orange-600">
                    🟡 Dưới trung bình ngành
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Chi phí/Phòng/Tháng</p>
                    <Badge variant="default">450k ₫</Badge>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold">450,000 ₫</p>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mua sắm:</span>
                      <span>180k</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Giặt là:</span>
                      <span>200k</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bảo trì:</span>
                      <span>70k</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Chi phí/Đêm khách</p>
                    <Badge variant="default">150k ₫</Badge>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold">150,000 ₫</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs justify-center">
                    <TrendingDown className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">-5% vs tháng trước</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Chi phí vải/Phòng/Tháng</p>
                    <Badge variant="default">180k ₫</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hiện tại</span>
                      <span className="font-medium">180k</span>
                    </div>
                    <Progress value={90} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Benchmark</span>
                      <span className="font-medium">150-200k</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600">
                    ✓ Trong khoảng chuẩn
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Tỷ lệ chi phí bảo trì</p>
                    <Badge variant="default">2.5%</Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hiện tại</span>
                      <span className="font-medium">2.5%</span>
                    </div>
                    <Progress value={83} className="h-2" />
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Benchmark</span>
                      <span className="font-medium">2-3%</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600">
                    ✓ Trong kiểm soát
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Par Level Efficiency</p>
                    <Badge variant="default">92%</Badge>
                  </div>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold">92%</p>
                  </div>
                  <p className="text-xs text-green-600 text-center">
                    ✓ Hiệu quả tốt
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="text-green-600">✓ Điểm mạnh</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>Chi phí bảo trì trong mức kiểm soát (2.5%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>Tỷ lệ sử dụng tốt (68%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>On-time delivery từ vendors: 92%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600">•</span>
                    <span>Chi phí/đêm khách giảm 5%</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="text-orange-600">⚠️ Cần cải thiện</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600">•</span>
                      <span className="font-medium">
                        Vòng quay kho thấp hơn benchmark (8.1 vs 10-12)
                      </span>
                    </div>
                    <p className="ml-4 text-xs text-muted-foreground">
                      → Đề xuất: Giảm tồn kho slow-moving items
                    </p>
                  </li>
                  <li className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600">•</span>
                      <span className="font-medium">
                        Chi phí giặt là cao (+20% vs budget)
                      </span>
                    </div>
                    <p className="ml-4 text-xs text-muted-foreground">
                      → Đề xuất: Đàm phán lại giá hoặc xem xét in-house laundry
                    </p>
                  </li>
                  <li className="space-y-1">
                    <div className="flex items-start gap-2">
                      <span className="text-orange-600">•</span>
                      <span className="font-medium">
                        12 items overstock
                      </span>
                    </div>
                    <p className="ml-4 text-xs text-muted-foreground">
                      → Đề xuất: Tạm dừng order, sử dụng hết tồn
                    </p>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
          
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-600">🎯 Mục tiêu 3 tháng tới</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Tăng vòng quay kho lên 10x</p>
                    <p className="text-xs text-muted-foreground">Hiện tại: 8.1x</p>
                  </div>
                  <Badge>+23%</Badge>
                </div>
                <Progress value={81} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Giảm chi phí giặt 10%</p>
                    <p className="text-xs text-muted-foreground">Tiết kiệm: 1.2M/tháng</p>
                  </div>
                  <Badge>-10%</Badge>
                </div>
                <Progress value={0} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Giảm tồn kho chậm luân chuyển 30%</p>
                    <p className="text-xs text-muted-foreground">12 items → 8 items</p>
                  </div>
                  <Badge>-30%</Badge>
                </div>
                <Progress value={0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
