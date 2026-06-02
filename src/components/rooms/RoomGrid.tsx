import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Bed,
  CheckCircle,
  AlertTriangle,
  Wind,
  Clock,
  Truck,
  ClipboardList,
  PackageOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { calcRoomPriority, getMissingDisplay, type PriorityTier } from '@/lib/roomPriority'
import { useRoomViewDensity } from '@/hooks/useRoomViewDensity'
import { useHotelContext } from '@/contexts/HotelContext'
import type { RoomWithStats, RoomStatus } from '@/types/rooms.types'
import { TASK_TYPE_LABELS } from '@/types/housekeeping.types'

type ManualTaskType = 'checkout_inspection' | 'cleaning' | 'checkin_prep' | 'amenity_request' | 'other'
const MANUAL_TASK_TYPES: ManualTaskType[] = ['checkout_inspection', 'cleaning', 'checkin_prep', 'amenity_request']

interface RoomGridProps {
  rooms: RoomWithStats[]
  isLoading: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

/** Vai trò chỉ thấy thông tin vận hành, không thấy giá phòng. */
function hidesPrice(role: string | null | undefined) {
  return role === 'staff' || role === 'department_manager'
}

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

function lastCheckClass(days: number | null): string {
  if (days === null) return 'text-amber-600'
  if (days > 30) return 'text-red-600 font-medium'
  if (days > 7) return 'text-amber-600'
  return 'text-muted-foreground'
}

function priorityRingClass(tier: PriorityTier): string {
  switch (tier) {
    case 'urgent':
      return 'border-l-[3px] border-l-red-500'
    case 'warning':
      return 'border-l-[3px] border-l-amber-500'
    default:
      return 'border-l-[3px] border-l-transparent'
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

  const canViewRoomDetail = hasPermission(role, 'manage_rooms') || role !== 'staff'
  const canCreateTask = canCreateHousekeepingTask(user)
  const showPrice = !hidesPrice(role)

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
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
    const statusLabel = t(`status.${room.status}`, { defaultValue: room.status })

    const hasPriorityReason = !!priority.reason && priority.tier !== 'normal'
    const showLastCheck = !hasPriorityReason && (priority.daysSinceCheck === null || priority.daysSinceCheck > 7)

    const lastCheckText = room.last_check_at
      ? t('grid.lastCheckedRelative', {
          time: formatDistanceToNow(new Date(room.last_check_at), { locale: vi, addSuffix: false }),
        })
      : t('grid.neverChecked')

    // Meta row: type • guests • bed • area
    const metaParts = [
      roomTypeLabel,
      `${room.max_guests} khách`,
      room.bed_type || null,
      room.area_sqm ? `${room.area_sqm}m²` : null,
    ].filter(Boolean)

    return (
      <div
        key={room.id}
        className={cn(
          'group rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-foreground/20',
          priorityRingClass(priority.tier),
          isSelected && 'ring-2 ring-primary bg-primary/5',
          canViewRoomDetail && 'cursor-pointer',
        )}
        onClick={() => canViewRoomDetail && navigate(`/rooms/${room.id}`)}
      >
        <div className="p-3 space-y-2">
          {/* Line 1: checkbox + dot + room # + status selector */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectRoom(room.id, !!checked)}
                />
              </div>
              <span className={cn('inline-block h-2 w-2 rounded-full shrink-0', statusDotClass(room.status))} aria-hidden />
              <h3 className="text-2xl font-bold leading-none tracking-tight truncate">{room.room_number}</h3>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="shrink-0">
              <RoomStatusSelector roomId={room.id} currentStatus={room.status as RoomStatus} />
            </div>
          </div>

          {/* Line 2: priority reason (if any) — đặt lên trên cùng để Manager scan nhanh */}
          {hasPriorityReason && (
            <p
              className={cn(
                'text-xs font-medium',
                priority.tier === 'urgent' ? 'text-red-600' : 'text-amber-600',
              )}
            >
              {priority.reason}
            </p>
          )}

          {/* Line 3: actionable info — session / missing / laundry / pending / last check */}
          <div className="space-y-1 text-xs">
            {session ? (
              <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <Clock className="h-3 w-3 animate-pulse" />
                <span className="font-medium truncate">
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

            {showLastCheck && (
              <div className={cn('flex items-center gap-1', lastCheckClass(priority.daysSinceCheck))}>
                <Clock className="h-3 w-3" />
                <span>{lastCheckText}</span>
              </div>
            )}
          </div>

          {/* Line 4: meta row (gộp loại/khách/giường/m² + giá nếu được phép) */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t text-[11px] text-muted-foreground">
            <span className="truncate" title={metaParts.join(' • ')}>
              {metaParts.join(' • ')}
            </span>
            {showPrice && room.base_price ? (
              <span className="font-medium text-foreground shrink-0">
                {formatCurrency(room.base_price)}
              </span>
            ) : null}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-3 pb-3" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            className="flex-1 h-8"
            disabled={!!session && session.user_id !== user?.id}
            onClick={() => {
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

          {canCreateTask && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" title={t('actions.createTask', { defaultValue: 'Giao việc' })}>
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
          )}
        </div>
      </div>
    )
  }

  const renderSection = (
    title: string,
    items: typeof grouped.urgent,
    headerClass: string,
  ) => {
    if (items.length === 0) return null
    return (
      <section className="space-y-3">
        <h2 className={cn('text-xs font-semibold uppercase tracking-wider', headerClass)}>{title}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {items.map(renderCard)}
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      {renderSection(t('grid.sectionUrgent', { count: grouped.urgent.length }), grouped.urgent, 'text-red-600')}
      {renderSection(t('grid.sectionWarning', { count: grouped.warning.length }), grouped.warning, 'text-amber-600')}
      {renderSection(t('grid.sectionNormal', { count: grouped.normal.length }), grouped.normal, 'text-muted-foreground')}

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
