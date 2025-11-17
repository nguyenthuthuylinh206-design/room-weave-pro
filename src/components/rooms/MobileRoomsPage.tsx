import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MobileDetailHeader } from '@/components/layout/MobileDetailHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRooms } from '@/hooks/useRooms'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { Bed, CheckCircle, AlertTriangle, Wrench, Plus, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RoomFilters as IRoomFilters } from '@/types/rooms.types'

type FilterStatus = 'all' | 'available' | 'occupied' | 'maintenance'

const STATUS_CONFIG = {
  available: { label: 'Trống', icon: CheckCircle, color: 'bg-green-500' },
  occupied: { label: 'Có khách', icon: Bed, color: 'bg-blue-500' },
  maintenance: { label: 'Bảo trì', icon: Wrench, color: 'bg-yellow-500' },
}

export const MobileRoomsPage = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<IRoomFilters>({})
  
  const { data: rooms = [], isLoading, refetch } = useRooms(filters)

  const filteredRooms = rooms.filter((room: any) => {
    const matchesFilter = filter === 'all' || room.status === filter
    const matchesSearch = !search || 
      room.room_number?.toLowerCase().includes(search.toLowerCase()) ||
      room.floor?.toString().includes(search)
    return matchesFilter && matchesSearch
  })

  const handleRefresh = async () => {
    await refetch()
  }

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      label: status,
      icon: Bed,
      color: 'bg-gray-500'
    }
  }

  // Stats
  const stats = {
    total: rooms.length,
    available: rooms.filter((r: any) => r.status === 'available').length,
    occupied: rooms.filter((r: any) => r.status === 'occupied').length,
    maintenance: rooms.filter((r: any) => r.status === 'maintenance').length,
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
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Tổng phòng</div>
            </CardContent>
          </Card>
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{stats.available}</div>
              <div className="text-sm text-muted-foreground">Trống</div>
            </CardContent>
          </Card>
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.occupied}</div>
              <div className="text-sm text-muted-foreground">Có khách</div>
            </CardContent>
          </Card>
          <Card className="min-w-[160px]">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.maintenance}</div>
              <div className="text-sm text-muted-foreground">Bảo trì</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm số phòng, tầng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="sticky top-14 bg-background border-b z-10 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {(['all', 'available', 'occupied', 'maintenance'] as FilterStatus[]).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              )}
            >
              {status === 'all' ? 'Tất cả' : STATUS_CONFIG[status].label}
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
                  <div className="h-24 bg-muted rounded" />
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
              const statusConfig = getStatusConfig(room.status)
              const StatusIcon = statusConfig.icon

              return (
                <Card
                  key={room.id}
                  className="cursor-pointer hover:shadow-md transition-shadow active:scale-98"
                  onClick={() => navigate(`/rooms/${room.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg', statusConfig.color, 'bg-opacity-20')}>
                          <StatusIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            Phòng {room.room_number}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Tầng {room.floor}
                          </div>
                        </div>
                      </div>
                      <Badge variant={
                        room.status === 'available' ? 'default' :
                        room.status === 'occupied' ? 'secondary' :
                        'outline'
                      }>
                        {statusConfig.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-muted-foreground">Loại phòng</div>
                        <div className="font-medium">{room.room_type?.name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Đồ dùng</div>
                        <div className="font-medium">{room._count?.room_items || 0} loại</div>
                      </div>
                    </div>

                    {room.notes && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-xs text-muted-foreground line-clamp-2">
                          {room.notes}
                        </div>
                      </div>
                    )}
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
