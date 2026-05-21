import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Home, TrendingUp, RefreshCw } from 'lucide-react'
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
import { useAccessibleReports } from '@/hooks/useAccessibleReports'
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
  const { sections, reports, role, department } = useAccessibleReports()

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

  const roleLabel = (() => {
    if (role === 'department_manager' && department) {
      const map: Record<string, string> = {
        housekeeping: 'Trưởng buồng phòng',
        laundry: 'Trưởng giặt là',
        inventory: 'Trưởng kho',
        maintenance: 'Trưởng bảo trì',
      }
      return map[department] ?? 'Trưởng bộ phận'
    }
    if (role === 'hotel_manager') return 'Quản lý khách sạn'
    if (role === 'owner') return 'Chủ khách sạn'
    if (role === 'super_admin') return 'Super Admin'
    return null
  })()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title={t('title')}
          description={
            (roleLabel ? `${roleLabel} · ` : '') +
            (isAllHotelsMode ? t('allHotels') : `${t('hotel')}: ${selectedHotel?.name || t('notSelected')}`)
          }
        />
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      <HotelFilterCard />

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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{t('selectReportType')}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('selectReportTypeDesc')}
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {reports.length} {t('reportTypes')}
          </Badge>
        </div>

        {sections.length === 0 ? (
          <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
            Bạn chưa được phân quyền xem báo cáo nào. Liên hệ quản trị viên để được cấp quyền.
          </div>
        ) : (
          sections.map(({ section, reports: items }) => (
            <section key={section.id} className="space-y-3">
              <div className="flex items-end justify-between border-b pb-1.5">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.title}
                  </h3>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">{section.description}</p>
                </div>
                <span className="text-xs text-muted-foreground">{items.length} báo cáo</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => navigate(report.path)}
                    className="text-left border rounded-lg p-4 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{report.title}</div>
                      {report.isNew && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">Mới</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{report.description}</div>
                    <div className="text-xs text-primary mt-3 font-medium">
                      {t('viewReport')} →
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

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
