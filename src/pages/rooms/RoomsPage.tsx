import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Grid3x3, List, Map, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoomFilters } from '@/components/rooms/RoomFilters'
import { RoomGrid } from '@/components/rooms/RoomGrid'
import { RoomTable } from '@/components/rooms/RoomTable'
import { RoomFloorPlan } from '@/components/rooms/RoomFloorPlan'
import { BulkImportRoomsDialog } from '@/components/rooms/BulkImportRoomsDialog'
import { useRooms } from '@/hooks/useRooms'
import { useHotelContext } from '@/contexts/HotelContext'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileRoomsPage } from '@/components/rooms/MobileRoomsPage'
import type { RoomFilters as IRoomFilters } from '@/types/rooms.types'

type ViewMode = 'grid' | 'list' | 'floor'

export function RoomsPage() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState<IRoomFilters>({})
  const [showBulkImport, setShowBulkImport] = useState(false)
  
  const { data: rooms, isLoading } = useRooms(filters)
  const { selectedHotel } = useHotelContext()

  if (isMobile) {
    return <MobileRoomsPage />
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Phòng"
        description="Quản lý phòng và đồ dùng trong phòng"
      >
        <div className="flex gap-2">
          {selectedHotel && (
            <Button 
              variant="outline"
              onClick={() => setShowBulkImport(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Bulk Import
            </Button>
          )}
          <Button onClick={() => navigate('/rooms/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm phòng
          </Button>
        </div>
      </PageHeader>
      
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

      {/* Bulk Import Dialog */}
      {selectedHotel && (
        <BulkImportRoomsDialog
          open={showBulkImport}
          onOpenChange={setShowBulkImport}
          hotelId={selectedHotel.id}
          hotelName={selectedHotel.name}
        />
      )}
    </div>
  )
}
