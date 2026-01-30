import { useState } from 'react'
import { CheckCircle, Package, DoorOpen, ChevronDown, AlertTriangle, RotateCcw, Undo2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StopStatusBadge } from './StopStatusBadge'
import {
  useDeliverStop,
  useMarkCannotAccess,
  useRetryStop,
  useReturnToStock,
  useHandoverStop,
} from '@/hooks/useRouteBatch'
import type { RouteStop, ExceptionType, ShiftCode } from '@/types/route-batch.types'
import { EXCEPTION_TYPE_LABELS, SHIFT_LABELS } from '@/types/route-batch.types'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

interface StaffDeliveryViewProps {
  stops: RouteStop[]
  orderCode?: string
  tenantId?: string
  hotelId?: string
  orderStatus?: string
  onRefresh?: () => void
}

export function StaffDeliveryView({
  stops,
  orderCode,
  tenantId,
  hotelId,
  orderStatus,
  onRefresh,
}: StaffDeliveryViewProps) {
  const isMobile = useIsMobile()
  const [showCannotAccessDialog, setShowCannotAccessDialog] = useState(false)
  const [showHandoverDialog, setShowHandoverDialog] = useState(false)
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null)
  const [exceptionType, setExceptionType] = useState<ExceptionType>('guest_inside')
  const [exceptionReason, setExceptionReason] = useState('')
  const [nextShift, setNextShift] = useState<ShiftCode>('afternoon')

  const deliverStop = useDeliverStop()
  const markCannotAccess = useMarkCannotAccess()
  const retryStop = useRetryStop()
  const returnToStock = useReturnToStock()
  const handoverStop = useHandoverStop()

  // Calculate progress
  const totalStops = stops.length
  const deliveredStops = stops.filter(s => s.stop_status === 'delivered').length
  const resolvedStops = stops.filter(s => s.stop_status === 'resolved').length
  const completedStops = deliveredStops + resolvedStops
  const cannotAccessStops = stops.filter(s => s.stop_status === 'cannot_access').length
  const pendingStops = stops.filter(s => s.stop_status === 'pending')
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  // Sort: pending first, then cannot_access, then completed
  const sortedStops = [...stops].sort((a, b) => {
    const order = { pending: 0, cannot_access: 1, delivered: 2, resolved: 3 }
    return (order[a.stop_status] ?? 99) - (order[b.stop_status] ?? 99)
  })

  const handleDeliver = (stop: RouteStop) => {
    deliverStop.mutate(
      {
        roomOrderId: stop.id,
        roomInfo: {
          room_id: stop.room_id,
          room_number: stop.room_number,
          hotel_id: hotelId,
          tenant_id: tenantId,
          order_code: orderCode,
          room_order_id: stop.id,
          items: stop.items.map(i => ({
            item_name: i.item_name,
            quantity: i.quantity
          }))
        }
      },
      { onSuccess: () => onRefresh?.() }
    )
  }

  const openCannotAccessDialog = (stop: RouteStop) => {
    setSelectedStop(stop)
    setExceptionType('guest_inside')
    setExceptionReason('')
    setShowCannotAccessDialog(true)
  }

  const handleMarkCannotAccess = () => {
    if (!selectedStop) return
    markCannotAccess.mutate(
      {
        roomOrderId: selectedStop.id,
        exceptionType,
        exceptionReason: exceptionReason || undefined,
      },
      {
        onSuccess: () => {
          setShowCannotAccessDialog(false)
          setSelectedStop(null)
          onRefresh?.()
        },
      }
    )
  }

  const handleRetry = (stop: RouteStop) => {
    retryStop.mutate(
      { roomOrderId: stop.id },
      { onSuccess: () => onRefresh?.() }
    )
  }

  const handleReturnToStock = (stop: RouteStop) => {
    returnToStock.mutate(
      { roomOrderId: stop.id },
      { onSuccess: () => onRefresh?.() }
    )
  }

  const openHandoverDialog = (stop: RouteStop) => {
    setSelectedStop(stop)
    setNextShift('afternoon')
    setShowHandoverDialog(true)
  }

  const handleHandover = () => {
    if (!selectedStop) return
    handoverStop.mutate(
      {
        roomOrderId: selectedStop.id,
        nextShiftCode: nextShift,
      },
      {
        onSuccess: () => {
          setShowHandoverDialog(false)
          setSelectedStop(null)
          onRefresh?.()
        },
      }
    )
  }

  const canDeliver = orderStatus === 'in_progress'

  return (
    <div className="space-y-4">
      {/* Progress summary - sticky on mobile */}
      <div className={cn(
        'p-4 border rounded-lg bg-card',
        isMobile && 'sticky top-0 z-10'
      )}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Tiến độ giao hàng</span>
          <span className="text-sm">
            <span className="font-bold text-lg">{completedStops}</span>
            <span className="text-muted-foreground">/{totalStops} phòng</span>
          </span>
        </div>
        <Progress value={progressPercent} className="h-2.5" />
        <div className="flex gap-4 mt-2 text-xs">
          {deliveredStops > 0 && (
            <span className="text-green-600">{deliveredStops} đã giao</span>
          )}
          {cannotAccessStops > 0 && (
            <span className="text-red-600">{cannotAccessStops} không vào được</span>
          )}
          {pendingStops.length > 0 && (
            <span className="text-muted-foreground">{pendingStops.length} chờ giao</span>
          )}
        </div>
      </div>

      {/* Room list - flat, simple */}
      <div className="space-y-3">
        {sortedStops.map((stop) => (
          <StaffRoomCard
            key={stop.id}
            stop={stop}
            canDeliver={canDeliver && stop.stop_status === 'pending'}
            onDeliver={() => handleDeliver(stop)}
            onCannotAccess={() => openCannotAccessDialog(stop)}
            onRetry={() => handleRetry(stop)}
            onReturnToStock={() => handleReturnToStock(stop)}
            onHandover={() => openHandoverDialog(stop)}
            isDelivering={deliverStop.isPending}
            isRetrying={retryStop.isPending}
            isReturning={returnToStock.isPending}
            isMobile={isMobile}
          />
        ))}
      </div>

      {/* Cannot Access Dialog */}
      <Dialog open={showCannotAccessDialog} onOpenChange={setShowCannotAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Không vào được phòng {selectedStop?.room_number}</DialogTitle>
            <DialogDescription>
              Chọn lý do không thể giao hàng đến phòng này
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Lý do</Label>
              <Select
                value={exceptionType}
                onValueChange={(v) => setExceptionType(v as ExceptionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXCEPTION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ghi chú (tùy chọn)</Label>
              <Textarea
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                placeholder="Thêm ghi chú chi tiết..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCannotAccessDialog(false)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleMarkCannotAccess}
              disabled={markCannotAccess.isPending}
            >
              {markCannotAccess.isPending ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover Dialog */}
      <Dialog open={showHandoverDialog} onOpenChange={setShowHandoverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bàn giao phòng {selectedStop?.room_number}</DialogTitle>
            <DialogDescription>
              Tạo route mới cho ca sau với phòng này
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ca tiếp theo</Label>
              <Select
                value={nextShift}
                onValueChange={(v) => setNextShift(v as ShiftCode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SHIFT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHandoverDialog(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleHandover}
              disabled={handoverStop.isPending}
            >
              {handoverStop.isPending ? 'Đang xử lý...' : 'Bàn giao'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface StaffRoomCardProps {
  stop: RouteStop
  canDeliver: boolean
  onDeliver: () => void
  onCannotAccess: () => void
  onRetry: () => void
  onReturnToStock: () => void
  onHandover: () => void
  isDelivering: boolean
  isRetrying: boolean
  isReturning: boolean
  isMobile: boolean
}

function StaffRoomCard({
  stop,
  canDeliver,
  onDeliver,
  onCannotAccess,
  onRetry,
  onReturnToStock,
  onHandover,
  isDelivering,
  isRetrying,
  isReturning,
  isMobile,
}: StaffRoomCardProps) {
  const isCompleted = stop.stop_status === 'delivered' || stop.stop_status === 'resolved'
  const isCannotAccess = stop.stop_status === 'cannot_access'
  const totalItems = stop.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-colors',
        isCompleted && 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800',
        isCannotAccess && 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800',
        !isCompleted && !isCannotAccess && 'bg-card'
      )}
    >
      {/* Room header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg',
            isCompleted && 'bg-green-100 dark:bg-green-900/30 text-green-600',
            isCannotAccess && 'bg-red-100 dark:bg-red-900/30 text-red-600',
            !isCompleted && !isCannotAccess && 'bg-primary/10 text-primary'
          )}>
            <DoorOpen className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">P.{stop.room_number}</span>
              <StopStatusBadge status={stop.stop_status} />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              {stop.items.length} sản phẩm • {totalItems} đơn vị
            </div>
          </div>
        </div>

        {/* Status indicator for completed */}
        {isCompleted && (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Đã giao</span>
          </div>
        )}
      </div>

      {/* Item list - always visible in staff view */}
      {stop.items.length > 0 && (
        <div className="mt-3 pl-2 border-l-2 border-muted space-y-1">
          {stop.items.map(item => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{item.item_name}</span>
              <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Exception info */}
      {stop.exception_type && (
        <div className="mt-3 flex items-start gap-2 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {EXCEPTION_TYPE_LABELS[stop.exception_type]}
            {stop.exception_reason && `: ${stop.exception_reason}`}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 space-y-2">
        {/* Primary action: Deliver */}
        {canDeliver && (
          <Button
            onClick={onDeliver}
            disabled={isDelivering}
            className={cn(
              'gap-2',
              isMobile ? 'w-full h-12 text-base font-semibold' : 'w-full h-10'
            )}
          >
            <CheckCircle className="h-5 w-5" />
            {isDelivering ? 'Đang xử lý...' : 'XÁC NHẬN GIAO'}
          </Button>
        )}

        {/* Secondary action: Cannot access (dropdown on mobile) */}
        {canDeliver && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                Không vào được...
                <ChevronDown className="h-4 w-4 ml-auto" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56">
              <DropdownMenuItem onClick={onCannotAccess}>
                Báo cáo không vào được
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Actions for cannot_access stops */}
        {isCannotAccess && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="flex-1 gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              Thử lại
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onReturnToStock}
              disabled={isReturning}
              className="flex-1 gap-1"
            >
              <Undo2 className="h-4 w-4" />
              Trả kho
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={onHandover}
              className="flex-1 gap-1"
            >
              <ArrowRightLeft className="h-4 w-4" />
              Bàn giao
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
