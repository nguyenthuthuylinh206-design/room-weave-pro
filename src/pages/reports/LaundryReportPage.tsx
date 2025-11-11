import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Star, TrendingUp, Lightbulb } from 'lucide-react'
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
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { useLaundryReport } from '@/hooks/useReports'
import { useReportExport } from '@/hooks/useReportExport'
import { formatCurrency } from '@/lib/utils'
import { subDays } from 'date-fns'

export function LaundryReportPage() {
  const navigate = useNavigate()
  const chartRefs = useRef<HTMLElement[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: reportData, isLoading } = useLaundryReport(dateRange)
  const { exportToPDF, exportToExcel, isExporting } = useReportExport()
  
  if (isLoading || !reportData) {
    return <div>Loading...</div>
  }
  
  const { summary, by_vendor, monthly_trend } = reportData
  
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
          <Button variant="outline" disabled={isExporting}>
            <FileText className="mr-2 h-4 w-4" />
            Xuất PDF
          </Button>
          <Button variant="outline" disabled={isExporting}>
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
          <TabsTrigger value="cost">Chi phí chi tiết</TabsTrigger>
          <TabsTrigger value="quality">Chất lượng & Dịch vụ</TabsTrigger>
          <TabsTrigger value="items">Phân tích mặt hàng</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Tổng lô</p>
                <p className="text-3xl font-bold">{summary.total_batches}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(summary.total_batches / 30).toFixed(1)} lô/ngày TB
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Tổng items</p>
                <p className="text-3xl font-bold">{summary.total_items.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(summary.total_items / summary.total_batches)} items/lô TB
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Cân nặng</p>
                <p className="text-3xl font-bold">{summary.total_weight.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  kg • {(summary.total_weight / summary.total_batches).toFixed(1)} kg/lô
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Chi phí</p>
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
                <p className="text-sm text-muted-foreground">Chất lượng TB</p>
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
              <CardTitle>Xu hướng giặt là</CardTitle>
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
              <CardTitle>Phân tích chi phí</CardTitle>
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
                      {formatCurrency(summary.total_cost / summary.total_items)}
                    </p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Chi phí/phòng/tháng</p>
                    <p className="text-2xl font-bold">180,000 ₫</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Ước tính cho 50 phòng
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">% Chi phí vận hành</p>
                    <p className="text-2xl font-bold">36.9%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Vendor Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>So sánh hiệu suất nhà cung cấp</CardTitle>
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
          <Card className="border-blue-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-blue-600">💡 Cơ hội tiết kiệm</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">Đàm phán giá với Vendor ABC</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>• Giá hiện tại: {formatCurrency(by_vendor[0]?.cost_per_kg)}/kg</li>
                        <li>• Vendor XYZ offer: 3,200 ₫/kg</li>
                        <li>• Tiết kiệm: ~900k/tháng nếu chuyển hoặc renegotiate</li>
                      </ul>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Tiết kiệm: 10.8M/năm
                    </Badge>
                  </div>
                </div>
                
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">Giảm tần suất giặt một số items</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>• Chăn: Có thể giặt 2 tuần/lần thay vì mỗi tuần</li>
                        <li>• Rèm cửa: Giặt 1 tháng/lần thay vì 2 tuần</li>
                        <li>• Tiết kiệm ước tính: 500k/tháng</li>
                      </ul>
                    </div>
                    <Badge className="bg-green-100 text-green-800">
                      Tiết kiệm: 6M/năm
                    </Badge>
                  </div>
                </div>
                
                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold">Xem xét in-house laundry</p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <li>• Đầu tư máy giặt công nghiệp: 50M ₫</li>
                        <li>• Tiết kiệm hàng tháng: 3M ₫</li>
                        <li>• Thời gian hoàn vốn: 17 tháng</li>
                        <li>• ROI: 72%/năm</li>
                      </ul>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      ROI: 72%
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 2: Cost Detail */}
        <TabsContent value="cost" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chi phí hàng tháng</CardTitle>
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
          
          <Card>
            <CardHeader>
              <CardTitle>Chi phí theo loại đồ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại đồ</TableHead>
                      <TableHead className="text-center">Lần giặt</TableHead>
                      <TableHead className="text-center">TB/tháng</TableHead>
                      <TableHead className="text-right">Chi phí</TableHead>
                      <TableHead className="text-right">% Tổng</TableHead>
                      <TableHead className="text-right">₫/lần</TableHead>
                      <TableHead className="text-center">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Khăn tắm</TableCell>
                      <TableCell className="text-center">500</TableCell>
                      <TableCell className="text-center">167</TableCell>
                      <TableCell className="text-right">{formatCurrency(5000000)}</TableCell>
                      <TableCell className="text-right">42%</TableCell>
                      <TableCell className="text-right">{formatCurrency(10000)}</TableCell>
                      <TableCell className="text-center">→</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ga giường</TableCell>
                      <TableCell className="text-center">200</TableCell>
                      <TableCell className="text-center">67</TableCell>
                      <TableCell className="text-right">{formatCurrency(4000000)}</TableCell>
                      <TableCell className="text-right">33%</TableCell>
                      <TableCell className="text-right">{formatCurrency(20000)}</TableCell>
                      <TableCell className="text-center">
                        <TrendingUp className="h-4 w-4 text-red-600 mx-auto" />
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Khăn mặt</TableCell>
                      <TableCell className="text-center">300</TableCell>
                      <TableCell className="text-center">100</TableCell>
                      <TableCell className="text-right">{formatCurrency(1500000)}</TableCell>
                      <TableCell className="text-right">13%</TableCell>
                      <TableCell className="text-right">{formatCurrency(5000)}</TableCell>
                      <TableCell className="text-center">→</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 3: Quality & Service */}
        <TabsContent value="quality" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-muted-foreground">Chất lượng TB</p>
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
                <p className="text-sm text-muted-foreground">Đúng giờ TB</p>
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
                <p className="text-sm text-muted-foreground">Tỷ lệ đúng hạn</p>
                <p className="text-4xl font-bold my-2">{summary.on_time_rate.toFixed(0)}%</p>
                <Progress value={summary.on_time_rate} className="h-2" />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Xu hướng chất lượng</CardTitle>
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
      </Tabs>
    </div>
  )
}
