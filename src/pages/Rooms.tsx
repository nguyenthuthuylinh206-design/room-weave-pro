import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRooms, useRoomStats } from '@/hooks/useRooms'
import { useUser } from '@/hooks/useUser'
import { cn } from '@/lib/utils'
import type { RoomStatus, RoomWithStats } from '@/types/rooms.types'

export default function RoomsPage() {
  const { tenantId, hotelId } = useUser()
  const [filters, setFilters] = useState<{ status?: RoomStatus }>({})
  const { t } = useTranslation('rooms')
  
  const { data: rooms, isLoading: roomsLoading } = useRooms(filters)
  const { data: stats, isLoading: statsLoading } = useRoomStats(tenantId, hotelId)

  return (
    <div className="space-y-6">
        <PageHeader
          title={t('title')}
          description={t('description')}
          action={{
            label: t('addRoom'),
            icon: Plus,
            onClick: () => console.log('Add room'),
          }}
        />

        {/* Status Overview */}
        {statsLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-4">
            <StatusCard
              label={t('status.vacant')}
              count={stats?.vacant || 0}
              color="success"
              onClick={() => setFilters({ status: 'vacant' })}
              active={filters.status === 'vacant'}
            />
            <StatusCard
              label={t('status.occupied')}
              count={stats?.occupied || 0}
              color="primary"
              onClick={() => setFilters({ status: 'occupied' })}
              active={filters.status === 'occupied'}
            />
            <StatusCard
              label={t('status.cleaning')}
              count={stats?.cleaning || 0}
              color="warning"
              onClick={() => setFilters({ status: 'cleaning' })}
              active={filters.status === 'cleaning'}
            />
            <StatusCard
              label={t('status.maintenance')}
              count={stats?.maintenance || 0}
              color="destructive"
              onClick={() => setFilters({ status: 'maintenance' })}
              active={filters.status === 'maintenance'}
            />
          </div>
        )}

        {/* Room Grid */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {filters.status ? t('roomsByStatus', { status: getStatusLabel(filters.status, t) }) : t('allRooms')}
            </h2>
            {filters.status && (
              <button
                onClick={() => setFilters({})}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t('clearFilter')}
              </button>
            )}
          </div>
          
          {roomsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rooms.map((room) => (
                <RoomCard key={room.id} room={room} t={t} />
              ))}
            </div>
          ) : (
            <Card className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">{t('noRoomsFound')}</p>
            </Card>
          )}
        </div>
    </div>
  )
}

function getStatusLabel(status: RoomStatus, t: any): string {
  const labels: Record<RoomStatus, string> = {
    vacant: t('status.vacant'),
    occupied: t('status.occupied'),
    cleaning: t('status.cleaning'),
    maintenance: t('status.maintenance'),
    out_of_order: t('status.outOfOrder'),
  }
  return labels[status]
}

interface StatusCardProps {
  label: string
  count: number
  color: 'success' | 'primary' | 'warning' | 'destructive'
  onClick: () => void
  active?: boolean
}

function StatusCard({ label, count, color, onClick, active }: StatusCardProps) {
  const colorClasses = {
    success: 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100',
    primary: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
    warning: 'border-yellow-200 bg-yellow-50 text-yellow-700 hover:bg-yellow-100',
    destructive: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
  }

  return (
    <Card
      className={cn(
        'cursor-pointer border-2 p-6 transition-all',
        colorClasses[color],
        active && 'ring-2 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="text-4xl font-bold">{count}</div>
        <div className="mt-2 text-sm font-medium">{label}</div>
      </div>
    </Card>
  )
}

interface RoomCardProps {
  room: RoomWithStats
  t: any
}

function RoomCard({ room, t }: RoomCardProps) {
  const statusConfig = {
    vacant: { label: t('status.vacant'), color: 'bg-green-100 text-green-800' },
    occupied: { label: t('status.occupied'), color: 'bg-blue-100 text-blue-800' },
    cleaning: { label: t('status.cleaning'), color: 'bg-yellow-100 text-yellow-800' },
    maintenance: { label: t('status.maintenance'), color: 'bg-red-100 text-red-800' },
    out_of_order: { label: t('status.outOfOrder'), color: 'bg-gray-100 text-gray-800' },
  }

  const config = statusConfig[room.status as keyof typeof statusConfig]

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg cursor-pointer">
      <div className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold">{t('room')} {room.room_number}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('floor')} {room.floor} • {room.room_type}
            </p>
          </div>
          <Badge className={config.color}>{config.label}</Badge>
        </div>

        <div className="space-y-2 text-sm">
          {room.bed_type && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('bedType')}</span>
              <span className="font-medium capitalize">{room.bed_type}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('items')}</span>
            <span className="font-medium">{room.total_items} items</span>
          </div>
          {room.missing_items > 0 && (
            <div className="flex justify-between text-red-600">
              <span>{t('missing')}</span>
              <span className="font-medium">{room.missing_items} items</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
