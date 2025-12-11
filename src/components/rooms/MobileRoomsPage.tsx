import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRooms } from '@/hooks/useRooms'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { RoomStatusBadge } from './RoomStatusBadge'
import { MobileRoomFilters } from './MobileRoomFilters'
import { 
  Bed, CheckCircle, Wrench, Plus, Search, 
  Users, Square, LogIn, LogOut, Sparkles, XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomFilters as IRoomFilters, RoomStatus, RoomType } from '@/types/rooms.types'

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
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  
  // Advanced filters
  const [floorFilter, setFloorFilter] = useState<number | undefined>(undefined)
  const [roomTypeFilter, setRoomTypeFilter] = useState<RoomType | undefined>(undefined)
  const [missingItemsOnly, setMissingItemsOnly] = useState(false)
  
  const [filters, setFilters] = useState<IRoomFilters>({})
  
  const { data: rooms = [], isLoading, refetch } = useRooms(filters)

  // Get unique floors for filter
  const availableFloors = useMemo(() => {
    const floors = [...new Set(rooms.map((r: any) => r.floor).filter(Boolean))]
    return floors.sort((a, b) => a - b)
  }, [rooms])

  const filteredRooms = useMemo(() => {
    return rooms.filter((room: any) => {
      // Status filter
      const matchesStatus = statusFilter === 'all' || room.status === statusFilter
      
      // Search filter
      const matchesSearch = !search || 
        room.room_number?.toLowerCase().includes(search.toLowerCase()) ||
        room.floor?.toString().includes(search)
      
      // Floor filter
      const matchesFloor = floorFilter === undefined || room.floor === floorFilter
      
      // Room type filter
      const matchesRoomType = roomTypeFilter === undefined || room.room_type === roomTypeFilter
      
      // Missing items filter
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

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as RoomStatus] || {
      label: status,
      icon: Bed,
      color: 'text-gray-600 bg-gray-100'
    }
  }

  // Stats - all 7 statuses
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

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileDetailHeader
        title="Phòng"
        showBack
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

      {/* Stats Cards - Horizontal Scroll */}
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

      {/* Filter Tabs - All 7 statuses */}
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
              const hasActiveCheck = room.active_check_session
              const checkTypeLabel = hasActiveCheck ? (
                room.active_check_session.check_type === 'daily' ? 'hàng ngày' :
                room.active_check_session.check_type === 'checkin' ? 'check-in' :
                room.active_check_session.check_type === 'checkout' ? 'check-out' :
                room.active_check_session.check_type === 'maintenance' ? 'bảo trì' : ''
              ) : ''

              return (
                <Card
                  key={room.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="p-4">
                    {/* Header: Room Number + Status Badge */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-xl">{room.room_number}</div>
                        <div className="text-sm text-muted-foreground">
                          {room.room_type === 'standard' ? 'Standard' :
                           room.room_type === 'deluxe' ? 'Deluxe' :
                           room.room_type === 'suite' ? 'Suite' :
                           room.room_type === 'vip' ? 'VIP' : room.room_type || 'N/A'}
                        </div>
                      </div>
                      <RoomStatusBadge status={room.status as RoomStatus} />
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

                    {/* Active Check Session */}
                    {hasActiveCheck && (
                      <div className="flex items-center gap-2 text-sm text-amber-600 mb-3">
                        <div className="animate-pulse h-2 w-2 rounded-full bg-amber-500" />
                        <span>
                          {room.active_check_session.user_name || 'Nhân viên'} đang kiểm tra {checkTypeLabel}
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
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/rooms/${room.id}/check`)
                        }}
                      >
                        {hasActiveCheck ? 'Đang kiểm tra' : 'Kiểm tra'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </PullToRefresh>
    </div>
  )
}
