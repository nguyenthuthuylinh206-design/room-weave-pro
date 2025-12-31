import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests'
import { MaintenanceRequestTable } from '@/components/maintenance/MaintenanceRequestTable'
import { MaintenanceFilters } from '@/components/maintenance/MaintenanceFilters'
import { MobileMaintenanceRequestList } from '@/components/maintenance/MobileMaintenanceRequestList'
import { useBreakpoint } from '@/lib/breakpoints'

export default function MaintenanceRequestList() {
  const { t } = useTranslation('maintenance')
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [tab, setTab] = useState('all')
  const [filters, setFilters] = useState({})
  
  const { data: allRequests } = useMaintenanceRequests(filters)
  
  const counts = {
    all: allRequests?.length || 0,
    waiting: allRequests?.filter((r: any) => r.status === 'waiting').length || 0,
    pending: allRequests?.filter((r: any) => r.status === 'pending').length || 0,
    in_progress: allRequests?.filter((r: any) => r.status === 'in_progress').length || 0,
    completed: allRequests?.filter((r: any) => r.status === 'completed').length || 0,
    cancelled: allRequests?.filter((r: any) => r.status === 'cancelled').length || 0,
  }

  const filteredRequests = tab === 'all' 
    ? allRequests 
    : allRequests?.filter((r: any) => r.status === tab)

  if (isMobile) {
    return <MobileMaintenanceRequestList />
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        action={{
          label: t('list.createRequest'),
          icon: Plus,
          onClick: () => navigate('/maintenance/requests/new'),
        }}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-8">
          <TabsTrigger value="all" className="text-xs h-7">{t('list.tabs.all')} ({counts.all})</TabsTrigger>
          <TabsTrigger value="waiting" className="text-xs h-7">{t('list.tabs.waiting')} ({counts.waiting})</TabsTrigger>
          <TabsTrigger value="pending" className="text-xs h-7">{t('list.tabs.pending')} ({counts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs h-7">{t('list.tabs.inProgress')} ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed" className="text-xs h-7">{t('list.tabs.completed')} ({counts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled" className="text-xs h-7">{t('list.tabs.cancelled')} ({counts.cancelled})</TabsTrigger>
        </TabsList>

        <div className="mt-3">
          <MaintenanceFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <TabsContent value={tab} className="mt-4">
          <MaintenanceRequestTable
            requests={filteredRequests || []}
            isLoading={!allRequests}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
