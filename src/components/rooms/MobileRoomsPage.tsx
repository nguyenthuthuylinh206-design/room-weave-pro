import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRooms } from '@/hooks/useRooms'
import { useAllRoomCheckSessions } from '@/hooks/useRoomCheckSession'
import { usePendingRoomDistributions } from '@/hooks/usePendingRoomDistributions'
import { usePendingTaskCount } from '@/hooks/useHousekeepingTasks'
import { useActiveRoomBookings, minutesUntilCheckout } from '@/hooks/useActiveRoomBookings'
import { useHotelContext } from '@/contexts/HotelContext'
import { useAuth } from '@/contexts/AuthContext'
import { useUser } from '@/hooks/useUser'
import { hasPermission } from '@/lib/permissions'
import { canCreateHousekeepingTask } from '@/lib/userAccess'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { RoomQuickViewDialog, type QuickViewEntry } from './RoomQuickViewDialog'
import { MobileRoomFilters } from './MobileRoomFilters'
import { MobileRoomBulkActionsBar } from './MobileRoomBulkActionsBar'
import { StaffTasksTab } from '@/components/housekeeping/StaffTasksTab'
import { CreateTaskDialog } from '@/components/housekeeping/CreateTaskDialog'
import {
  Bed, CheckCircle, Plus, Search,
  AlertTriangle, Wind, Truck, ClipboardList, PackageOpen, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { calcRoomPriority, getMissingDisplay, isOccupiedStatus } from '@/lib/roomPriority'
import type { RoomFilters as IRoomFilters, RoomStatus, RoomType, RoomWithStats } from '@/types/rooms.types'

type FilterStatus = 'all' | RoomStatus

const ALL_STATUSES: RoomStatus[] = ['vacant', 'occupied', 'check_in', 'check_out', 'cleaning', 'maintenance', 'out_of_order']

function statusDotClass(status: string): string {
  switch (status) {
    case 'vacant_clean': case 'vacant_inspected': case 'vacant': return 'bg-green-500'
    case 'occupied_clean': case 'occupied_dirty': case 'occupied': return 'bg-blue-500'
    case 'vacant_dirty': case 'cleaning': case 'check_out': return 'bg-amber-500'
    case 'dnd': case 'service_refused': case 'sleep_out': case 'skipper': return 'bg-purple-500'
    case 'out_of_order': case 'out_of_service': case 'maintenance': return 'bg-red-500'
    case 'check_in': return 'bg-cyan-500'
    default: return 'bg-muted-foreground'
  }
}

function statusColorClass(status: string): string {
  switch (status) {
    case 'vacant_clean': case 'vacant_inspected': case 'vacant': return 'text-green-600'
    case 'occupied_clean': case 'occupied_dirty': case 'occupied': return 'text-blue-600'
    case 'vacant_dirty': case 'cleaning': case 'check_out': return 'text-amber-600'
    case 'dnd': case 'service_refused': case 'sleep_out': case 'skipper': return 'text-purple-600'
    case 'out_of_order': case 'out_of_service': case 'maintenance': return 'text-red-600'
    case 'check_in': return 'text-cyan-600'
    default: return 'text-muted-foreground'
  }
}

export const MobileRoomsPage = () => {
  const { t } = useTranslation(['rooms', 'common', 'distribution'])
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tenantId, role, user: appUser } = useUser()
  const { selectedHotel } = useHotelContext()
  const [activeTab, setActiveTab] = useState<'rooms' | 'tasks'>('rooms')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')

  // Advanced filters
  const [floorFilter, setFloorFilter] = useState<number | undefined>(undefined)
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | undefined>(undefined)
  const [missingItemsOnly, setMissingItemsOnly] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectionMode, setSelectionMode] = useState(false)

  // Quick view + task dialog
  const [quickViewEntry, setQuickViewEntry] = useState<QuickViewEntry | null>(null)
  const [taskRoom, setTaskRoom] = useState<{ id: string; number: string; hotelId: string } | null>(null)

  const [filters, setFilters] = useState<IRoomFilters>({})

  const { data: rooms = [], isLoading, refetch } = useRooms(filters)
  const checkSessions = useAllRoomCheckSessions(tenantId)
  const { data: pendingDistributions } = usePendingRoomDistributions()
  const { data: pendingTaskCount = 0 } = usePendingTaskCount()
  const { data: activeBookings } = useActiveRoomBookings(selectedHotel?.id)

  const canViewRoomDetail = hasPermission(role, 'manage_rooms') || role !== 'staff'
  const canCreateTask = canCreateHousekeepingTask(appUser)

  // Tick mỗi 60s để countdown trả phòng cập nhật
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  // Get unique floors for filter
  const availableFloors = useMemo(() => {
    const floors = [...new Set(rooms.map((r: any) => r.floor).filter(Boolean))]
    return floors.sort((a, b) => a - b)
  }, [rooms])

  const filteredRooms = useMemo(() => {
    return rooms.filter((room: any) => {
      const matchesStatus = statusFilter === 'all' || room.status === statusFilter
      const matchesSearch = !search || 
        room.room_number?.toLowerCase().includes(search.toLowerCase()) ||
        room.floor?.toString().includes(search)
      const matchesFloor = floorFilter === undefined || room.floor === floorFilter
      const matchesRoomType = roomTypeFilter === undefined || room.room_type === roomTypeFilter
      const matchesMissingItems = !missingItemsOnly || (room.missing_items && room.missing_items > 0)
      
      return matchesStatus && matchesSearch && matchesFloor && matchesRoomType && matchesMissingItems
    })
  }, [rooms, statusFilter, search, floorFilter, roomTypeFilter, missingItemsOnly])

  const handleRefresh = async () => {
    await refetch()
  }

  const handleClearFilters = () => {
    setFloorFilter(undefined)
    setRoomTypeFilter(undefined)
    setMissingItemsOnly(false)
  }

  // Bulk selection handlers
  const toggleSelectRoom = (roomId: string) => {
    setSelectedIds(prev => 
      prev.includes(roomId) 
        ? prev.filter(id => id !== roomId)
        : [...prev, roomId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRooms.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredRooms.map((r: any) => r.id))
    }
  }

  const handleClearSelection = () => {
    setSelectedIds([])
    setSelectionMode(false)
  }




  // Stats
  const stats = useMemo(() => ({
    total: rooms.length,
    vacant: rooms.filter((r: any) => r.status === 'vacant').length,
    occupied: rooms.filter((r: any) => r.status === 'occupied').length,
    check_in: rooms.filter((r: any) => r.status === 'check_in').length,
    check_out: rooms.filter((r: any) => r.status === 'check_out').length,
    cleaning: rooms.filter((r: any) => r.status === 'cleaning').length,
    maintenance: rooms.filter((r: any) => r.status === 'maintenance').length,
    out_of_order: rooms.filter((r: any) => r.status === 'out_of_order').length,
  }), [rooms])


  return (
    <div className={cn("min-h-screen bg-background", selectedIds.length > 0 ? "pb-36" : "pb-20")}>
      <MobileDetailHeader
        title={t('pageTitle')}
        showBack
        rightContent={
          activeTab === 'rooms' ? (
            selectionMode ? (
              <Button variant="ghost" size="sm" onClick={handleClearSelection}>
                {t('selection.cancel')}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setSelectionMode(true)}>
                {t('selection.select')}
              </Button>
            )
          ) : null
        }
      />

      {/* Tabs: Rooms vs Tasks */}
      <div className="px-4 pt-2 pb-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rooms' | 'tasks')}>
          <TabsList className="w-full">
            <TabsTrigger value="rooms" className="flex-1">
              <Bed className="h-4 w-4 mr-2" />
              Danh sách phòng
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex-1 relative">
              <ClipboardList className="h-4 w-4 mr-2" />
              Công việc
              {pendingTaskCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px]"
                >
                  {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tasks Tab Content */}
      {activeTab === 'tasks' && <StaffTasksTab />}

      {/* Rooms Tab Content */}
      {activeTab === 'rooms' && (
        <>
          {/* Add Button */}
          <div className="px-4 pb-3">
            <Button
              className="w-full"
              onClick={() => navigate('/rooms/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('addNewRoom')}
            </Button>
          </div>

      {/* Stats Cards */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-3 min-w-max">
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">{t('stats.total')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">{stats.vacant}</div>
              <div className="text-xs text-muted-foreground">{t('stats.vacant')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">{stats.occupied}</div>
              <div className="text-xs text-muted-foreground">{t('stats.occupied')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-purple-600">{stats.check_in}</div>
              <div className="text-xs text-muted-foreground">{t('stats.checkIn')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-indigo-600">{stats.check_out}</div>
              <div className="text-xs text-muted-foreground">{t('stats.checkOut')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600">{stats.cleaning}</div>
              <div className="text-xs text-muted-foreground">{t('stats.cleaning')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-orange-600">{stats.maintenance}</div>
              <div className="text-xs text-muted-foreground">{t('stats.maintenance')}</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-red-600">{stats.out_of_order}</div>
              <div className="text-xs text-muted-foreground">{t('stats.outOfOrder')}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar + Advanced Filters */}
      <div className="px-4 pb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('filters.searchRoomFloor')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <MobileRoomFilters
          floor={floorFilter}
          roomType={roomTypeFilter}
          missingItemsOnly={missingItemsOnly}
          availableFloors={availableFloors}
          onFloorChange={setFloorFilter}
          onRoomTypeChange={setRoomTypeFilter}
          onMissingItemsOnlyChange={setMissingItemsOnly}
          onClear={handleClearFilters}
        />
      </div>

      {/* Selection Mode Header */}
      {selectionMode && (
        <div className="px-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selectedIds.length === filteredRooms.length && filteredRooms.length > 0}
              onCheckedChange={toggleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.length > 0 
                ? t('selection.selected', { count: selectedIds.length, total: filteredRooms.length })
                : t('selection.selectAll')
              }
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="sticky top-14 bg-background border-b z-10 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground'
            )}
          >
            {t('filters.all')}
          </button>
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                statusFilter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {t(`status.${status}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms List */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-32 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          ) : filteredRooms.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Bed className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {search ? t('messages.notFound') : t('messages.noRooms')}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRooms.map((room: RoomWithStats) => {
              const session = checkSessions[room.id]
              const isSelected = selectedIds.includes(room.id)
              const pendingCount = pendingDistributions?.get(room.id) || 0
              const booking = activeBookings?.get(room.id) || null
              const now = new Date(nowTick)
              const mins = booking && isOccupiedStatus(room.status)
                ? minutesUntilCheckout(booking, now)
                : null
              const priority = calcRoomPriority(room, { pendingDistributions: pendingCount, minutesToCheckout: mins })
              const missing = getMissingDisplay(room)
              const statusLabel = t(`status.${room.status}`, { defaultValue: room.status })
              const checkDisabled = !!session && session.user_id !== user?.id
              const checkLabel = session
                ? session.user_id === user?.id
                  ? t('checkSession.continueCheck')
                  : t('checkSession.inProgress')
                : t('checkSession.check')

              const handleCardClick = () => {
                if (selectionMode) {
                  toggleSelectRoom(room.id)
                  return
                }
                setQuickViewEntry({
                  room,
                  pendingCount,
                  priority: { tier: priority.tier, reason: priority.reason, daysSinceCheck: priority.daysSinceCheck },
                  booking,
                  minutesToCheckout: mins,
                  session: session ?? null,
                })
              }

              return (
                <Card
                  key={room.id}
                  className={cn(
                    'transition-all active:scale-[0.99] cursor-pointer',
                    priority.tier === 'urgent' && 'border-l-[3px] border-l-red-500',
                    priority.tier === 'warning' && 'border-l-[3px] border-l-amber-500',
                    isSelected && 'ring-2 ring-primary bg-primary/5',
                  )}
                  onClick={handleCardClick}
                >
                  <CardContent className="p-3 space-y-2">
                    {/* Header: dot + số phòng + status text + checkbox bulk */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {selectionMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRoom(room.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', statusDotClass(room.status))} aria-hidden />
                        <span className="font-bold text-lg leading-none shrink-0">{room.room_number}</span>
                        <span className={cn('text-xs font-medium truncate', statusColorClass(room.status))}>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* Priority reason */}
                    {priority.reason && priority.tier !== 'normal' && (
                      <p className={cn(
                        'text-sm font-medium',
                        priority.tier === 'urgent' ? 'text-red-600' : 'text-amber-600',
                      )}>
                        {priority.reason}
                      </p>
                    )}

                    {/* Actionable info (1 dòng) */}
                    <div className="space-y-1 text-sm">
                      {session ? (
                        <div className="flex items-center gap-1.5 text-orange-600">
                          <Clock className="h-3.5 w-3.5 animate-pulse shrink-0" />
                          <span className="font-medium truncate">
                            {t('checkSession.checking', {
                              name: session.user_name,
                              type: t(`checkTypes.${session.check_type}`, { defaultValue: session.check_type }),
                            })}
                          </span>
                        </div>
                      ) : missing.kind === 'complete' ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('grid.itemsComplete')}</span>
                        </div>
                      ) : missing.kind === 'after_clean' ? (
                        <div className="flex items-center gap-1.5 text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('grid.missingAfterClean', { count: missing.count })}</span>
                        </div>
                      ) : missing.kind === 'restock' ? (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <PackageOpen className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('grid.needRestock', { count: missing.count })}</span>
                        </div>
                      ) : null}

                      {room.items_in_laundry > 0 && (
                        <div className="flex items-center gap-1.5 text-cyan-600">
                          <Wind className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('grid.itemsInLaundry', { count: room.items_in_laundry })}</span>
                        </div>
                      )}

                      {pendingCount > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-600">
                          <Truck className="h-3.5 w-3.5 shrink-0" />
                          <span>{t('distribution:roomHistory.pendingDeliveries', { count: pendingCount })}</span>
                        </div>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="pt-1.5 border-t text-xs text-muted-foreground truncate">
                      {[
                        t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type }),
                        `${room.max_guests} khách`,
                        room.bed_type || null,
                        room.area_sqm ? `${room.area_sqm}m²` : null,
                      ].filter(Boolean).join(' • ')}
                    </div>

                    {/* Action: chỉ 1 nút Kiểm tra. Còn lại gom vào Quick View. */}
                    {!selectionMode && (
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          className="w-full h-9"
                          disabled={checkDisabled}
                          onClick={() => {
                            const hasSession = !!session && session.user_id === user?.id
                            navigate(`/rooms/${room.id}/check${hasSession ? '?resume=true' : ''}`)
                          }}
                        >
                          {checkLabel}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </PullToRefresh>

          {/* Bulk Actions Bar */}
          <MobileRoomBulkActionsBar 
            selectedIds={selectedIds}
            onClearSelection={handleClearSelection}
            rooms={filteredRooms.map((r: any) => ({ id: r.id, room_number: r.room_number, hotel_id: r.hotel_id }))}
          />
        </>
      )}

      {/* Quick View popup */}
      <RoomQuickViewDialog
        open={!!quickViewEntry}
        onOpenChange={(open) => !open && setQuickViewEntry(null)}
        entry={quickViewEntry}
        canViewRoomDetail={canViewRoomDetail}
        canCreateTask={canCreateTask}
        currentUserId={user?.id}
        onOpenCreateTask={(room) => setTaskRoom({ id: room.id, number: room.room_number, hotelId: room.hotel_id })}
      />

      {/* Create Task Dialog */}
      {taskRoom && (
        <CreateTaskDialog
          open={!!taskRoom}
          onOpenChange={(open) => !open && setTaskRoom(null)}
          roomId={taskRoom.id}
          roomNumber={taskRoom.number}
          hotelId={taskRoom.hotelId}
          defaultTaskType="cleaning"
        />
      )}
    </div>
  )
}
