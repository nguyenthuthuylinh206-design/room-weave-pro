import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Clock, ClipboardList, Bed } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shared/PageHeader'
import { CheckTypeSelector } from './CheckTypeSelector'
import { StaffTasksTab } from '@/components/housekeeping/StaffTasksTab'
import { useRooms } from '@/hooks/useRooms'
import { useRoomLastCheck } from '@/hooks/useRoomLastCheck'
import { useAllRoomCheckSessions } from '@/hooks/useRoomCheckSession'
import { usePendingTaskCount } from '@/hooks/useHousekeepingTasks'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { RoomFilters, RoomStatus } from '@/types/rooms.types'

export function StaffRoomCheckView() {
  const [activeTab, setActiveTab] = useState<'rooms' | 'tasks'>('rooms')
  const [filters, setFilters] = useState<RoomFilters>({})
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [showCheckSelector, setShowCheckSelector] = useState(false)
  
  const { data: rooms, isLoading } = useRooms(filters)
  const checkSessions = useAllRoomCheckSessions()
  const { data: pendingTaskCount = 0 } = usePendingTaskCount()

  const handleStartCheck = (roomId: string) => {
    setSelectedRoomId(roomId)
    setShowCheckSelector(true)
  }

  const getStatusColor = (status: RoomStatus) => {
    const colors = {
      vacant: 'bg-green-500',
      occupied: 'bg-blue-500',
      cleaning: 'bg-yellow-500',
      maintenance: 'bg-orange-500',
      out_of_order: 'bg-red-500',
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusLabel = (status: RoomStatus) => {
    const labels = {
      vacant: 'Trống',
      occupied: 'Đang ở',
      cleaning: 'Đang dọn',
      maintenance: 'Bảo trì',
      out_of_order: 'Hỏng',
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiểm tra phòng"
        description="Chọn phòng để thực hiện kiểm tra hoặc xem công việc được giao"
      />

      {/* Tabs: Rooms vs Tasks */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'rooms' | 'tasks')}>
        <TabsList>
          <TabsTrigger value="rooms" className="gap-2">
            <Bed className="h-4 w-4" />
            Danh sách phòng
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2 relative">
            <ClipboardList className="h-4 w-4" />
            Công việc
            {pendingTaskCount > 0 && (
              <Badge 
                variant="destructive" 
                className="ml-2 h-5 min-w-5 px-1.5 text-xs"
              >
                {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <StaffTasksTab />
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="mt-6 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm số phòng..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={filters.floor?.toString() || 'all'}
                  onValueChange={(value) => 
                    setFilters({ ...filters, floor: value === 'all' ? undefined : Number(value) })
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Tầng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả tầng</SelectItem>
                    {[1, 2, 3, 4, 5].map((floor) => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Tầng {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(value) => 
                    setFilters({ ...filters, status: value === 'all' ? undefined : value as RoomStatus })
                  }
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="vacant">Trống</SelectItem>
                    <SelectItem value="occupied">Đang ở</SelectItem>
                    <SelectItem value="cleaning">Đang dọn</SelectItem>
                    <SelectItem value="maintenance">Bảo trì</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Rooms Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {rooms?.map((room) => (
                <RoomCheckCard
                  key={room.id}
                  room={room}
                  checkSession={checkSessions[room.id]}
                  onStartCheck={handleStartCheck}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Check Type Selector Modal */}
      {selectedRoomId && (
        <CheckTypeSelector
          open={showCheckSelector}
          onOpenChange={setShowCheckSelector}
          roomId={selectedRoomId}
          roomNumber={rooms?.find(r => r.id === selectedRoomId)?.room_number || ''}
        />
      )}
    </div>
  )
}

interface RoomCheckCardProps {
  room: any
  checkSession?: any
  onStartCheck: (roomId: string) => void
  getStatusColor: (status: RoomStatus) => string
  getStatusLabel: (status: RoomStatus) => string
}

function RoomCheckCard({ room, checkSession, onStartCheck, getStatusColor, getStatusLabel }: RoomCheckCardProps) {
  const { data: lastCheck, isLoading: lastCheckLoading } = useRoomLastCheck(room.id)
  
  const getCheckTypeLabel = (type: string) => {
    const labels = {
      daily: 'đầu ngày',
      checkin: 'trước check-in',
      checkout: 'sau check-out',
      maintenance: 'bảo trì'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-2xl font-bold">P{room.room_number}</CardTitle>
            <p className="text-sm text-muted-foreground">Tầng {room.floor}</p>
          </div>
          <Badge variant="secondary" className={`${getStatusColor(room.status)} text-white`}>
            {getStatusLabel(room.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="text-muted-foreground">Loại phòng</p>
          <p className="font-medium capitalize">{room.room_type}</p>
        </div>

        {/* Check Session or Last Check Info */}
        <div className="text-sm border-t pt-3">
          {checkSession ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Clock className="h-4 w-4 animate-pulse" />
                <p className="font-semibold">Đang kiểm tra</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-md p-2 space-y-1">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  {checkSession.user_name}
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Kiểm tra {getCheckTypeLabel(checkSession.check_type)}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {formatDistanceToNow(new Date(checkSession.started_at), {
                    addSuffix: true,
                    locale: vi,
                  })}
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-1">Lần kiểm tra gần nhất</p>
              {lastCheckLoading ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : lastCheck ? (
                <div className="space-y-1">
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(lastCheck.checked_at), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bởi: {lastCheck.checked_by?.full_name || 'N/A'}
                  </p>
                  {lastCheck.items_complete ? (
                    <Badge variant="default" className="bg-success text-white">
                      Đồ dùng đã đủ
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      Thiếu {Array.isArray(lastCheck.items_missing) ? lastCheck.items_missing.length : 0} items
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground italic">Chưa có lần kiểm tra nào</p>
              )}
            </>
          )}
        </div>

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => onStartCheck(room.id)}
          disabled={!!checkSession}
        >
          {checkSession ? 'Đang được kiểm tra' : 'Kiểm tra ngay'}
        </Button>
      </CardContent>
    </Card>
  )
}
