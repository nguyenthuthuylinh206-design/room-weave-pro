import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Package, 
  DollarSign,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight
} from 'lucide-react'
import { MobileReportsDashboard } from '@/components/reports/MobileReportsDashboard'
import { useBreakpoint } from '@/lib/breakpoints'
import { useTranslation } from 'react-i18next'

export function ReportsPage() {
  const { isMobile } = useBreakpoint()
  const { t } = useTranslation('reports')
  const navigate = useNavigate()

  if (isMobile) {
    return <MobileReportsDashboard />
  }

  const reports = [
    {
      id: 'inventory',
      title: t('types.inventory.title'),
      description: t('types.inventory.description'),
      icon: Package,
      color: 'text-blue-500',
      path: '/reports/inventory',
    },
    {
      id: 'stock-audit',
      title: t('types.stockAudit.title'),
      description: t('types.stockAudit.description'),
      icon: FileText,
      color: 'text-teal-500',
      path: '/reports/stock-audit',
    },
    {
      id: 'outbound',
      title: 'Báo cáo Xuất kho',
      description: 'Phân tích chi tiết giao dịch xuất kho theo từng loại',
      icon: ArrowUpRight,
      color: 'text-emerald-500',
      path: '/reports/outbound',
    },
    {
      id: 'expenses',
      title: t('types.expenses.title'),
      description: t('types.expenses.description'),
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      id: 'laundry',
      title: t('types.laundry.title'),
      description: t('types.laundry.description'),
      icon: TrendingUp,
      color: 'text-purple-500',
      path: '/reports/laundry',
    },
    {
      id: 'rooms',
      title: t('types.rooms.title'),
      description: t('types.rooms.description'),
      icon: Calendar,
      color: 'text-orange-500',
      path: '/reports/rooms',
    },
    {
      id: 'performance',
      title: t('types.performance.title'),
      description: t('types.performance.description'),
      icon: BarChart3,
      color: 'text-red-500',
    },
    {
      id: 'summary',
      title: t('types.summary.title'),
      description: t('types.summary.description'),
      icon: PieChart,
      color: 'text-indigo-500',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Icon className={`h-6 w-6 ${report.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {report.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => report.path && navigate(report.path)}
                    disabled={!report.path}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {t('view')}
                  </Button>
                  <Button variant="default" size="sm" className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    {t('download')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('custom.title')}</CardTitle>
          <CardDescription>
            {t('custom.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-center">
            <div className="space-y-4">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t('custom.developing')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('custom.comingSoon')}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
