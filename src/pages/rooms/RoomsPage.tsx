import { useState, useEffect, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Grid3x3, List, CalendarRange, FileSpreadsheet, LayoutGrid } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RoomFilters } from '@/components/rooms/RoomFilters'
import { RoomGrid } from '@/components/rooms/RoomGrid'
import { RoomTable } from '@/components/rooms/RoomTable'
// Lazy: chỉ tải khi viewMode = 'floor' / 'map' — tiết kiệm ~2k LOC ở lần render đầu
const RoomTapeChart = lazy(() =>
  import('@/components/rooms/RoomTapeChart').then((m) => ({ default: m.RoomTapeChart })),
)
const RoomFloorMapView = lazy(() =>
  import('@/components/rooms/RoomFloorMapView').then((m) => ({ default: m.RoomFloorMapView })),
)
import { BulkImportRoomsDialog } from '@/components/rooms/BulkImportRoomsDialog'
import { RoomBulkActionsBar } from '@/components/rooms/RoomBulkActionsBar'
import { RoomViewDensityControl } from '@/components/rooms/RoomViewDensityControl'
import { useRoomViewDensity } from '@/hooks/useRoomViewDensity'
import { useRooms } from '@/hooks/useRooms'
import { useHotelContext } from '@/contexts/HotelContext'
import { useBreakpoint } from '@/lib/breakpoints'
import { useUser } from '@/hooks/useUser'
import { MobileRoomsPage } from '@/components/rooms/MobileRoomsPage'
import type { RoomFilters as IRoomFilters } from '@/types/rooms.types'

type ViewMode = 'grid' | 'list' | 'floor' | 'map'
const STORAGE_KEY = 'rooms.viewMode'
const ALLOWED: ViewMode[] = ['grid', 'list', 'floor', 'map']

/**
 * Default view theo role khi user chưa từng chọn:
 * - hotel_manager / owner / super_admin → 'map' (Sơ đồ – lễ tân/quản lý quan sát nhanh)
 * - department_manager → 'grid' (HK ưu tiên xem theo priority)
 * - khác → 'grid'
 */
function defaultViewByRole(role?: string | null): ViewMode {
  if (role === 'owner' || role === 'super_admin' || role === 'hotel_manager') return 'map'
  return 'grid'
}

function readInitialView(searchParams: URLSearchParams, role?: string | null): ViewMode {
  const fromUrl = searchParams.get('view') as ViewMode | null
  if (fromUrl && ALLOWED.includes(fromUrl)) return fromUrl
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY) as ViewMode | null
    if (fromLs && ALLOWED.includes(fromLs)) return fromLs
  } catch {}
  return defaultViewByRole(role)
}

export function RoomsPage() {
  const { t } = useTranslation('rooms')
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()
  const { role } = useUser()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState<ViewMode>(() => readInitialView(searchParams, role))
  const [filters, setFilters] = useState<IRoomFilters>({})
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])

  const { data: rooms, isLoading } = useRooms(filters)
  const { selectedHotel } = useHotelContext()
  const density = useRoomViewDensity(selectedHotel?.id)

  // Staff (HK) không cần thấy toàn bộ danh sách phòng — chuyển sang "Việc của tôi".
  useEffect(() => {
    if (role === 'staff') {
      navigate('/my-tasks', { replace: true })
    }
  }, [role, navigate])

  // Persist tab to URL + localStorage
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, viewMode) } catch {}
    const current = searchParams.get('view')
    if (current !== viewMode) {
      const next = new URLSearchParams(searchParams)
      next.set('view', viewMode)
      setSearchParams(next, { replace: true })
    }
  }, [viewMode, searchParams, setSearchParams])

  if (role === 'staff') return null

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {(viewMode === 'grid' || viewMode === 'list') ? (
          <RoomFilters
            filters={filters}
            onFilterChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
          />
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-2">
          {(viewMode === 'grid' || viewMode === 'list') && (
            <RoomViewDensityControl
              state={density.state}
              onPresetChange={density.setPreset}
              onFontScaleChange={density.setFontScale}
              onReset={density.reset}
            />
          )}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid" title="Lưới phòng theo ưu tiên — dùng cho Buồng phòng / Quản lý vận hành">
                <Grid3x3 className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Lưới (HK)</span>
              </TabsTrigger>
              <TabsTrigger value="list" title="Danh sách bảng — dùng để lọc, sắp xếp, xuất dữ liệu">
                <List className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Danh sách</span>
              </TabsTrigger>
              <TabsTrigger value="floor" title="Tape chart booking theo ngày — dùng cho Lễ tân & quản lý đặt phòng">
                <CalendarRange className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Lịch đặt phòng</span>
              </TabsTrigger>
              <TabsTrigger value="map" title="Sơ đồ tổng quan tình trạng phòng — dùng cho Lễ tân tại quầy">
                <LayoutGrid className="h-4 w-4 lg:mr-2" />
                <span className="hidden lg:inline">Sơ đồ tình trạng</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Subtitle: hướng dẫn nhanh vai trò */}
      <p className="text-xs text-muted-foreground -mt-3 px-1">
        {viewMode === 'grid' && 'Sắp xếp theo mức ưu tiên (Cần xử lý ngay / Theo dõi / Bình thường). Bấm ô phòng để xem nhanh.'}
        {viewMode === 'list' && 'Danh sách dạng bảng để lọc, sắp xếp và xuất dữ liệu.'}
        {viewMode === 'floor' && 'Lịch đặt phòng theo ngày (tape chart) — dùng cho Lễ tân & quản lý booking.'}
        {viewMode === 'map' && 'Sơ đồ phòng tổng quan trạng thái — dùng cho Lễ tân tại quầy. Bấm ô phòng để xem giá / khách / countdown.'}
      </p>

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
      {viewMode === 'floor' && (
        <Suspense fallback={<div className="text-sm text-muted-foreground p-4">Đang tải sơ đồ băng…</div>}>
          <RoomTapeChart />
        </Suspense>
      )}
      {viewMode === 'map' && (
        <Suspense fallback={<div className="text-sm text-muted-foreground p-4">Đang tải sơ đồ phòng…</div>}>
          <RoomFloorMapView
            onAddRoom={() => navigate('/rooms/new')}
            onBulkImport={selectedHotel ? () => setShowBulkImport(true) : undefined}
          />
        </Suspense>
      )}

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
