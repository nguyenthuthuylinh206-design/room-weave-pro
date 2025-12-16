import { useTranslation } from 'react-i18next'
import { MobileMaintenanceRequestsPage } from '@/components/maintenance/MobileMaintenanceRequestsPage'
import { useBreakpoint } from '@/lib/breakpoints'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'

export function MaintenanceDashboardPage() {
  const { t } = useTranslation('maintenance')
  const { isMobile } = useBreakpoint()

  if (isMobile) {
    return <MobileMaintenanceRequestsPage />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('dashboard')}
      />
      <Card className="p-6">
        <p className="text-muted-foreground">{t('messages.comingSoon', 'Desktop maintenance dashboard coming soon...')}</p>
      </Card>
    </div>
  )
}
