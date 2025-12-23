import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Users, 
  Bed, 
  Maximize, 
  CheckCircle, 
  AlertTriangle,
  Wind,
  Clock,
  Truck,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { RoomStatusSelector } from './RoomStatusSelector'
import { useAllRoomCheckSessions } from '@/hooks/useRoomCheckSession'
import { usePendingRoomDistributions } from '@/hooks/usePendingRoomDistributions'
import { useUser } from '@/hooks/useUser'
import { hasPermission } from '@/lib/permissions'
import { formatCurrency } from '@/lib/utils'
import type { RoomWithStats, RoomStatus } from '@/types/rooms.types'

interface RoomGridProps {
  rooms: RoomWithStats[]
  isLoading: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function RoomGrid({ rooms, isLoading, selectedIds, onSelectionChange }: RoomGridProps) {
  const { t } = useTranslation(['rooms', 'distribution'])
  const navigate = useNavigate()
  const checkSessions = useAllRoomCheckSessions()
  const { data: pendingDistributions } = usePendingRoomDistributions()
  const { user, role } = useUser()
  
  // Staff cannot view room details
  const canViewRoomDetail = hasPermission(role, 'manage_rooms') || role !== 'staff'
  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, roomId])
    } else {
      onSelectionChange(selectedIds.filter((id) => id !== roomId))
    }
  }
  
  const getCheckTypeLabel = (type: string) => {
    return t(`checkTypes.${type}`, { defaultValue: type })
  }
  
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }
  
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bed className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">{t('grid.noRooms')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('grid.tryChangeFilter')}
        </p>
      </div>
    )
  }
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rooms.map((room) => {
        const isSelected = selectedIds.includes(room.id)
        const pendingCount = pendingDistributions?.get(room.id) || 0
        return (
          <Card
            key={room.id}
            className={`transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
            } ${canViewRoomDetail ? 'cursor-pointer' : ''}`}
            onClick={() => canViewRoomDetail && navigate(`/rooms/${room.id}`)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => handleSelectRoom(room.id, !!checked)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{room.room_number}</h3>
                    <p className="text-sm text-muted-foreground capitalize">
                      {t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type })}
                    </p>
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <RoomStatusSelector 
                    roomId={room.id}
                    currentStatus={room.status as RoomStatus}
                  />
                </div>
              </div>
            </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>{room.max_guests}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bed className="h-3 w-3 text-muted-foreground" />
                <span className="capitalize">{room.bed_type || t('detail.na')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Maximize className="h-3 w-3 text-muted-foreground" />
                <span>{room.area_sqm || t('detail.na')} m²</span>
              </div>
            </div>
            
            <div className="space-y-1 border-t pt-2 text-xs">
              {checkSessions[room.id] ? (
                <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <span className="font-medium">
                    {t('checkSession.checking', { 
                      name: checkSessions[room.id].user_name,
                      type: getCheckTypeLabel(checkSessions[room.id].check_type)
                    })}
                  </span>
                </div>
              ) : room.missing_items === 0 ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>{t('grid.itemsComplete')}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t('grid.missingItems', { count: room.missing_items })}</span>
                </div>
              )}
              
              {room.items_in_laundry > 0 && (
                <div className="flex items-center gap-1 text-cyan-600">
                  <Wind className="h-3 w-3" />
                  <span>{t('grid.itemsInLaundry', { count: room.items_in_laundry })}</span>
                </div>
              )}
              
              {pendingCount > 0 && (
                <div className="flex items-center gap-1 text-amber-600">
                  <Truck className="h-3 w-3" />
                  <span>{t('distribution:roomHistory.pendingDeliveries', { count: pendingCount })}</span>
                </div>
              )}
            </div>
            
            {room.base_price && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">{t('grid.basePrice')}</p>
                <p className="font-semibold">{formatCurrency(room.base_price)}{t('grid.perNight')}</p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="gap-2">
            {canViewRoomDetail && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/rooms/${room.id}`)
                }}
              >
                {t('actions.viewDetail')}
              </Button>
            )}
            <Button
              size="sm"
              className="flex-1"
              disabled={checkSessions[room.id] && checkSessions[room.id].user_id !== user?.id}
              onClick={(e) => {
                e.stopPropagation()
                const hasSession = checkSessions[room.id] && checkSessions[room.id].user_id === user?.id
                navigate(`/rooms/${room.id}/check${hasSession ? '?resume=true' : ''}`)
              }}
            >
              {checkSessions[room.id] 
                ? (checkSessions[room.id].user_id === user?.id ? t('checkSession.continueCheck') : t('checkSession.inProgress'))
                : t('checkSession.check')
              }
            </Button>
          </CardFooter>
        </Card>
        )
      })}
    </div>
  )
}