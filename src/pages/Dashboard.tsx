import { Navigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { ExpenseChart } from '@/components/dashboard/ExpenseChart'
import { TopItemsTable } from '@/components/dashboard/TopItemsTable'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { MobileDashboard } from '@/components/dashboard/MobileDashboard'
import { HotelBreakdownCards } from '@/components/dashboard/HotelBreakdownCards'
import { OwnerDashboard } from '@/components/dashboard/owner'
import { ShiftCheckInCard } from '@/components/staff/ShiftCheckInCard'
import { StaffTasksTab } from '@/components/housekeeping/StaffTasksTab'
import { Package, Wind, AlertTriangle, BarChart3 } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useUserModulePermissions } from '@/hooks/useUserModulePermissions'
import { useHotelContext } from '@/contexts/HotelContext'
import { useBreakpoint } from '@/lib/breakpoints'
import { useTranslation } from 'react-i18next'
import { isTenantOwner, isSuperAdmin, isStaff } from '@/lib/userAccess'
import { hasPermission } from '@/lib/permissions'

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { user, role } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: stats, isLoading } = useDashboardStats()
  const { data: modulePerms } = useUserModulePermissions()
  const { isMobile } = useBreakpoint()

  const canViewInventory = hasPermission(role, 'view_items')
  const canViewLaundry = hasPermission(role, 'view_laundry')

  // RPC-based — chính xác hơn role check khi staff bị thu hồi quyền inventory
  const hasInventoryModuleAccess = (modulePerms ?? []).some(
    (p) => (p.module === 'items' || p.module === 'inventory') && p.can_view,
  )

  // Super Admin should use their dedicated dashboard
  if (isSuperAdmin(user)) {
    return <Navigate to="/super-admin" replace />
  }

  // Check if user is owner (tenant_owner) - show executive dashboard
  const isOwner = isTenantOwner(user)

  // Check if user is staff - show shift check-in card
  const isStaffUser = isStaff(user)

  // Department-based routing — housekeeping staff trên mobile vào thẳng dashboard chuyên dụng
  const department = (user as any)?.position?.department as string | undefined

  // Owner view - Financial focus
  if (isOwner) {
    return <OwnerDashboard />
  }

  // Housekeeping staff trên mobile → dashboard chuyên dụng
  if (isMobile && department === 'housekeeping') {
    return <Navigate to="/staff/housekeeping" replace />
  }

  // Mobile view for managers/staff (MobileDashboard đã ưu tiên ShiftCheckInCard ở đầu)
  if (isMobile) {
    return <MobileDashboard />
  }

  // Desktop: staff không có quyền inventory → ẩn stat cards, focus ca trực + task hôm nay
  if (isStaffUser && !hasInventoryModuleAccess && !canViewInventory && !canViewLaundry) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('welcome', { name: user?.full_name || 'User' })}
          description={t('overview')}
        />
        <ShiftCheckInCard />
        <div className="rounded-lg border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Công việc hôm nay</h2>
          </div>
          <StaffTasksTab />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t('welcome', { name: user?.full_name || 'User' })}
          description={t('overview')}
        />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard title="" value="" icon={Package} isLoading />
          <DashboardStatCard title="" value="" icon={Package} isLoading />
          <DashboardStatCard title="" value="" icon={Wind} isLoading />
          <DashboardStatCard title="" value="" icon={AlertTriangle} isLoading />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('welcome', { name: user?.full_name || 'User' })}
        description={
          isAllHotelsMode
            ? t('overviewAllHotels')
            : t('overviewHotel', { hotel: selectedHotel?.name || '' })
        }
      >
        {isAllHotelsMode && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-2 rounded-md bg-secondary">
            <BarChart3 className="h-4 w-4" />
            <span>{t('viewingAllHotels')}</span>
          </div>
        )}
      </PageHeader>

      {/* Shift Check-in Card - Only for staff */}
      {isStaffUser && (
        <div className="max-w-md">
          <ShiftCheckInCard />
        </div>
      )}

      {/* Stats Grid — ẩn theo permission để Manager/Staff không thấy số liệu Kho/Giặt nếu không có quyền */}
      {(canViewInventory || canViewLaundry) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {canViewInventory && (
            <DashboardStatCard
              title={t('stats.totalValue')}
              value={new Intl.NumberFormat('vi-VN').format(stats?.total_value || 0)}
              icon={Package}
              change={{
                value: stats?.total_value_change_percent || null,
                label: t('stats.comparedToLastMonth')
              }}
              description="VNĐ"
            />
          )}
          {canViewInventory && (
            <DashboardStatCard
              title={t('stats.totalItems')}
              value={new Intl.NumberFormat('vi-VN').format(stats?.total_items || 0)}
              icon={Package}
              description={t('stats.inStock', { count: stats?.in_stock || 0 })}
            />
          )}
          {canViewLaundry && (
            <DashboardStatCard
              title={t('stats.inLaundry')}
              value={new Intl.NumberFormat('vi-VN').format(stats?.in_laundry || 0)}
              icon={Wind}
              description={t('stats.batchesProcessing', { count: stats?.active_laundry_batches || 0 })}
            />
          )}
          {canViewInventory && (
            <DashboardStatCard
              title={t('stats.lowStockWarning')}
              value={stats?.low_stock_count || 0}
              icon={AlertTriangle}
              description={t('stats.itemsNeedRestock')}
            />
          )}
        </div>
      )}

      {/* Hotel Breakdown - Only show in All Hotels mode */}
      {isAllHotelsMode && canViewInventory && <HotelBreakdownCards />}

      {/* Quick Actions */}
      <QuickActions />

      {/* Expense Chart — gắn quyền report/inventory */}
      {hasPermission(role, 'view_reports') && (
        <ExpenseChart months={12} showBarChart={false} />
      )}

      {/* Top Items & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {canViewInventory && (
          <div className="lg:col-span-2">
            <TopItemsTable />
          </div>
        )}
        <div className={canViewInventory ? 'lg:col-span-1' : 'lg:col-span-3'}>
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
