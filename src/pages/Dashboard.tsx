import { PageHeader } from '@/components/shared/PageHeader'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Hotel, Wind, AlertTriangle } from 'lucide-react'
import { useUser } from '@/hooks/useUser'

export default function Dashboard() {
  const { user } = useUser()

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Chào mừng trở lại, ${user?.full_name || 'User'}!`}
        description="Tổng quan hệ thống quản lý tài sản khách sạn"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng tài sản"
          value="3,456"
          description="items"
          icon={Package}
        />
        <StatCard
          title="Tổng phòng"
          value="125"
          description="rooms"
          icon={Hotel}
        />
        <StatCard
          title="Đang giặt"
          value="456"
          description="items"
          icon={Wind}
        />
        <StatCard
          title="Cảnh báo"
          value="23"
          description="items cần bổ sung"
          icon={AlertTriangle}
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
