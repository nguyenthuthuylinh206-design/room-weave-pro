import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  DollarSign,
  ArrowRightLeft,
  Shirt,
  Home,
  Wrench,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuickReportMetrics } from '@/components/reports/QuickReportMetrics'
import { FavoriteReports } from '@/components/reports/FavoriteReports'
import { ScheduledReports } from '@/components/reports/ScheduledReports'
import { MobileReportsDashboard } from '@/components/reports/MobileReportsDashboard'
import { useQuickReport } from '@/hooks/useReports'
import { useIsMobile } from '@/hooks/use-mobile'

const reportCategories = [
  {
    id: 'inventory',
    title: 'Tồn kho',
    icon: Package,
    color: 'text-blue-600 bg-blue-50',
    description: 'Hiện trạng, vòng quay, ABC phân tích',
    path: '/reports/inventory',
  },
  {
    id: 'financial',
    title: 'Tài chính',
    icon: DollarSign,
    color: 'text-green-600 bg-green-50',
    description: 'Chi phí, giá trị, ROI, so sánh',
    path: '/reports/financial',
  },
  {
    id: 'operations',
    title: 'Hoạt động',
    icon: ArrowRightLeft,
    color: 'text-purple-600 bg-purple-50',
    description: 'Nhập xuất, kiểm kê, giao dịch',
    path: '/reports/operations',
  },
  {
    id: 'laundry',
    title: 'Giặt là',
    icon: Shirt,
    color: 'text-cyan-600 bg-cyan-50',
    description: 'Chi phí, hiệu suất, nhà cung cấp',
    path: '/reports/laundry',
  },
  {
    id: 'rooms',
    title: 'Phòng',
    icon: Home,
    color: 'text-orange-600 bg-orange-50',
    description: 'Sử dụng, thiếu hụt, kiểm tra',
    path: '/reports/rooms',
  },
  {
    id: 'maintenance',
    title: 'Bảo trì',
    icon: Wrench,
    color: 'text-red-600 bg-red-50',
    description: 'Yêu cầu, chi phí, thời gian',
    path: '/reports/maintenance',
  },
]

export function ReportsDashboardPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { data: quickReport } = useQuickReport(period)

  // Mobile view
  if (isMobile) {
    return <MobileReportsDashboard />
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo cáo & Thống kê"
        description="Phân tích dữ liệu và insights cho quản lý"
      />
      
      {/* Report Categories */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Chọn loại báo cáo</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportCategories.map((category) => {
            const Icon = category.icon
            
            return (
              <Card
                key={category.id}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={() => navigate(category.path)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-3 ${category.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle>{category.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {category.description}
                  </p>
                  <button className="text-sm font-medium text-primary hover:underline">
                    Xem báo cáo →
                  </button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      
      {/* Quick Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Báo cáo nhanh</CardTitle>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList>
                <TabsTrigger value="today">Hôm nay</TabsTrigger>
                <TabsTrigger value="week">Tuần này</TabsTrigger>
                <TabsTrigger value="month">Tháng này</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <QuickReportMetrics data={quickReport} period={period} />
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
