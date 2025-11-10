import { useState } from 'react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMaintenanceRequests } from '@/hooks/useMaintenanceRequests'
import { MaintenanceRequestTable } from '@/components/maintenance/MaintenanceRequestTable'
import { MaintenanceFilters } from '@/components/maintenance/MaintenanceFilters'

export default function MaintenanceRequestList() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [filters, setFilters] = useState({})

  const statusFilter = tab !== 'all' ? { ...filters, status: tab } : filters
  const { data: requests, isLoading } = useMaintenanceRequests(statusFilter)

  const counts = {
    all: requests?.length || 0,
    pending: requests?.filter((r: any) => r.status === 'pending').length || 0,
    in_progress: requests?.filter((r: any) => r.status === 'in_progress' || r.status === 'assigned').length || 0,
    completed: requests?.filter((r: any) => r.status === 'completed').length || 0,
    cancelled: requests?.filter((r: any) => r.status === 'cancelled').length || 0,
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
          <TabsTrigger value="pending">Chờ xử lý ({counts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">Đang xử lý ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Hoàn thành ({counts.completed})</TabsTrigger>
          <TabsTrigger value="cancelled">Đã hủy ({counts.cancelled})</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <MaintenanceFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        <TabsContent value={tab} className="mt-6">
          <MaintenanceRequestTable
            requests={requests || []}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
