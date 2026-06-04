import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatDistanceToNow } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  CheckCircle,
  AlertTriangle,
  Wind,
  Truck,
  PackageOpen,
  Clock,
  LogOut,
  ClipboardList,
  ExternalLink,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { RoomStatusSelector } from './RoomStatusSelector'
import { cn } from '@/lib/utils'
import { getMissingDisplay, type PriorityTier } from '@/lib/roomPriority'
import {
  minutesUntilCheckout,
  formatCheckoutTime,
  type ActiveBooking,
} from '@/hooks/useActiveRoomBookings'
import type { RoomWithStats, RoomStatus } from '@/types/rooms.types'

export interface QuickViewEntry {
  room: RoomWithStats
  pendingCount: number
  priority: {
    tier: PriorityTier
    reason?: string | null
    daysSinceCheck: number | null
  }
  booking: ActiveBooking | null
  minutesToCheckout: number | null
  session?: { user_id: string; user_name: string; check_type: string } | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: QuickViewEntry | null
  canViewRoomDetail: boolean
  canCreateTask: boolean
  currentUserId?: string
  onOpenCreateTask?: (room: RoomWithStats) => void
}

function statusColorClass(status: string): string {
  switch (status) {
    case 'vacant_clean':
    case 'vacant_inspected':
    case 'vacant':
      return 'text-green-600'
    case 'occupied_clean':
    case 'occupied_dirty':
    case 'occupied':
      return 'text-blue-600'
    case 'vacant_dirty':
    case 'cleaning':
    case 'check_out':
      return 'text-amber-600'
    case 'dnd':
    case 'service_refused':
    case 'sleep_out':
    case 'skipper':
      return 'text-purple-600'
    case 'out_of_order':
    case 'out_of_service':
    case 'maintenance':
      return 'text-red-600'
    case 'check_in':
      return 'text-cyan-600'
    default:
      return 'text-muted-foreground'
  }
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

export function RoomQuickViewDialog({
  open,
  onOpenChange,
  entry,
  canViewRoomDetail,
  canCreateTask,
  currentUserId,
  onOpenCreateTask,
}: Props) {
  const { t } = useTranslation(['rooms', 'distribution'])
  const navigate = useNavigate()

  if (!entry) return null
  const { room, pendingCount, priority, booking, minutesToCheckout, session } = entry
  const missing = getMissingDisplay(room)
  const statusLabel = t(`status.${room.status}`, { defaultValue: room.status })
  const roomTypeLabel = t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type })

  const metaParts = [
    roomTypeLabel,
    `${room.max_guests} khách`,
    room.bed_type || null,
    room.area_sqm ? `${room.area_sqm}m²` : null,
  ].filter(Boolean)

  const lastCheckText = room.last_check_at
    ? t('grid.lastCheckedRelative', {
        time: formatDistanceToNow(new Date(room.last_check_at), { locale: vi, addSuffix: false }),
      })
    : t('grid.neverChecked')

  const lastCheckColor =
    priority.daysSinceCheck === null
      ? 'text-amber-600'
      : priority.daysSinceCheck > 30
        ? 'text-red-600'
        : priority.daysSinceCheck > 7
          ? 'text-amber-600'
          : 'text-muted-foreground'

  const goCheck = () => {
    const mine = !!session && session.user_id === currentUserId
    navigate(`/rooms/${room.id}/check${mine ? '?resume=true' : ''}`)
    onOpenChange(false)
  }
  const goDetail = () => {
    navigate(`/rooms/${room.id}`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-full', statusDotClass(room.status))} />
            <span className="text-xl font-bold leading-none">{room.room_number}</span>
            <span className={cn('text-sm font-medium ml-1', statusColorClass(room.status))}>
              {statusLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-4 py-3 space-y-3 text-sm">
          {/* Đổi trạng thái nhanh */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Đổi trạng thái</span>
            <RoomStatusSelector roomId={room.id} currentStatus={room.status as RoomStatus} />
          </div>

          {/* Cần xử lý */}
          {priority.reason && priority.tier !== 'normal' && (
            <div
              className={cn(
                'rounded-md border px-3 py-2 text-sm font-medium',
                priority.tier === 'urgent'
                  ? 'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/30 dark:border-red-900'
                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:border-amber-900',
              )}
            >
              {priority.reason}
            </div>
          )}

          {/* Đang kiểm */}
          {session && (
            <div className="flex items-center gap-2 text-orange-600">
              <Clock className="h-4 w-4 animate-pulse shrink-0" />
              <span className="font-medium">
                {t('checkSession.checking', {
                  name: session.user_name,
                  type: t(`checkTypes.${session.check_type}`, { defaultValue: session.check_type }),
                })}
              </span>
            </div>
          )}

          {/* Booking */}
          {booking && (
            <div className="rounded-md border px-3 py-2 space-y-0.5">
              <div className="flex items-center gap-2">
                <LogOut className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">
                  {t('grid.checkoutAt', { time: formatCheckoutTime(booking.expected_check_out_time) })}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="truncate">{booking.guest_name}</span>
              </div>
              {minutesToCheckout !== null && (
                <div
                  className={cn(
                    'text-xs pl-6',
                    minutesToCheckout < 0
                      ? 'text-red-600 font-medium'
                      : minutesToCheckout <= 120
                        ? 'text-orange-600'
                        : 'text-muted-foreground',
                  )}
                >
                  {minutesToCheckout < 0
                    ? t('grid.checkoutOverdue', { minutes: Math.abs(minutesToCheckout) })
                    : minutesToCheckout <= 120
                      ? t('grid.checkoutSoon')
                      : `Còn ${Math.round(minutesToCheckout / 60)}h`}
                </div>
              )}
            </div>
          )}

          {/* Vật tư */}
          <div className="space-y-1.5">
            {missing.kind === 'complete' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{t('grid.itemsComplete')}</span>
              </div>
            )}
            {missing.kind === 'after_clean' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t('grid.missingAfterClean', { count: missing.count })}</span>
              </div>
            )}
            {missing.kind === 'restock' && (
              <div className="flex items-center gap-2 text-amber-600">
                <PackageOpen className="h-4 w-4 shrink-0" />
                <span>{t('grid.needRestock', { count: missing.count })}</span>
              </div>
            )}
            {room.items_in_laundry > 0 && (
              <div className="flex items-center gap-2 text-cyan-600">
                <Wind className="h-4 w-4 shrink-0" />
                <span>{t('grid.itemsInLaundry', { count: room.items_in_laundry })}</span>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <Truck className="h-4 w-4 shrink-0" />
                <span>{t('distribution:roomHistory.pendingDeliveries', { count: pendingCount })}</span>
              </div>
            )}
            <div className={cn('flex items-center gap-2', lastCheckColor)}>
              <Clock className="h-4 w-4 shrink-0" />
              <span>{lastCheckText}</span>
            </div>
          </div>

          {/* Meta */}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {metaParts.join(' • ')}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-1 space-y-2">
          <Button
            className="w-full h-10"
            disabled={!!session && session.user_id !== currentUserId}
            onClick={goCheck}
          >
            {session
              ? session.user_id === currentUserId
                ? t('checkSession.continueCheck')
                : t('checkSession.inProgress')
              : 'Kiểm tra phòng'}
          </Button>
          <div className="flex gap-2">
            {canViewRoomDetail && (
              <Button variant="outline" className="flex-1 h-9" onClick={goDetail}>
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Xem chi tiết phòng
              </Button>
            )}
            {canCreateTask && onOpenCreateTask && (
              <Button
                variant="outline"
                className="h-9"
                onClick={() => {
                  onOpenCreateTask(room)
                  onOpenChange(false)
                }}
                title="Giao việc"
              >
                <ClipboardList className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
