import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Users,
  Bed,
  Maximize,
  CheckCircle,
  AlertTriangle,
  Wind,
  Clock,
  Truck,
  ClipboardList,
  PackageOpen,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { RoomStatusSelector } from './RoomStatusSelector'
import { CreateTaskDialog } from '@/components/housekeeping/CreateTaskDialog'
import { useAllRoomCheckSessions } from '@/hooks/useRoomCheckSession'
import { usePendingRoomDistributions } from '@/hooks/usePendingRoomDistributions'
import { useUser } from '@/hooks/useUser'
import { hasPermission } from '@/lib/permissions'
import { canCreateHousekeepingTask } from '@/lib/userAccess'
import { formatCurrency } from '@/lib/utils'
import { calcRoomPriority, getMissingDisplay, type PriorityTier } from '@/lib/roomPriority'
import type { RoomWithStats, RoomStatus } from '@/types/rooms.types'
import type { TaskType } from '@/types/housekeeping.types'
import { TASK_TYPE_LABELS } from '@/types/housekeeping.types'

type ManualTaskType = 'checkout_inspection' | 'cleaning' | 'checkin_prep' | 'amenity_request' | 'other'

const MANUAL_TASK_TYPES: ManualTaskType[] = ['checkout_inspection', 'cleaning', 'checkin_prep', 'amenity_request']

