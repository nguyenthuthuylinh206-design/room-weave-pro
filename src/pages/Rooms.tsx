import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Bed, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRooms, useRoomStats } from '@/hooks/useRooms'
import { useUser } from '@/hooks/useUser'
import { useBreakpoint } from '@/lib/breakpoints'
import { StaffRoomCheckView } from '@/components/rooms/StaffRoomCheckView'
import { ManagerRoomChecksView } from '@/components/rooms/ManagerRoomChecksView'
import { MobileRoomsDashboard } from '@/components/rooms/MobileRoomsDashboard'
import { RoomStatusSelector } from '@/components/rooms/RoomStatusSelector'
import type { RoomStatus } from '@/types/rooms.types'

export default function RoomsPage() {
  const navigate = useNavigate()
  const { user, role } = useUser()
  const { isMobile } = useBreakpoint()
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all')
  
  // ✅ ALL hooks MUST be declared BEFORE any conditional return
  const { data: rooms, isLoading } = useRooms(
    statusFilter === 'all' ? {} : { status: statusFilter }
  )
  const { data: stats } = useRoomStats(user?.tenant_id, user?.hotel_id)

  // ✅ Now safe to check role AFTER all hooks
  if (role === 'staff') {
    return <StaffRoomCheckView />
  }
  
  // ✅ Then check mobile
  if (isMobile) {
    return <MobileRoomsDashboard />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Phòng"
        description="Quản lý thông tin phòng và trạng thái"
      >
        <Button onClick={() => navigate('/rooms/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm phòng mới
        </Button>
      </PageHeader>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Tổng quan phòng</TabsTrigger>
          <TabsTrigger value="checks">Lịch sử kiểm tra</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Status Cards */}
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatusCard
              label="Phòng trống"
              count={stats?.vacant || 0}
              status="vacant"
              active={statusFilter === 'vacant'}
              onClick={() => setStatusFilter('vacant')}
            />
            <StatusCard
              label="Đang ở"
              count={stats?.occupied || 0}
              status="occupied"
              active={statusFilter === 'occupied'}
              onClick={() => setStatusFilter('occupied')}
            />
            <StatusCard
              label="Check In"
              count={stats?.check_in || 0}
              status="check_in"
              active={statusFilter === 'check_in'}
              onClick={() => setStatusFilter('check_in')}
            />
            <StatusCard
              label="Check Out"
              count={stats?.check_out || 0}
              status="check_out"
              active={statusFilter === 'check_out'}
              onClick={() => setStatusFilter('check_out')}
            />
            <StatusCard
              label="Đang dọn"
              count={stats?.cleaning || 0}
              status="cleaning"
              active={statusFilter === 'cleaning'}
              onClick={() => setStatusFilter('cleaning')}
            />
            <StatusCard
              label="Bảo trì"
              count={stats?.maintenance || 0}
              status="maintenance"
              active={statusFilter === 'maintenance'}
              onClick={() => setStatusFilter('maintenance')}
            />
          </div>

          {/* Rooms Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="space-y-2">
                    <div className="h-4 bg-muted rounded w-20" />
                    <div className="h-3 bg-muted rounded w-16" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))
            ) : (
              rooms?.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="checks">
          <ManagerRoomChecksView />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface StatusCardProps {
  label: string
  count: number
  status: RoomStatus
  active: boolean
  onClick: () => void
}

function StatusCard({ label, count, status, active, onClick }: StatusCardProps) {
  const getStatusColor = () => {
    const colors = {
      vacant: 'text-green-600 bg-green-50 dark:bg-green-950',
      occupied: 'text-blue-600 bg-blue-50 dark:bg-blue-950',
      check_in: 'text-purple-600 bg-purple-50 dark:bg-purple-950',
      check_out: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950',
      cleaning: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950',
      maintenance: 'text-orange-600 bg-orange-50 dark:bg-orange-950',
      out_of_order: 'text-red-600 bg-red-50 dark:bg-red-950',
    }
    return colors[status]
  }

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        active ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-3xl ${getStatusColor()}`}>
          {count}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

interface RoomCardProps {
  room: any
  onClick: () => void
}

function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={onClick}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">P{room.room_number}</CardTitle>
            <CardDescription>Tầng {room.floor}</CardDescription>
          </div>
          <RoomStatusSelector 
            roomId={room.id} 
            currentStatus={room.status}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Bed className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">{room.room_type}</span>
          </div>
          {(room.missing_items > 0 || room.items_in_laundry > 0) && (
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span>
                {room.missing_items > 0 && `${room.missing_items} thiếu`}
                {room.missing_items > 0 && room.items_in_laundry > 0 && ', '}
                {room.items_in_laundry > 0 && `${room.items_in_laundry} giặt`}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
