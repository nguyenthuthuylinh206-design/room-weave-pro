import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  DollarSign,
  ArrowRightLeft,
  Shirt,
  Home,
  Wrench,
  TrendingUp,
  TrendingDown,
  BarChart3,
  FileText,
  Download,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuickReportMetrics } from '@/components/reports/QuickReportMetrics'
import { FavoriteReports } from '@/components/reports/FavoriteReports'
import { ScheduledReports } from '@/components/reports/ScheduledReports'
import { MobileReportsDashboard } from '@/components/reports/MobileReportsDashboard'
import { StatCard } from '@/components/ui/stat-card'
import { useQuickReport } from '@/hooks/useReports'
import { useIsMobile } from '@/hooks/use-mobile'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useHotelContext } from '@/contexts/HotelContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

const reportCategories = [
  {
    id: 'inventory',
    title: 'Báo cáo Tồn kho',
    icon: Package,
    color: 'bg-blue-500',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600',
    description: 'Hiện trạng tồn kho, vòng quay hàng hóa, phân tích ABC',
    path: '/reports/inventory',
    stats: ['Tổng giá trị', 'Vòng quay', 'Cảnh báo'],
  },
  {
    id: 'financial',
    title: 'Báo cáo Tài chính',
    icon: DollarSign,
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-500/10',
    textColor: 'text-emerald-600',
    description: 'Chi phí hoạt động, giá trị tài sản, ROI, so sánh chi phí',
    path: '/reports/financial',
    stats: ['Doanh thu', 'Chi phí', 'Lợi nhuận'],
  },
  {
    id: 'operations',
    title: 'Báo cáo Hoạt động',
    icon: ArrowRightLeft,
    color: 'bg-violet-500',
    bgColor: 'bg-violet-500/10',
    textColor: 'text-violet-600',
    description: 'Giao dịch nhập xuất, kiểm kê, lịch sử hoạt động',
    path: '/reports/operations',
    stats: ['Nhập kho', 'Xuất kho', 'Điều chỉnh'],
  },
  {
    id: 'laundry',
    title: 'Báo cáo Giặt là',
    icon: Shirt,
    color: 'bg-cyan-500',
    bgColor: 'bg-cyan-500/10',
    textColor: 'text-cyan-600',
    description: 'Chi phí giặt ủi, hiệu suất, đánh giá nhà cung cấp',
    path: '/reports/laundry',
    stats: ['Lô giặt', 'Chi phí', 'Đánh giá'],
  },
  {
    id: 'rooms',
    title: 'Báo cáo Phòng',
    icon: Home,
    color: 'bg-amber-500',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-600',
    description: 'Tình trạng sử dụng, thiếu hụt đồ dùng, lịch sử kiểm tra',
    path: '/reports/rooms',
    stats: ['Tổng phòng', 'Đang dùng', 'Bảo trì'],
  },
  {
    id: 'maintenance',
    title: 'Báo cáo Bảo trì',
    icon: Wrench,
    color: 'bg-rose-500',
    bgColor: 'bg-rose-500/10',
    textColor: 'text-rose-600',
    description: 'Yêu cầu bảo trì, chi phí sửa chữa, thời gian xử lý',
    path: '/reports/maintenance',
    stats: ['Yêu cầu', 'Hoàn thành', 'Chi phí'],
  },
]

export function ReportsDashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const queryClient = useQueryClient()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { data: quickReport, isLoading: isLoadingQuickReport } = useQuickReport(period)
  const { data: dashboardStats, isLoading: isLoadingStats } = useDashboardStats()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['quick-report'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    toast.success('Đã cập nhật dữ liệu báo cáo')
    setIsRefreshing(false)
  }

  // Mobile view
  if (isMobile) {
    return <MobileReportsDashboard />
  }
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Báo cáo & Thống kê"
          description={isAllHotelsMode ? 'Tổng hợp tất cả khách sạn' : `Khách sạn: ${selectedHotel?.name || 'Chưa chọn'}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Xuất tất cả
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng đồ dùng"
          value={dashboardStats?.total_items?.toLocaleString() || '0'}
          icon={Package}
          description="Số lượng đồ dùng trong kho"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Trong kho"
          value={dashboardStats?.in_stock?.toLocaleString() || '0'}
          icon={Home}
          description="Đồ dùng sẵn có"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Tồn kho thấp"
          value={dashboardStats?.low_stock_count?.toLocaleString() || '0'}
          icon={Wrench}
          description="Cần nhập thêm"
          isLoading={isLoadingStats}
        />
        <StatCard
          title="Lô giặt đang xử lý"
          value={dashboardStats?.active_laundry_batches?.toLocaleString() || '0'}
          icon={Shirt}
          description="Chờ nhận hoặc đang giặt"
          isLoading={isLoadingStats}
        />
      </div>
      
      {/* Report Categories */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Chọn loại báo cáo</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Nhấp vào để xem chi tiết từng loại báo cáo
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <BarChart3 className="h-3 w-3 mr-1" />
            {reportCategories.length} loại báo cáo
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportCategories.map((category) => {
            const Icon = category.icon
            
            return (
              <Card
                key={category.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-transparent hover:border-primary/20 overflow-hidden"
                onClick={() => navigate(category.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-xl p-3 ${category.bgColor} transition-transform group-hover:scale-110`}>
                      <Icon className={`h-6 w-6 ${category.textColor}`} />
                    </div>
                    <div className={`h-1.5 w-12 rounded-full ${category.color} opacity-50 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <CardTitle className="mt-4 text-lg group-hover:text-primary transition-colors">
                    {category.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {category.stats.map((stat, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className={`text-xs ${category.textColor} border-current/30`}
                      >
                        {stat}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <FileText className="h-4 w-4 mr-1" />
                    Xem báo cáo →
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      
      {/* Quick Reports */}
      <Card className="border-2">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Báo cáo nhanh</CardTitle>
                <CardDescription>Số liệu tổng hợp theo thời gian</CardDescription>
              </div>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList className="bg-background">
                <TabsTrigger value="today" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  Hôm nay
                </TabsTrigger>
                <TabsTrigger value="week">Tuần này</TabsTrigger>
                <TabsTrigger value="month">Tháng này</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <QuickReportMetrics data={quickReport} period={period} isLoading={isLoadingQuickReport} />
        </CardContent>
      </Card>
      
      {/* Favorite & Scheduled Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FavoriteReports />
        <ScheduledReports />
      </div>
    </div>
  )
}