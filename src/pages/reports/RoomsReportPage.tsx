import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Home, CheckCircle, AlertTriangle, Wrench } from 'lucide-react'
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
import { MobileRoomsReportPage } from '@/components/reports/MobileRoomsReportPage'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { subDays } from 'date-fns'

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export function RoomsReportPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const chartRefs = useRef<HTMLElement[]>([])
  
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 30),
    end: new Date(),
  })
  
  const { data: dashboardStats, isLoading } = useDashboardStats()
  const { exportToPDF, exportToExcel, isExporting } = useReportExport()

  if (isMobile) {
    return <MobileRoomsReportPage />
  }

  // Room status data from dashboard - use any to bypass type checking
  const data = dashboardStats as any
  const roomStatus = {
    total: data?.total_rooms || 0,
    vacant: data?.vacant_rooms || 0,
    occupied: data?.occupied_rooms || 0,
    cleaning: data?.cleaning_rooms || 0,
    maintenance: data?.maintenance_rooms || 0,
  }

  const utilizationByType = [
    { type: 'Standard', total: 20, occupied: 16, rate: 80 },
    { type: 'Deluxe', total: 15, occupied: 13, rate: 87 },
    { type: 'Suite', total: 10, occupied: 9, rate: 90 },
    { type: 'VIP', total: 5, occupied: 5, rate: 100 },
  ]

  const deficiencyByRoom = [
    { room: '101', type: 'Standard', missing: 3, items: 'Khăn tắm, Dép, Xà phòng' },
    { room: '205', type: 'Deluxe', missing: 2, items: 'Áo choàng, Dầu gội' },
    { room: '302', type: 'Suite', missing: 1, items: 'Khăn mặt' },
  ]

  const checkHistory = {
    total_checks: 45,
    avg_score: 92,
    issues_found: 23,
    issues_resolved: 20,
  }

  const topIssues = [
    { issue: 'Thiếu khăn tắm', count: 8, percentage: 35 },
    { issue: 'Đồ dùng hư hỏng', count: 5, percentage: 22 },
    { issue: 'Thiếu đồ amenity', count: 4, percentage: 17 },
    { issue: 'Cần bảo trì', count: 3, percentage: 13 },
    { issue: 'Khác', count: 3, percentage: 13 },
  ]

  const roomStatusData = [
    { name: 'Trống', value: roomStatus.vacant, color: '#10b981' },
    { name: 'Đang sử dụng', value: roomStatus.occupied, color: '#3b82f6' },
    { name: 'Đang dọn', value: roomStatus.cleaning, color: '#f59e0b' },
    { name: 'Bảo trì', value: roomStatus.maintenance, color: '#ef4444' },
  ].filter(item => item.value > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo Phòng"
        description="Phân tích sử dụng và thiếu hụt đồ dùng phòng"
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
          <TabsTrigger value="utilization">Sử dụng</TabsTrigger>
          <TabsTrigger value="deficiency">Thiếu hụt</TabsTrigger>
          <TabsTrigger value="checks">Kiểm tra</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-blue-50">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tổng phòng</p>
                    <p className="text-3xl font-bold">{roomStatus.total}</p>
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
                    <p className="text-sm text-muted-foreground">Phòng trống</p>
                    <p className="text-3xl font-bold text-green-600">{roomStatus.vacant}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-orange-50">
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Đang dọn</p>
                    <p className="text-3xl font-bold text-orange-600">{roomStatus.cleaning}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-full p-2 bg-red-50">
                    <Wrench className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Bảo trì</p>
                    <p className="text-3xl font-bold text-red-600">{roomStatus.maintenance}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Charts Row */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Room Status Pie Chart */}
            <Card ref={(el) => el && (chartRefs.current[0] = el)}>
              <CardHeader>
                <CardTitle>Trạng thái phòng</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roomStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {roomStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            {/* Top Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Vấn đề thường gặp</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topIssues.map((issue, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{issue.issue}</span>
                        <span className="text-sm text-muted-foreground">{issue.count} lần ({issue.percentage}%)</span>
                      </div>
                      <Progress value={issue.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* TAB 2: Utilization */}
        <TabsContent value="utilization" className="space-y-6">
          <Card ref={(el) => el && (chartRefs.current[1] = el)}>
            <CardHeader>
              <CardTitle>Tỷ lệ sử dụng theo loại phòng</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={utilizationByType} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="type" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(value: number) => `${value}%`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="rate" name="Tỷ lệ sử dụng" fill="#3b82f6" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết theo loại phòng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Loại phòng</TableHead>
                      <TableHead className="text-center">Tổng</TableHead>
                      <TableHead className="text-center">Đang dùng</TableHead>
                      <TableHead className="text-center">Trống</TableHead>
                      <TableHead className="text-center">Tỷ lệ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {utilizationByType.map((room) => (
                      <TableRow key={room.type}>
                        <TableCell className="font-medium">{room.type}</TableCell>
                        <TableCell className="text-center">{room.total}</TableCell>
                        <TableCell className="text-center text-blue-600">{room.occupied}</TableCell>
                        <TableCell className="text-center text-green-600">{room.total - room.occupied}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={room.rate >= 80 ? 'default' : 'secondary'}>
                            {room.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 3: Deficiency */}
        <TabsContent value="deficiency" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Phòng thiếu đồ dùng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phòng</TableHead>
                      <TableHead>Loại</TableHead>
                      <TableHead className="text-center">Số lượng thiếu</TableHead>
                      <TableHead>Đồ dùng thiếu</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deficiencyByRoom.map((room) => (
                      <TableRow key={room.room}>
                        <TableCell className="font-bold">{room.room}</TableCell>
                        <TableCell>{room.type}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{room.missing}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{room.items}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline">
                            Cấp đồ
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 4: Checks */}
        <TabsContent value="checks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Tổng kiểm tra</p>
                <p className="text-3xl font-bold">{checkHistory.total_checks}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Điểm TB</p>
                <p className="text-3xl font-bold text-green-600">{checkHistory.avg_score}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Vấn đề phát hiện</p>
                <p className="text-3xl font-bold text-orange-600">{checkHistory.issues_found}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Đã xử lý</p>
                <p className="text-3xl font-bold text-blue-600">{checkHistory.issues_resolved}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
