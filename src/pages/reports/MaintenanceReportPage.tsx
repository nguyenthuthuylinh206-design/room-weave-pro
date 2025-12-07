import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Wrench, Clock, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react'
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
  BarChart,
  Bar,
  LineChart,
  Line,
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
import { useReportExport } from '@/hooks/useReportExport'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileMaintenanceReportPage } from '@/components/reports/MobileMaintenanceReportPage'
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard'
import { formatCurrency } from '@/lib/utils'
import { subDays } from 'date-fns'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function MaintenanceReportPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const chartRefs = useRef<HTMLElement[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: maintenanceData, isLoading } = useMaintenanceDashboard()
  const { exportToPDF, exportToExcel, isExporting } = useReportExport()

  if (isMobile) {
    return <MobileMaintenanceReportPage />
  }

  const rawStats = maintenanceData?.stats
  const stats = {
    total_requests: rawStats?.total || 0,
    in_progress: rawStats?.inProgress || 0,
    completed: rawStats?.completed || 0,
    completion_rate: rawStats?.completionRate || 0,
    avg_mttr: rawStats?.mttr || 0,
    total_cost: rawStats?.costLast30Days || 0,
    avg_mtbf: rawStats?.mtbf || 0,
    first_time_fix_rate: rawStats?.firstTimeFixRate || 0,
  }

  const costByType = [
    { type: 'Điện', cost: 2500000, percentage: 35 },
    { type: 'Nước', cost: 1800000, percentage: 25 },
    { type: 'Điều hòa', cost: 1500000, percentage: 21 },
    { type: 'Đồ gỗ', cost: 800000, percentage: 11 },
    { type: 'Khác', cost: 600000, percentage: 8 },
  ]

  const monthlyTrend = [
    { month: 'T10', requests: 25, cost: 5200000, completed: 23 },
    { month: 'T11', requests: 32, cost: 6800000, completed: 28 },
    { month: 'T12', requests: 18, cost: 4500000, completed: 15 },
  ]

  const recurringIssues = [
    { issue: 'Điều hòa không lạnh', count: 8, avg_time: 2.5 },
    { issue: 'Vòi nước rỉ', count: 6, avg_time: 1.2 },
    { issue: 'Bóng đèn cháy', count: 5, avg_time: 0.5 },
    { issue: 'Ổ khóa hỏng', count: 4, avg_time: 1.8 },
    { issue: 'TV không hoạt động', count: 3, avg_time: 3.0 },
  ]

  const statusDistribution = [
    { name: 'Hoàn thành', value: stats.completed, color: '#10b981' },
    { name: 'Đang xử lý', value: stats.in_progress, color: '#3b82f6' },
    { name: 'Chờ xử lý', value: stats.total_requests - stats.completed - stats.in_progress, color: '#f59e0b' },
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo Bảo trì"
        description="Phân tích yêu cầu bảo trì và chi phí"
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
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Kỳ báo cáo:</label>
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
        </CardContent>
      </Card>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="costs">Chi phí</TabsTrigger>
          <TabsTrigger value="performance">Hiệu suất</TabsTrigger>
          <TabsTrigger value="issues">Vấn đề</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-blue-50">
                    <Wrench className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng yêu cầu</p>
                    <p className="text-3xl font-bold">{stats.total_requests}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-green-50">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hoàn thành</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-orange-50">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MTTR (TB)</p>
                    <p className="text-3xl font-bold">{stats.avg_mttr}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-purple-50">
                    <DollarSign className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng chi phí</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.total_cost)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Status Distribution */}
            <Card ref={(el) => el && (chartRefs.current[0] = el)}>
              <CardHeader>
                <CardTitle>Phân bổ trạng thái</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Monthly Trend */}
            <Card ref={(el) => el && (chartRefs.current[1] = el)}>
              <CardHeader>
                <CardTitle>Xu hướng theo tháng</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="requests" name="Yêu cầu" fill="#3b82f6" />
                    <Bar dataKey="completed" name="Hoàn thành" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* TAB 2: Costs */}
        <TabsContent value="costs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Chi phí theo loại bảo trì</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costByType.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.type}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(item.cost)}
                        </span>
                        <Badge variant="secondary">{item.percentage}%</Badge>
                      </div>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card ref={(el) => el && (chartRefs.current[2] = el)}>
            <CardHeader>
              <CardTitle>Xu hướng chi phí</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
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
                    dataKey="cost" 
                    name="Chi phí"
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 3: Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Tỷ lệ hoàn thành</p>
                <p className="text-3xl font-bold text-green-600">{stats.completion_rate}%</p>
                <Progress value={stats.completion_rate} className="h-2 mt-2" />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">MTTR (Mean Time To Repair)</p>
                <p className="text-3xl font-bold">{stats.avg_mttr}h</p>
                <p className="text-xs text-muted-foreground mt-1">Thời gian sửa chữa TB</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">MTBF</p>
                <p className="text-3xl font-bold">{stats.avg_mtbf} ngày</p>
                <p className="text-xs text-muted-foreground mt-1">Thời gian giữa các lỗi</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Sửa đúng lần đầu</p>
                <p className="text-3xl font-bold text-blue-600">{stats.first_time_fix_rate}%</p>
                <Progress value={stats.first_time_fix_rate} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* TAB 4: Issues */}
        <TabsContent value="issues" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vấn đề thường xảy ra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Vấn đề</TableHead>
                      <TableHead className="text-center">Số lần</TableHead>
                      <TableHead className="text-center">Thời gian TB (h)</TableHead>
                      <TableHead>Xu hướng</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recurringIssues.map((issue, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>{issue.issue}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{issue.count}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{issue.avg_time}</TableCell>
                        <TableCell>
                          <div className="w-20">
                            <Progress value={(issue.count / 10) * 100} className="h-2" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
