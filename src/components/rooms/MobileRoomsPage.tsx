import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useRooms } from '@/hooks/useRooms'
import { useAllRoomCheckSessions } from '@/hooks/useRoomCheckSession'
import { useAuth } from '@/hooks/useAuth'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { RoomStatusBadge } from './RoomStatusBadge'
import { RoomStatusSelector } from './RoomStatusSelector'
import { MobileRoomFilters } from './MobileRoomFilters'
import { MobileRoomBulkActionsBar } from './MobileRoomBulkActionsBar'
import { 
  Bed, CheckCircle, Wrench, Plus, Search, 
  Users, Square, LogIn, LogOut, Sparkles, XCircle,
  Package, AlertTriangle, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomFilters as IRoomFilters, RoomStatus, RoomType, RoomWithStats } from '@/types/rooms.types'

type FilterStatus = 'all' | RoomStatus

const STATUS_CONFIG: Record<RoomStatus, { label: string; icon: typeof Bed; color: string }> = {
  vacant: { label: 'Trống', icon: CheckCircle, color: 'text-green-600 bg-green-100' },
  occupied: { label: 'Đang ở', icon: Bed, color: 'text-blue-600 bg-blue-100' },
  check_in: { label: 'Check In', icon: LogIn, color: 'text-purple-600 bg-purple-100' },
  check_out: { label: 'Check Out', icon: LogOut, color: 'text-indigo-600 bg-indigo-100' },
  cleaning: { label: 'Đang dọn', icon: Sparkles, color: 'text-yellow-600 bg-yellow-100' },
  maintenance: { label: 'Bảo trì', icon: Wrench, color: 'text-orange-600 bg-orange-100' },
  out_of_order: { label: 'Hỏng', icon: XCircle, color: 'text-red-600 bg-red-100' },
}

const ALL_STATUSES: RoomStatus[] = ['vacant', 'occupied', 'check_in', 'check_out', 'cleaning', 'maintenance', 'out_of_order']

export const MobileRoomsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
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
      return { label: 'Kiểm tra', variant: 'default' as const, disabled: false }
    }
    
    const isOwnSession = session.user_id === user?.id
    if (isOwnSession) {
      return { label: 'Tiếp tục kiểm tra', variant: 'default' as const, disabled: false }
    }
    
    return { 
      label: `${session.user_name} đang kiểm tra`, 
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
      return { label: 'Chưa thiết lập đồ', color: 'bg-muted text-muted-foreground' }
    }

    if (missingItems > 0) {
      return { 
        label: `Thiếu ${missingItems}/${totalItems}`, 
        color: 'bg-destructive/10 text-destructive',
        icon: AlertTriangle
      }
    }

    return { 
      label: 'Đủ đồ', 
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle
    }
  }

  return (
    <div className={cn("min-h-screen bg-background", selectedIds.length > 0 ? "pb-36" : "pb-20")}>
      <MobileDetailHeader
        title="Phòng"
        showBack
        rightContent={
          selectionMode ? (
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              Hủy
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setSelectionMode(true)}>
              Chọn
            </Button>
          )
        }
      />

      {/* Add Button */}
      <div className="p-4">
        <Button
          className="w-full"
          onClick={() => navigate('/rooms/new')}
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm phòng mới
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="px-4 pb-3 overflow-x-auto">
        <div className="flex gap-3 min-w-max">
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Tổng</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-green-600">{stats.vacant}</div>
              <div className="text-xs text-muted-foreground">Trống</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-blue-600">{stats.occupied}</div>
              <div className="text-xs text-muted-foreground">Đang ở</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-purple-600">{stats.check_in}</div>
              <div className="text-xs text-muted-foreground">Check In</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-indigo-600">{stats.check_out}</div>
              <div className="text-xs text-muted-foreground">Check Out</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-yellow-600">{stats.cleaning}</div>
              <div className="text-xs text-muted-foreground">Đang dọn</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-orange-600">{stats.maintenance}</div>
              <div className="text-xs text-muted-foreground">Bảo trì</div>
            </CardContent>
          </Card>
          <Card className="min-w-[100px]">
            <CardContent className="p-3">
              <div className="text-xl font-bold text-red-600">{stats.out_of_order}</div>
              <div className="text-xs text-muted-foreground">Hỏng</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar + Advanced Filters */}
      <div className="px-4 pb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm số phòng, tầng..."
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
                ? `Đã chọn ${selectedIds.length}/${filteredRooms.length}`
                : 'Chọn tất cả'
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
            Tất cả
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
              {STATUS_CONFIG[status].label}
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
                  {search ? 'Không tìm thấy phòng' : 'Chưa có phòng nào'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRooms.map((room: any) => {
              const checkButtonState = getCheckButtonState(room)
              const itemStatus = getItemStatusDisplay(room)
              const session = checkSessions[room.id]
              const isSelected = selectedIds.includes(room.id)

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
                          <div className="font-bold text-xl">{room.room_number}</div>
                          <div className="text-sm text-muted-foreground">
                            {room.room_type === 'standard' ? 'Standard' :
                             room.room_type === 'deluxe' ? 'Deluxe' :
                             room.room_type === 'suite' ? 'Suite' :
                             room.room_type === 'vip' ? 'VIP' : room.room_type || 'N/A'}
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
                        {itemStatus.icon && <itemStatus.icon className="h-3 w-3 mr-1" />}
                        <Package className="h-3 w-3 mr-1" />
                        {itemStatus.label}
                      </Badge>
                      {room.items_in_laundry > 0 && (
                        <Badge variant="outline" className="text-xs bg-cyan-100 text-cyan-700">
                          <Loader2 className="h-3 w-3 mr-1" />
                          {room.items_in_laundry} đang giặt
                        </Badge>
                      )}
                    </div>

                    {/* Active Check Session */}
                    {session && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 mb-3 bg-amber-50 rounded-lg px-3 py-2">
                        <div className="animate-pulse h-2 w-2 rounded-full bg-amber-500" />
                        <span>
                          {session.user_name} đang kiểm tra{' '}
                          {session.check_type === 'daily' ? 'hàng ngày' :
                           session.check_type === 'checkin' ? 'check-in' :
                           session.check_type === 'checkout' ? 'check-out' :
                           session.check_type === 'maintenance' ? 'bảo trì' : ''}
                        </span>
                      </div>
                    )}

                    {/* Price */}
                    <div className="mb-4">
                      <div className="text-xs text-muted-foreground">Giá cơ bản</div>
                      <div className="text-lg font-semibold text-primary">
                        {room.base_price ? formatPrice(room.base_price) : '—'}/đêm
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
                          Xem chi tiết
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          variant={checkButtonState.variant}
                          disabled={checkButtonState.disabled}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/rooms/${room.id}/check`)
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
    </div>
  )
}