interface RoomGridProps {
  rooms: RoomWithStats[]
  isLoading: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

/** Vai trò tác nghiệp (chỉ HK staff): card gọn, ẩn giá. Department manager xem layout manager. */
function isOperationalRole(role: string | null | undefined) {
  return role === 'staff'
}

/** Map trạng thái phòng → màu chấm (semantic). */
function statusDotClass(status: string): string {
  switch (status) {
    case 'vacant_clean':
    case 'vacant_inspected':
    case 'vacant':
      return 'bg-green-500'
    case 'occupied_clean':
    case 'occupied_dirty':
    case 'occupied':
      return 'bg-blue-500'
    case 'vacant_dirty':
    case 'cleaning':
    case 'check_out':
      return 'bg-amber-500'
    case 'dnd':
    case 'service_refused':
    case 'sleep_out':
    case 'skipper':
      return 'bg-purple-500'
    case 'out_of_order':
    case 'out_of_service':
    case 'maintenance':
      return 'bg-red-500'
    case 'check_in':
      return 'bg-cyan-500'
    default:
      return 'bg-muted-foreground'
  }
}

/** Màu chữ cho mức độ trễ kiểm phòng. */
function lastCheckClass(days: number | null): string {
  if (days === null) return 'text-amber-600 font-medium' // chưa từng kiểm
  if (days > 30) return 'text-red-600 font-semibold'
  if (days > 7) return 'text-amber-600'
  return 'text-muted-foreground'
}

function priorityBadgeClass(tier: PriorityTier): string {
  switch (tier) {
    case 'urgent':
      return 'border-red-500 text-red-600 bg-red-50 dark:bg-red-950/30'
    case 'warning':
      return 'border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30'
    default:
      return ''
  }
}

function priorityRingClass(tier: PriorityTier): string {
  switch (tier) {
    case 'urgent':
      return 'border-l-4 border-l-red-500'
    case 'warning':
      return 'border-l-4 border-l-amber-500'
    default:
      return 'border-l-4 border-l-transparent'
  }
}

export function RoomGrid({ rooms, isLoading, selectedIds, onSelectionChange }: RoomGridProps) {
  const { t } = useTranslation(['rooms', 'distribution'])
  const navigate = useNavigate()
  const { user, role } = useUser()
  const checkSessions = useAllRoomCheckSessions(user?.tenant_id)
  const { data: pendingDistributions } = usePendingRoomDistributions()

  const [taskRoom, setTaskRoom] = useState<{ id: string; number: string; hotelId: string } | null>(null)
  const [taskType, setTaskType] = useState<ManualTaskType>('cleaning')

  const isOperational = isOperationalRole(role)
  const canViewRoomDetail = hasPermission(role, 'manage_rooms') || role !== 'staff'
  const canCreateTask = canCreateHousekeepingTask(user)

  // Sắp xếp theo priority + nhóm thành 3 section.
  const grouped = useMemo(() => {
    const items = rooms.map((room) => {
      const pendingCount = pendingDistributions?.get(room.id) || 0
      const priority = calcRoomPriority(room, pendingCount)
      return { room, pendingCount, priority }
    })
    items.sort((a, b) => b.priority.score - a.priority.score)
    return {
      urgent: items.filter((i) => i.priority.tier === 'urgent'),
      warning: items.filter((i) => i.priority.tier === 'warning'),
      normal: items.filter((i) => i.priority.tier === 'normal'),
    }
  }, [rooms, pendingDistributions])

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) onSelectionChange([...selectedIds, roomId])
    else onSelectionChange(selectedIds.filter((id) => id !== roomId))
  }

  const openTaskDialog = (room: RoomWithStats, type: ManualTaskType) => {
    setTaskType(type)
    setTaskRoom({ id: room.id, number: room.room_number, hotelId: room.hotel_id })
  }

  const getCheckTypeLabel = (type: string) => t(`checkTypes.${type}`, { defaultValue: type })

  if (isLoading) {
    return (
      <div className={`grid ${isOperational ? 'gap-3' : 'gap-4'} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
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
        <p className="mt-2 text-sm text-muted-foreground">{t('grid.tryChangeFilter')}</p>
      </div>
    )
  }

  const renderCard = (entry: (typeof grouped.urgent)[number]) => {
    const { room, pendingCount, priority } = entry
    const isSelected = selectedIds.includes(room.id)
    const session = checkSessions[room.id]
    const missing = getMissingDisplay(room)
    const roomTypeLabel = t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type })

    // Last check display
    const lastCheckText = room.last_check_at
      ? t('grid.lastCheckedRelative', {
          time: formatDistanceToNow(new Date(room.last_check_at), { locale: vi, addSuffix: false }),
        })
      : t('grid.neverChecked')

    return (
      <Card
        key={room.id}
        className={`transition-all hover:shadow-lg ${priorityRingClass(priority.tier)} ${
          isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
        } ${canViewRoomDetail && !isOperational ? 'cursor-pointer' : ''}`}
        onClick={() => canViewRoomDetail && !isOperational && navigate(`/rooms/${room.id}`)}
      >
        <CardHeader className={isOperational ? 'pb-2' : 'pb-3'}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectRoom(room.id, !!checked)}
                  className="mt-1"
                />
              </div>
              <div className="min-w-0 flex-1">
                {isOperational ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${statusDotClass(room.status)}`}
                      aria-hidden
                    />
                    <h3 className="text-3xl font-bold leading-none tracking-tight">
                      {room.room_number}
                    </h3>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${statusDotClass(room.status)}`}
                      aria-hidden
                    />
                    <h3 className="text-2xl font-bold leading-none">{room.room_number}</h3>
                    {priority.tier !== 'normal' && (
                      <Badge variant="outline" className={`text-[10px] h-5 ${priorityBadgeClass(priority.tier)}`}>
                        {priority.tier === 'urgent' ? t('grid.priorityUrgent') : t('grid.priorityWarning')}
                      </Badge>
                    )}
                  </div>
                )}
                <p className="mt-1 text-xs text-muted-foreground truncate">
                  {isOperational
                    ? `${roomTypeLabel} • ${room.max_guests} khách • ${room.bed_type || t('detail.na')}${
                        room.area_sqm ? ` • ${room.area_sqm}m²` : ''
                      }`
                    : roomTypeLabel}
                </p>
                {/* Lý do ưu tiên (chỉ cho non-operational, khi có) */}
                {!isOperational && priority.reason && priority.tier !== 'normal' && (
                  <p
                    className={`mt-1 text-xs font-medium ${
                      priority.tier === 'urgent' ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {priority.reason}
                  </p>
                )}
              </div>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <RoomStatusSelector roomId={room.id} currentStatus={room.status as RoomStatus} />
            </div>
          </div>
        </CardHeader>

        <CardContent className={isOperational ? 'space-y-2 pb-3' : 'space-y-3'}>
          {!isOperational && (
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
          )}

          <div className={`space-y-1 text-xs ${isOperational ? '' : 'border-t pt-2'}`}>
            {session ? (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Clock className="h-3 w-3 animate-pulse" />
                <span className="font-medium">
                  {t('checkSession.checking', {
                    name: session.user_name,
                    type: getCheckTypeLabel(session.check_type),
                  })}
                </span>
              </div>
            ) : missing.kind === 'complete' ? (
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-3 w-3" />
                <span>{t('grid.itemsComplete')}</span>
              </div>
            ) : missing.kind === 'after_clean' ? (
              <div className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                <span>{t('grid.missingAfterClean', { count: missing.count })}</span>
              </div>
            ) : missing.kind === 'restock' ? (
              <div className="flex items-center gap-1 text-amber-600">
                <PackageOpen className="h-3 w-3" />
                <span>{t('grid.needRestock', { count: missing.count })}</span>
              </div>
            ) : null}

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

            <div className={`flex items-center gap-1 ${lastCheckClass(priority.daysSinceCheck)}`}>
              <Clock className="h-3 w-3" />
              <span>{lastCheckText}</span>
            </div>
          </div>

          {!isOperational && room.base_price && (
            <div className="border-t pt-2">
              <p className="text-xs text-muted-foreground">{t('grid.basePrice')}</p>
              <p className="font-semibold">
                {formatCurrency(room.base_price)}
                {t('grid.perNight')}
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          {!isOperational && canViewRoomDetail && (
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

          {!isOperational && canCreateTask && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <ClipboardList className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background">
                  {MANUAL_TASK_TYPES.map((type) => (
                    <DropdownMenuItem key={type} onClick={() => openTaskDialog(room, type)}>
                      {TASK_TYPE_LABELS[type]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <Button
            size="sm"
            className="flex-1"
            disabled={!!session && session.user_id !== user?.id}
            onClick={(e) => {
              e.stopPropagation()
              const hasSession = !!session && session.user_id === user?.id
              navigate(`/rooms/${room.id}/check${hasSession ? '?resume=true' : ''}`)
            }}
          >
            {session
              ? session.user_id === user?.id
                ? t('checkSession.continueCheck')
                : t('checkSession.inProgress')
              : t('checkSession.check')}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  const gapClass = isOperational ? 'gap-3' : 'gap-4'

  const renderSection = (
    title: string,
    items: typeof grouped.urgent,
    headerClass: string,
  ) => {
    if (items.length === 0) return null
    return (
      <section className="space-y-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${headerClass}`}>{title}</h2>
        <div className={`grid ${gapClass} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}>
          {items.map(renderCard)}
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {renderSection(
        t('grid.sectionUrgent', { count: grouped.urgent.length }),
        grouped.urgent,
        'text-red-600',
      )}
      {renderSection(
        t('grid.sectionWarning', { count: grouped.warning.length }),
        grouped.warning,
        'text-amber-600',
      )}
      {renderSection(
        t('grid.sectionNormal', { count: grouped.normal.length }),
        grouped.normal,
        'text-muted-foreground',
      )}

      {taskRoom && (
        <CreateTaskDialog
          open={!!taskRoom}
          onOpenChange={(open) => !open && setTaskRoom(null)}
          roomId={taskRoom.id}
          roomNumber={taskRoom.number}
          hotelId={taskRoom.hotelId}
          defaultTaskType={taskType}
        />
      )}
    </div>
  )
}
