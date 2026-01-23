import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useRooms } from '@/hooks/useRooms'
import { useAllRoomCheckSessions } from '@/hooks/useRoomCheckSession'
import { usePendingRoomDistributions } from '@/hooks/usePendingRoomDistributions'
import { usePendingTaskCount } from '@/hooks/useHousekeepingTasks'
import { useAuth } from '@/contexts/AuthContext'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { RoomStatusBadge } from './RoomStatusBadge'
import { RoomStatusSelector } from './RoomStatusSelector'
import { MobileRoomFilters } from './MobileRoomFilters'
import { MobileRoomBulkActionsBar } from './MobileRoomBulkActionsBar'
import { StaffTasksTab } from '@/components/housekeeping/StaffTasksTab'
import { 
  Bed, CheckCircle, Wrench, Plus, Search, 
  Users, Square, LogIn, LogOut, Sparkles, XCircle,
  Package, AlertTriangle, Loader2, Truck, ClipboardList
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomFilters as IRoomFilters, RoomStatus, RoomType, RoomWithStats } from '@/types/rooms.types'

type FilterStatus = 'all' | RoomStatus

const STATUS_ICONS: Record<RoomStatus, typeof Bed> = {
  vacant: CheckCircle,
  occupied: Bed,
  check_in: LogIn,
  check_out: LogOut,
  cleaning: Sparkles,
  maintenance: Wrench,
  out_of_order: XCircle,
}

const ALL_STATUSES: RoomStatus[] = ['vacant', 'occupied', 'check_in', 'check_out', 'cleaning', 'maintenance', 'out_of_order']

export const MobileRoomsPage = () => {
  const { t } = useTranslation(['rooms', 'common', 'distribution'])
  const navigate = useNavigate()
  const { user } = useAuth()
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
  
  const [filters, setFilters] = useState<IRoomFilters>({})
  
  const { data: rooms = [], isLoading, refetch } = useRooms(filters)
  const checkSessions = useAllRoomCheckSessions()
  const { data: pendingDistributions } = usePendingRoomDistributions()
  const { data: pendingTaskCount = 0 } = usePendingTaskCount()

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

  const handleLongPress = (roomId: string) => {
    if (!selectionMode) {
      setSelectionMode(true)
      setSelectedIds([roomId])
    }
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

  const formatPrice = (price: number | null | undefined) => {
    if (!price) return null
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(price)
  }

  // Get check button state
  const getCheckButtonState = (room: any) => {
    const session = checkSessions[room.id]
    if (!session) {
      return { label: t('checkSession.check'), variant: 'default' as const, disabled: false }
    }
    
    const isOwnSession = session.user_id === user?.id
    if (isOwnSession) {
      return { label: t('checkSession.continueCheck'), variant: 'default' as const, disabled: false }
    }
    
    return { 
      label: t('checkSession.inProgress'), 
      variant: 'secondary' as const, 
      disabled: true 
    }
  }

  // Get item status display
  const getItemStatusDisplay = (room: RoomWithStats) => {
    const totalItems = room.total_items || 0
    const missingItems = room.missing_items || 0
    const inLaundry = room.items_in_laundry || 0

    if (totalItems === 0) {
      return { label: t('itemStatus.notSetup'), color: 'bg-muted text-muted-foreground' }
    }

    if (missingItems > 0) {
      return { 
        label: t('itemStatus.missing', { missing: missingItems, total: totalItems }), 
        color: 'bg-destructive/10 text-destructive',
        icon: AlertTriangle
      }
    }

    return { 
      label: t('itemStatus.complete'), 
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    }
  }

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
            filteredRooms.map((room: any) => {
              const checkButtonState = getCheckButtonState(room)
              const itemStatus = getItemStatusDisplay(room)
              const session = checkSessions[room.id]
              const isSelected = selectedIds.includes(room.id)
              const pendingCount = pendingDistributions?.get(room.id) || 0

              return (
                <Card
                  key={room.id}
                  className={cn(
                    "hover:shadow-md transition-all",
                    isSelected && "ring-2 ring-primary bg-primary/5"
                  )}
                  onClick={() => selectionMode && toggleSelectRoom(room.id)}
                >
                  <CardContent className="p-4">
                    {/* Header: Checkbox + Room Number + Status Selector */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        {selectionMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRoom(room.id)}
                            className="mt-1"
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xl">{room.room_number}</span>
                            {pendingCount > 0 && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                                <Truck className="h-3 w-3 mr-1" />
                                {pendingCount}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type || 'N/A' })}
                          </div>
                        </div>
                      </div>
                      {/* Room Status Selector */}
                      <RoomStatusSelector 
                        roomId={room.id} 
                        currentStatus={room.status as RoomStatus} 
                      />
                    </div>

                    {/* Room Info Row */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      {room.max_guests && (
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{room.max_guests}</span>
                        </div>
                      )}
                      {room.bed_type && (
                        <div className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          <span>{room.bed_type}</span>
                        </div>
                      )}
                      {room.area && (
                        <div className="flex items-center gap-1">
                          <Square className="h-4 w-4" />
                          <span>{room.area} m²</span>
                        </div>
                      )}
                    </div>

                    {/* Item Status Display */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", itemStatus.color)}
                      >
                        {itemStatus.icon ? (
                          <itemStatus.icon className="h-3 w-3 mr-1" />
                        ) : (
                          <Package className="h-3 w-3 mr-1" />
                        )}
                        {itemStatus.label}
                      </Badge>
                      {room.items_in_laundry > 0 && (
                        <Badge variant="outline" className="text-xs bg-cyan-100 text-cyan-700">
                          <Loader2 className="h-3 w-3 mr-1" />
                          {t('itemStatus.inLaundry', { count: room.items_in_laundry })}
                        </Badge>
                      )}
                      {pendingCount > 0 && (
                        <Badge variant="outline" className="text-xs bg-amber-100 text-amber-700">
                          <Truck className="h-3 w-3 mr-1" />
                          {t('distribution:roomHistory.pendingDeliveries', { count: pendingCount })}
                        </Badge>
                      )}
                    </div>

                    {/* Active Check Session */}
                    {session && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 mb-3 bg-amber-50 rounded-lg px-3 py-2">
                        <div className="animate-pulse h-2 w-2 rounded-full bg-amber-500" />
                        <span>
                          {t('checkSession.checking', { 
                            name: session.user_name, 
                            type: t(`checkTypes.${session.check_type}`)
                          })}
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground">{t('price.basePrice')}</div>
                      <div className="text-lg font-semibold text-primary">
                        {room.base_price ? formatPrice(room.base_price) : '—'}{t('price.perNight')}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {!selectionMode && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/rooms/${room.id}`)
                          }}
                        >
                          {t('actions.viewDetail')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          variant={checkButtonState.variant}
                          disabled={checkButtonState.disabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            const hasSession = checkSessions[room.id] && checkSessions[room.id].user_id === user?.id
                            navigate(`/rooms/${room.id}/check${hasSession ? '?resume=true' : ''}`)
                          }}
                        >
                          {checkButtonState.label}
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
          />
        </>
      )}
    </div>
  )
}
