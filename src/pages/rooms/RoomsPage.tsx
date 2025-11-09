import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Grid3x3, List, Map } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoomFilters } from '@/components/rooms/RoomFilters'
import { RoomGrid } from '@/components/rooms/RoomGrid'
import { RoomTable } from '@/components/rooms/RoomTable'
import { RoomFloorPlan } from '@/components/rooms/RoomFloorPlan'
import { useRooms } from '@/hooks/useRooms'
import type { RoomFilters as IRoomFilters } from '@/types/rooms.types'

type ViewMode = 'grid' | 'list' | 'floor'

export function RoomsPage() {
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState<IRoomFilters>({})
  
  const { data: rooms, isLoading } = useRooms(filters)
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Phòng"
        description="Quản lý phòng và đồ dùng trong phòng"
        action={{
          label: 'Thêm phòng',
          icon: Plus,
          onClick: () => navigate('/rooms/new'),
        }}
      />
      
      <div className="flex items-center justify-between gap-4">
        <RoomFilters
          filters={filters}
          onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
        />
        
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid3x3 className="h-4 w-4 mr-2" />
              Lưới
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              Danh sách
            </TabsTrigger>
            <TabsTrigger value="floor">
              <Map className="h-4 w-4 mr-2" />
              Sơ đồ tầng
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {viewMode === 'grid' && <RoomGrid rooms={rooms || []} isLoading={isLoading} />}
      {viewMode === 'list' && <RoomTable rooms={rooms || []} isLoading={isLoading} />}
      {viewMode === 'floor' && <RoomFloorPlan />}
    </div>
  )
}
