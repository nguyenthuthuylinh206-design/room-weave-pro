import { PageHeader } from '@/components/shared/PageHeader'
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard'
import { ExpenseChart } from '@/components/dashboard/ExpenseChart'
import { TopItemsTable } from '@/components/dashboard/TopItemsTable'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { MobileDashboard } from '@/components/dashboard/MobileDashboard'
import { HotelBreakdownCards } from '@/components/dashboard/HotelBreakdownCards'
import { OwnerDashboard } from '@/components/dashboard/owner'
import { Package, Wind, AlertTriangle, BarChart3 } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useHotelContext } from '@/contexts/HotelContext'
import { useBreakpoint } from '@/lib/breakpoints'
import { useTranslation } from 'react-i18next'

export default function Dashboard() {
  const { t } = useTranslation('dashboard')
  const { user, hasRole } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { data: stats, isLoading } = useDashboardStats()
  const { isMobile } = useBreakpoint()

  // Check if user is owner (tenant_owner) - show executive dashboard
  const isOwner = hasRole('owner')

  // Owner view - Financial focus
  if (isOwner) {
    return <OwnerDashboard />
  }

  // Mobile view for managers/staff
  if (isMobile) {
    return <MobileDashboard />
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

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
        <DashboardStatCard
          title={t('stats.totalItems')}
          value={new Intl.NumberFormat('vi-VN').format(stats?.total_items || 0)}
          icon={Package}
          description={t('stats.inStock', { count: stats?.in_stock || 0 })}
        />
        <DashboardStatCard
          title={t('stats.inLaundry')}
          value={new Intl.NumberFormat('vi-VN').format(stats?.in_laundry || 0)}
          icon={Wind}
          description={t('stats.batchesProcessing', { count: stats?.active_laundry_batches || 0 })}
        />
        <DashboardStatCard
          title={t('stats.lowStockWarning')}
          value={stats?.low_stock_count || 0}
          icon={AlertTriangle}
          description={t('stats.itemsNeedRestock')}
        />
      </div>

      {/* Hotel Breakdown - Only show in All Hotels mode */}
      {isAllHotelsMode && <HotelBreakdownCards />}

      {/* Quick Actions */}
      <QuickActions />

      {/* Expense Chart */}
      <ExpenseChart months={12} showBarChart={false} />

      {/* Top Items & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopItemsTable />
        </div>
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
