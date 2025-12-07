import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests'
import { MaintenanceRequestTable } from '@/components/maintenance/MaintenanceRequestTable'
import { MaintenanceFilters } from '@/components/maintenance/MaintenanceFilters'
import { MobileMaintenanceRequestList } from '@/components/maintenance/MobileMaintenanceRequestList'
import { useBreakpoint } from '@/lib/breakpoints'

export default function MaintenanceRequestList() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [tab, setTab] = useState('all')
  const [filters, setFilters] = useState({})
  
  // Fetch all requests for counting (without status filter)
  const { data: allRequests } = useMaintenanceRequests(filters)
  
  // Calculate counts from all requests (fixed values)
  const counts = {
    all: allRequests?.length || 0,
    waiting: allRequests?.filter((r: any) => r.status === 'waiting').length || 0,
    pending: allRequests?.filter((r: any) => r.status === 'pending').length || 0,
    in_progress: allRequests?.filter((r: any) => r.status === 'in_progress').length || 0,
    completed: allRequests?.filter((r: any) => r.status === 'completed').length || 0,
    cancelled: allRequests?.filter((r: any) => r.status === 'cancelled').length || 0,
  }

  // Filter for display based on selected tab
  const filteredRequests = tab === 'all' 
    ? allRequests 
    : allRequests?.filter((r: any) => r.status === tab)

  if (isMobile) {
    return <MobileMaintenanceRequestList />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu bảo trì"
        description="Quản lý tất cả yêu cầu bảo trì"
        action={{
          label: 'Tạo yêu cầu',
          icon: Plus,
          onClick: () => navigate('/maintenance/requests/new'),
        }}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Tất cả ({counts.all})</TabsTrigger>
          <TabsTrigger value="waiting">Đang chờ ({counts.waiting})</TabsTrigger>
          <TabsTrigger value="pending">Tiếp nhận ({counts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">Đang kiểm tra ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Hoàn thành ({counts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Đã hủy ({counts.cancelled})</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <MaintenanceFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <TabsContent value={tab} className="mt-6">
          <MaintenanceRequestTable
            requests={filteredRequests || []}
            isLoading={!allRequests}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
