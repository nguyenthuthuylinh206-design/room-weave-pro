import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Bed, AlertCircle } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRooms, useRoomStats } from '@/hooks/useRooms'
import { useUser } from '@/hooks/useUser'
import { useBreakpoint } from '@/lib/breakpoints'
import { StaffRoomCheckView } from '@/components/rooms/StaffRoomCheckView'
import { ManagerRoomChecksView } from '@/components/rooms/ManagerRoomChecksView'
import { MobileRoomsDashboard } from '@/components/rooms/MobileRoomsDashboard'
import { RoomStatusSelector } from '@/components/rooms/RoomStatusSelector'
import { PermissionGate } from '@/components/auth/PermissionGate'
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
        <PermissionGate module="rooms" action="create">
          <Button onClick={() => navigate('/rooms/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm phòng mới
          </Button>
        </PermissionGate>
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
                <div key={i} className="animate-pulse border rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <div className="h-4 bg-muted rounded w-16" />
                    <div className="h-4 bg-muted rounded w-12" />
                  </div>
                  <div className="h-3 bg-muted rounded w-20" />
                </div>
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

const statusTextColors = {
  vacant: 'text-green-600 dark:text-green-400',
  occupied: 'text-blue-600 dark:text-blue-400',
  check_in: 'text-purple-600 dark:text-purple-400',
  check_out: 'text-indigo-600 dark:text-indigo-400',
  cleaning: 'text-amber-600 dark:text-amber-400',
  maintenance: 'text-orange-600 dark:text-orange-400',
  out_of_order: 'text-destructive',
}

function StatusCard({ label, count, status, active, onClick }: StatusCardProps) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
        active ? 'ring-2 ring-primary bg-muted/30' : ''
      }`}
    >
      <span className={`text-2xl font-bold ${statusTextColors[status]}`}>{count}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </button>
  )
}

interface RoomCardProps {
  room: any
  onClick: () => void
}

function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <div 
      className="p-3 border rounded-lg cursor-pointer hover:border-primary hover:bg-muted/30 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold">P{room.room_number}</p>
          <p className="text-xs text-muted-foreground">Tầng {room.floor}</p>
        </div>
        <RoomStatusSelector 
          roomId={room.id} 
          currentStatus={room.status}
        />
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Bed className="h-3.5 w-3.5" />
          <span className="capitalize text-xs">{room.room_type}</span>
        </div>
        {(room.missing_items > 0 || room.items_in_laundry > 0) && (
          <div className="flex items-center gap-1 text-amber-600 text-xs">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>
              {room.missing_items > 0 && `${room.missing_items} thiếu`}
              {room.missing_items > 0 && room.items_in_laundry > 0 && ', '}
              {room.items_in_laundry > 0 && `${room.items_in_laundry} giặt`}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
