import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Hotel, Wind, AlertTriangle } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'

export default function Dashboard() {
  const { user } = useUser()
  const { data: stats, isLoading } = useDashboardStats()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Chào mừng trở lại, ${user?.full_name || 'User'}!`}
          description="Tổng quan hệ thống quản lý tài sản khách sạn"
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard title="" value="" icon={Package} isLoading />
          <DashboardStatCard title="" value="" icon={Hotel} isLoading />
          <DashboardStatCard title="" value="" icon={Wind} isLoading />
          <DashboardStatCard title="" value="" icon={AlertTriangle} isLoading />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chào mừng trở lại, ${user?.full_name || 'User'}!`}
        description="Tổng quan hệ thống quản lý tài sản khách sạn"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashboardStatCard
          title="Tổng giá trị tài sản"
          value={new Intl.NumberFormat('vi-VN').format(stats?.total_value || 0)}
          icon={Package}
          change={{
            value: stats?.total_value_change_percent || null,
            label: 'so với tháng trước'
          }}
          description="VNĐ"
        />
        <DashboardStatCard
          title="Tổng số tài sản"
          value={new Intl.NumberFormat('vi-VN').format(stats?.total_items || 0)}
          icon={Package}
          description={`${stats?.in_stock || 0} trong kho`}
        />
        <DashboardStatCard
          title="Đang giặt"
          value={new Intl.NumberFormat('vi-VN').format(stats?.in_laundry || 0)}
          icon={Wind}
          description={`${stats?.active_laundry_batches || 0} lô đang xử lý`}
        />
        <DashboardStatCard
          title="Cảnh báo tồn kho"
          value={stats?.low_stock_count || 0}
          icon={AlertTriangle}
          description="items cần bổ sung"
        />
      </div>

      {/* Placeholder content */}
      <Card>
        <CardHeader>
          <CardTitle>Chào mừng!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Dashboard đầy đủ với biểu đồ và dữ liệu thực tế sẽ được xây dựng trong các prompt tiếp theo.
            Hiện tại đây là layout cơ bản để kiểm tra routing và authentication.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
