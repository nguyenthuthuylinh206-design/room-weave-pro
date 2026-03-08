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
  BarChart3,
  FileText,
  Download,
  Calendar,
  RefreshCw,
  LogOut,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { QuickReportMetrics } from '@/components/reports/QuickReportMetrics'
import { MobileReportsDashboard } from '@/components/reports/MobileReportsDashboard'
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
    {
      id: 'inventory',
      title: t('types.inventory.title'),
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-600',
      description: t('types.inventory.description'),
      path: '/reports/inventory',
      stats: t('types.inventory.stats', { returnObjects: true }) as string[],
    },
    {
      id: 'financial',
      title: t('types.financial.title'),
      icon: DollarSign,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/10',
      textColor: 'text-emerald-600',
      description: t('types.financial.description'),
      path: '/reports/financial',
      stats: t('types.financial.stats', { returnObjects: true }) as string[],
    },
    {
      id: 'operations',
      title: t('types.operations.title'),
      icon: ArrowRightLeft,
      color: 'bg-violet-500',
      bgColor: 'bg-violet-500/10',
      textColor: 'text-violet-600',
      description: t('types.operations.description'),
      path: '/reports/operations',
      stats: t('types.operations.stats', { returnObjects: true }) as string[],
    },
    {
      id: 'laundry',
      title: t('types.laundry.title'),
      icon: Shirt,
      color: 'bg-cyan-500',
      bgColor: 'bg-cyan-500/10',
      textColor: 'text-cyan-600',
      description: t('types.laundry.description'),
      path: '/reports/laundry',
      stats: t('types.laundry.stats', { returnObjects: true }) as string[],
    },
    {
      id: 'rooms',
      title: t('types.rooms.title'),
      icon: Home,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-600',
      description: t('types.rooms.description'),
      path: '/reports/rooms',
      stats: t('types.rooms.stats', { returnObjects: true }) as string[],
    },
    {
      id: 'maintenance',
      title: t('types.maintenance.title'),
      icon: Wrench,
      color: 'bg-rose-500',
      bgColor: 'bg-rose-500/10',
      textColor: 'text-rose-600',
      description: t('types.maintenance.description'),
      path: '/reports/maintenance',
      stats: t('types.maintenance.stats', { returnObjects: true }) as string[],
    },
    {
      id: 'revenue',
      title: t('types.revenue.title', 'Báo cáo Doanh thu'),
      icon: TrendingUp,
      color: 'bg-green-500',
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-600',
      description: t('types.revenue.description', 'Phân tích doanh thu theo thời gian'),
      path: '/reports/revenue',
      stats: [],
    },
    {
      id: 'damages',
      title: t('types.damages.title', 'Báo cáo Hỏng/Mất'),
      icon: BarChart3,
      color: 'bg-red-500',
      bgColor: 'bg-red-500/10',
      textColor: 'text-red-600',
      description: t('types.damages.description', 'Thống kê tổn thất tài sản'),
      path: '/reports/damages',
      stats: [],
    },
    {
      id: 'stock-audit',
      title: t('types.stockAudit.title', 'Kiểm kê Kho'),
      icon: FileText,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-500/10',
      textColor: 'text-indigo-600',
      description: t('types.stockAudit.description', 'Báo cáo kiểm kê kho chi tiết'),
      path: '/reports/stock-audit',
      stats: [],
    },
    {
      id: 'outbound',
      title: t('types.outbound.title', 'Báo cáo Xuất kho'),
      icon: LogOut,
      color: 'bg-teal-500',
      bgColor: 'bg-teal-500/10',
      textColor: 'text-teal-600',
      description: t('types.outbound.description', 'Phân tích chi tiết xuất kho theo loại'),
      path: '/reports/outbound',
      stats: [],
    },
  ]

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['quick-report'] })
    await queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
    toast.success(t('dataRefreshed'))
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
          title={t('title')}
          description={isAllHotelsMode ? t('allHotels') : `${t('hotel')}: ${selectedHotel?.name || t('notSelected')}`}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('exportAll')}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          icon={Wrench}
          description={t('stats.lowStockDesc')}
          isLoading={isLoadingStats}
        />
        <StatCard
          title={t('stats.activeBatches')}
          value={dashboardStats?.active_laundry_batches?.toLocaleString() || '0'}
          icon={Shirt}
          description={t('stats.activeBatchesDesc')}
          isLoading={isLoadingStats}
        />
      </div>
      
      {/* Report Categories */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">{t('selectReportType')}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {t('selectReportTypeDesc')}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            <BarChart3 className="h-3 w-3 mr-1" />
            {reportCategories.length} {t('reportTypes')}
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
                    {Array.isArray(category.stats) && category.stats.map((stat, index) => (
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
                    {t('viewReport')} →
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
                <CardTitle className="text-lg">{t('quickReport.title')}</CardTitle>
                <CardDescription>{t('quickReport.description')}</CardDescription>
              </div>
            </div>
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
              <TabsList className="bg-background">
                <TabsTrigger value="today" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('quickReport.today')}
                </TabsTrigger>
                <TabsTrigger value="week">{t('quickReport.week')}</TabsTrigger>
                <TabsTrigger value="month">{t('quickReport.month')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <QuickReportMetrics data={quickReport} period={period} isLoading={isLoadingQuickReport} />
        </CardContent>
      </Card>
    </div>
  )
}