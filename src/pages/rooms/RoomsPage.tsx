import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Grid3x3, List, Map, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoomFilters } from '@/components/rooms/RoomFilters'
import { RoomGrid } from '@/components/rooms/RoomGrid'
import { RoomTable } from '@/components/rooms/RoomTable'
import { RoomTapeChart } from '@/components/rooms/RoomTapeChart'
import { BulkImportRoomsDialog } from '@/components/rooms/BulkImportRoomsDialog'
import { RoomBulkActionsBar } from '@/components/rooms/RoomBulkActionsBar'
import { useRooms } from '@/hooks/useRooms'
import { useHotelContext } from '@/contexts/HotelContext'
import { useBreakpoint } from '@/lib/breakpoints'
import { MobileRoomsPage } from '@/components/rooms/MobileRoomsPage'
import type { RoomFilters as IRoomFilters } from '@/types/rooms.types'

type ViewMode = 'grid' | 'list' | 'floor'

export function RoomsPage() {
  const { t } = useTranslation('rooms')
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [filters, setFilters] = useState<IRoomFilters>({})
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  
  const { data: rooms, isLoading } = useRooms(filters)
  const { selectedHotel } = useHotelContext()

  if (isMobile) {
    return <MobileRoomsPage />
  }
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={t('description')}
      >
        <div className="flex gap-2">
          {selectedHotel && (
            <Button 
              variant="outline"
              onClick={() => setShowBulkImport(true)}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t('actions.bulkImport')}
            </Button>
          )}
          <Button onClick={() => navigate('/rooms/new')}>
            <Plus className="mr-2 h-4 w-4" />
            {t('actions.addRoom')}
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
              {t('viewModes.grid')}
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4 mr-2" />
              {t('viewModes.list')}
            </TabsTrigger>
            <TabsTrigger value="floor">
              <Map className="h-4 w-4 mr-2" />
              {t('viewModes.floorPlan')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Bulk Actions Bar */}
      <RoomBulkActionsBar
        selectedIds={selectedRoomIds}
        onClearSelection={() => setSelectedRoomIds([])}
        rooms={rooms?.map(r => ({ id: r.id, room_number: r.room_number, hotel_id: r.hotel_id })) || []}
      />

      {viewMode === 'grid' && rooms && rooms.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <Checkbox
            id="select-all-rooms"
            checked={
              selectedRoomIds.length === rooms.length
                ? true
                : selectedRoomIds.length > 0
                ? 'indeterminate'
                : false
            }
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedRoomIds(rooms.map(r => r.id))
              } else {
                setSelectedRoomIds([])
              }
            }}
          />
          <label
            htmlFor="select-all-rooms"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            {selectedRoomIds.length === rooms.length
              ? t('bulkActions.deselectAll')
              : t('bulkActions.selectAll', { count: rooms.length })}
          </label>
        </div>
      )}

      {viewMode === 'grid' && (
        <RoomGrid
          rooms={rooms || []}
          isLoading={isLoading}
          selectedIds={selectedRoomIds}
          onSelectionChange={setSelectedRoomIds}
        />
      )}
      {viewMode === 'list' && (
        <RoomTable
          rooms={rooms || []}
          isLoading={isLoading}
          selectedIds={selectedRoomIds}
          onSelectionChange={setSelectedRoomIds}
        />
      )}
      {viewMode === 'floor' && <RoomTapeChart />}

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
