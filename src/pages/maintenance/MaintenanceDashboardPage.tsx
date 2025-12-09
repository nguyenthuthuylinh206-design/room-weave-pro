import { MobileMaintenanceRequestsPage } from '@/components/maintenance/MobileMaintenanceRequestsPage'
import { useBreakpoint } from '@/lib/breakpoints'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'

export function MaintenanceDashboardPage() {
  const { isMobile } = useBreakpoint()

  if (isMobile) {
    return <MobileMaintenanceRequestsPage />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảo trì"
        description="Quản lý yêu cầu bảo trì"
      />
      <Card className="p-6">
        <p className="text-muted-foreground">Desktop maintenance dashboard coming soon...</p>
      </Card>
    </div>
  )
}
