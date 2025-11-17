import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Bed, ClipboardCheck, AlertCircle } from 'lucide-react'
import { PullToRefresh } from '@/components/mobile/TouchOptimized'
import { StatScrollContainer, MobileStatCard } from '@/components/mobile/MobileDashboardStats'
import { SwipeableCard } from '@/components/mobile/TouchOptimized'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRooms, useRoomStats } from '@/hooks/useRooms'
import { useUser } from '@/hooks/useUser'
import { useQueryClient } from '@tanstack/react-query'
import type { RoomStatus } from '@/types/rooms.types'

const statusLabels = {
  vacant: 'Trống',
  occupied: 'Đang ở',
  check_in: 'Check In',
  check_out: 'Check Out',
  cleaning: 'Đang dọn',
  maintenance: 'Bảo trì',
  out_of_order: 'Ngừng hoạt động',
} as const

const statusColors = {
  vacant: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  occupied: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  check_in: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  check_out: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  cleaning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  maintenance: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  out_of_order: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
} as const

export function MobileRoomsDashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useUser()
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all')
  
  const { data: rooms, isLoading } = useRooms(
    statusFilter === 'all' ? {} : { status: statusFilter }
  )
  const { data: stats } = useRoomStats(user?.tenant_id, user?.hotel_id)

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['rooms'] })
    await queryClient.invalidateQueries({ queryKey: ['room-stats'] })
  }

  const quickActions = [
    {
      icon: Plus,
      label: 'Thêm phòng',
      onClick: () => navigate('/rooms/new'),
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: ClipboardCheck,
      label: 'Kiểm tra phòng',
      onClick: () => navigate('/rooms?action=check'),
      color: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: Bed,
      label: 'Xem tất cả',
      onClick: () => setStatusFilter('all'),
      color: 'text-green-600 dark:text-green-400',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-20">
        {/* Stats Overview */}
        <div className="space-y-2">
          <h2 className="text-lg font-semibold px-4">Trạng thái phòng</h2>
          <StatScrollContainer>
            <MobileStatCard
              icon={Bed}
              title="Phòng trống"
              value={stats?.vacant || 0}
              variant="success"
              onClick={() => setStatusFilter('vacant')}
            />
            <MobileStatCard
              icon={Bed}
              title="Đang ở"
              value={stats?.occupied || 0}
              variant="default"
              onClick={() => setStatusFilter('occupied')}
            />
            <MobileStatCard
              icon={Bed}
              title="Check In"
              value={stats?.check_in || 0}
              variant="default"
              onClick={() => setStatusFilter('check_in')}
            />
            <MobileStatCard
              icon={Bed}
              title="Check Out"
              value={stats?.check_out || 0}
              variant="warning"
              onClick={() => setStatusFilter('check_out')}
            />
            <MobileStatCard
              icon={Bed}
              title="Đang dọn"
              value={stats?.cleaning || 0}
              variant="default"
              onClick={() => setStatusFilter('cleaning')}
            />
            <MobileStatCard
              icon={AlertCircle}
              title="Bảo trì"
              value={stats?.maintenance || 0}
              variant="destructive"
              onClick={() => setStatusFilter('maintenance')}
            />
          </StatScrollContainer>
        </div>

        {/* Quick Actions */}
        <div className="px-4 space-y-3">
          <h2 className="text-lg font-semibold">Thao tác nhanh</h2>
          <div className="grid grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <Card
                key={action.label}
                className="cursor-pointer active:scale-95 transition-transform"
                onClick={action.onClick}
              >
                <CardContent className="flex flex-col items-center justify-center p-4 space-y-2">
                  <action.icon className={`h-6 w-6 ${action.color}`} />
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Rooms List */}
        <div className="px-4 space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">
              Danh sách phòng
              {statusFilter !== 'all' && ` (${statusLabels[statusFilter]})`}
            </h2>
            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="text-sm text-primary hover:underline"
              >
                Tất cả
              </button>
            )}
          </div>
          <div className="space-y-2">
            {rooms?.map((room) => (
              <SwipeableCard
                key={room.id}
                onSwipeLeft={() => navigate(`/rooms/${room.id}`)}
                onSwipeRight={() => navigate(`/rooms/${room.id}/check`)}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-lg">Phòng {room.room_number}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {room.room_type}
                          </p>
                        </div>
                        <Badge className={statusColors[room.status as keyof typeof statusColors]}>
                          {statusLabels[room.status as keyof typeof statusLabels]}
                        </Badge>
                      </div>
                      {room.floor && (
                        <p className="text-sm text-muted-foreground">
                          Tầng {room.floor}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </SwipeableCard>
            ))}
          </div>
        </div>

        {/* No Rooms */}
        {(!rooms || rooms.length === 0) && (
          <div className="px-4">
            <Card className="bg-muted/50">
              <CardContent className="p-6 text-center">
                <Bed className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {statusFilter === 'all' 
                    ? 'Chưa có phòng nào'
                    : `Không có phòng ${statusLabels[statusFilter]}`
                  }
                </p>
                {statusFilter === 'all' && (
                  <button
                    onClick={() => navigate('/rooms/new')}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Thêm phòng mới
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tips */}
        <div className="px-4 pb-4">
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                💡 <strong>Mẹo:</strong> Vuốt sang trái để xem chi tiết phòng, vuốt sang phải để kiểm tra phòng
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PullToRefresh>
  )
}
