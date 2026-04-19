import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package,
  DollarSign,
  Home,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuickReportMetrics } from '@/components/reports/QuickReportMetrics'
import { MobileReportsDashboard } from '@/components/reports/MobileReportsDashboard'
import { HotelFilterCard } from '@/components/reports/HotelFilterCard'
import { StatCard } from '@/components/ui/stat-card'
import { useQuickReport } from '@/hooks/useReports'
import { useBreakpoint } from '@/lib/breakpoints'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useHotelContext } from '@/contexts/HotelContext'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function ReportsDashboardPage() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const queryClient = useQueryClient()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { t } = useTranslation('reports')
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today')
  const { data: quickReport, isLoading: isLoadingQuickReport } = useQuickReport(period)
  const { data: dashboardStats, isLoading: isLoadingStats } = useDashboardStats()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const reportCategories = [
    { id: 'inventory', title: t('types.inventory.title'), description: t('types.inventory.description'), path: '/reports/inventory' },
    { id: 'financial', title: t('types.financial.title'), description: t('types.financial.description'), path: '/reports/financial' },
    { id: 'operations', title: t('types.operations.title'), description: t('types.operations.description'), path: '/reports/operations' },
    { id: 'laundry', title: t('types.laundry.title'), description: t('types.laundry.description'), path: '/reports/laundry' },
    { id: 'rooms', title: t('types.rooms.title'), description: t('types.rooms.description'), path: '/reports/rooms' },
    { id: 'maintenance', title: t('types.maintenance.title'), description: t('types.maintenance.description'), path: '/reports/maintenance' },
    { id: 'revenue', title: t('types.revenue.title', 'Báo cáo Doanh thu'), description: t('types.revenue.description', 'Phân tích doanh thu theo thời gian'), path: '/reports/revenue' },
    { id: 'damages', title: t('types.damages.title', 'Báo cáo Hỏng/Mất'), description: t('types.damages.description', 'Thống kê tổn thất tài sản'), path: '/reports/damages' },
    { id: 'stock-audit', title: t('types.stockAudit.title', 'Kiểm kê Kho'), description: t('types.stockAudit.description', 'Báo cáo kiểm kê kho chi tiết'), path: '/reports/stock-audit' },
    { id: 'outbound', title: t('types.outbound.title', 'Báo cáo Xuất kho'), description: t('types.outbound.description', 'Phân tích chi tiết xuất kho theo loại'), path: '/reports/outbound' },
  ]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['quick-report'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] }),
      queryClient.invalidateQueries({ queryKey: ['revenue-report'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory-report'] }),
      queryClient.invalidateQueries({ queryKey: ['financial-report'] }),
      queryClient.invalidateQueries({ queryKey: ['laundry-report'] }),
      queryClient.invalidateQueries({ queryKey: ['operations-report'] }),
      queryClient.invalidateQueries({ queryKey: ['maintenance-report'] }),
      queryClient.invalidateQueries({ queryKey: ['maintenance-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['outbound-report'] }),
      queryClient.invalidateQueries({ queryKey: ['damages-report'] }),
    ])
    toast.success(t('dataRefreshed'))
    setIsRefreshing(false)
  }

  if (isMobile) {
    return <MobileReportsDashboard />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={t('title')}
          description={isAllHotelsMode ? t('allHotels') : `${t('hotel')}: ${selectedHotel?.name || t('notSelected')}`}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      <HotelFilterCard />

      {/* Overview Stats */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('stats.totalItems')}
          value={dashboardStats?.total_items?.toLocaleString() || '0'}
          icon={Package}
          description={t('stats.totalItemsDesc')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title={t('stats.inStock')}
          value={dashboardStats?.in_stock?.toLocaleString() || '0'}
          icon={Home}
          description={t('stats.inStockDesc')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title={t('stats.lowStock')}
          value={dashboardStats?.low_stock_count?.toLocaleString() || '0'}
          icon={Package}
          description={t('stats.lowStockDesc')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title={t('stats.activeBatches')}
          value={dashboardStats?.active_laundry_batches?.toLocaleString() || '0'}
          icon={Package}
          description={t('stats.activeBatchesDesc')}
          isLoading={isLoadingStats}
        />
      </div>

      {/* Report Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-semibold">{t('selectReportType')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('selectReportTypeDesc')}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {reportCategories.length} {t('reportTypes')}
          </Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {reportCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => navigate(category.path)}
              className="text-left border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors"
            >
              <div className="font-medium text-sm">{category.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{category.description}</div>
              <div className="text-xs text-primary mt-3 font-medium">
                {t('viewReport')} →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Reports */}
      <div className="border rounded-lg">
        <div className="p-3 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('quickReport.title')}</span>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="today" className="text-xs h-6">{t('quickReport.today')}</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-6">{t('quickReport.week')}</TabsTrigger>
              <TabsTrigger value="month" className="text-xs h-6">{t('quickReport.month')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="p-4">
          <QuickReportMetrics data={quickReport} period={period} isLoading={isLoadingQuickReport} />
        </div>
      </div>
    </div>
  )
}
