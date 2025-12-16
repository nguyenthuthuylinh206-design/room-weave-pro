import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, FileText, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useMaintenanceDashboard } from '@/hooks/useMaintenanceDashboard'
import { MaintenanceStats } from '@/components/maintenance/MaintenanceStats'
import { ActiveRequestsSection } from '@/components/maintenance/ActiveRequestsSection'
import { MobileMaintenanceDashboard } from '@/components/maintenance/MobileMaintenanceDashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useBreakpoint } from '@/lib/breakpoints'

export default function MaintenanceDashboard() {
  const { t } = useTranslation('maintenance')
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const { data, isLoading } = useMaintenanceDashboard()

  if (isMobile) {
    return <MobileMaintenanceDashboard />
  }

  const defaultStats = {
    total: 0, totalLast30Days: 0, inProgress: 0, completed: 0,
    completedLast30Days: 0, completionRate: 0, avgTime: 0,
    costLast30Days: 0, mttr: 0, mtbf: 0, firstTimeFixRate: 0,
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/maintenance/schedules')}>
            <Calendar className="h-4 w-4" />
            {t('dashboard.schedule')}
          </Button>
          <Button variant="outline" onClick={() => navigate('/maintenance/reports')}>
            <FileText className="h-4 w-4" />
            {t('dashboard.reports')}
          </Button>
          <Button onClick={() => navigate('/maintenance/requests/new')}>
            <Plus className="h-4 w-4" />
            {t('dashboard.createRequest')}
          </Button>
        </div>
      </PageHeader>

      <MaintenanceStats stats={data?.stats || defaultStats} isLoading={isLoading} />

      <Card>
        <CardHeader><CardTitle>{t('dashboard.quickActions')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/maintenance/requests/new')}>
              <Plus className="h-5 w-5 mb-2" />
              <span className="font-medium">{t('dashboard.actions.createNew')}</span>
              <span className="text-xs text-muted-foreground">{t('dashboard.actions.createNewDesc')}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/maintenance/schedules')}>
              <Calendar className="h-5 w-5 mb-2" />
              <span className="font-medium">{t('dashboard.actions.schedule')}</span>
              <span className="text-xs text-muted-foreground">{t('dashboard.actions.scheduleDesc')}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/maintenance/reports')}>
              <FileText className="h-5 w-5 mb-2" />
              <span className="font-medium">{t('dashboard.actions.viewReports')}</span>
              <span className="text-xs text-muted-foreground">{t('dashboard.actions.viewReportsDesc')}</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col items-start p-4" onClick={() => navigate('/maintenance/technicians')}>
              <Users className="h-5 w-5 mb-2" />
              <span className="font-medium">{t('dashboard.actions.manageTech')}</span>
              <span className="text-xs text-muted-foreground">{t('dashboard.actions.manageTechDesc')}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {data?.activeRequests && <ActiveRequestsSection requests={data.activeRequests} />}

      {data?.recentCompletions && data.recentCompletions.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{t('dashboard.recentCompletions')}</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentCompletions.slice(0, 10).map((request: any) => (
                <div key={request.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{request.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{request.request_code} • {request.location}</p>
                    {request.actual_cost && (
                      <p className="text-xs text-muted-foreground">
                        {t('dashboard.cost')}: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(request.actual_cost)}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(request.completed_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
