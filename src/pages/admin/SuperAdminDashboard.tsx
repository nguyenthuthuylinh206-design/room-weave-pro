import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { TenantStatsCards } from '@/components/admin/TenantStatsCards'
import { RevenueChart } from '@/components/admin/RevenueChart'
import { SubscriptionDistributionChart } from '@/components/admin/SubscriptionDistributionChart'
import { TenantListTable } from '@/components/admin/TenantListTable'
import { TestEmailNotifications } from '@/components/admin/TestEmailNotifications'
import { useSuperAdminStats } from '@/hooks/useSuperAdminStats'
import { useAuth } from '@/hooks/useAuth'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, AlertTriangle } from 'lucide-react'

export function SuperAdminDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { data: stats, isLoading: statsLoading } = useSuperAdminStats()

  useEffect(() => {
    // Check if user is super admin
    if (!authLoading && user && user.role !== 'super_admin') {
      navigate('/dashboard')
    }
  }, [user, authLoading, navigate])

  if (authLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || user.role !== 'super_admin') {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Bạn không có quyền truy cập trang này. Chỉ Super Admin mới có thể xem.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Tổng quan toàn hệ thống, quản lý tenant và doanh thu
          </p>
        </div>
      </div>

      <TenantStatsCards stats={stats} />

      <div className="grid gap-6 md:grid-cols-2">
        <RevenueChart />
        <SubscriptionDistributionChart />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <TestEmailNotifications />
      </div>

      <TenantListTable />
    </div>
  )
}
