import { useState } from 'react'
import { CheckCircle, ChevronDown, AlertTriangle, RotateCcw, Undo2, ArrowRightLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="space-y-2">

      {/* Room list - compact, flat */}
      <div className="border rounded-lg divide-y">
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
  
  // Build inline items text
  const itemsText = stop.items.map(i => `${i.item_name} x${i.quantity}`).join(', ')

  return (
    <div
      className={cn(
        'p-3 border-b last:border-b-0 border-l-4 transition-colors',
        isCompleted && 'border-l-green-500 bg-muted/30',
        isCannotAccess && 'border-l-red-500 bg-muted/30',
        !isCompleted && !isCannotAccess && 'border-l-transparent'
      )}
    >
      {/* Compact header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base font-bold shrink-0">P.{stop.room_number}</span>
          {isCompleted && (
            <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
          )}
          {isCannotAccess && (
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          )}
        </div>
        
        {/* Primary deliver button - inline for pending */}
        {canDeliver && (
          <Button
            onClick={onDeliver}
            disabled={isDelivering}
            size={isMobile ? 'default' : 'sm'}
            className={cn(
              'shrink-0 gap-1.5',
              isMobile && 'h-10 px-4 text-sm font-semibold'
            )}
          >
            <CheckCircle className="h-4 w-4" />
            {isDelivering ? '...' : 'GIAO'}
          </Button>
        )}
        
        {/* Status text for completed */}
        {isCompleted && (
          <span className="text-xs text-green-600 font-medium shrink-0">Đã giao</span>
        )}
      </div>

      {/* Items - inline chips */}
      {stop.items.length > 0 && (
        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">{itemsText}</p>
      )}

      {/* Exception info */}
      {stop.exception_type && (
        <div className="mt-1.5 text-xs text-destructive">
          {EXCEPTION_TYPE_LABELS[stop.exception_type]}
          {stop.exception_reason && `: ${stop.exception_reason}`}
        </div>
      )}

      {/* Secondary actions row */}
      {canDeliver && (
        <div className="mt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1">
                Không vào được
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem onClick={onCannotAccess}>
                Báo cáo không vào được
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Actions for cannot_access stops */}
      {isCannotAccess && (
        <div className="mt-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isRetrying}
            className="h-8 flex-1 gap-1 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Thử lại
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReturnToStock}
            disabled={isReturning}
            className="h-8 flex-1 gap-1 text-xs"
          >
            <Undo2 className="h-3.5 w-3.5" />
            Trả kho
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onHandover}
            className="h-8 flex-1 gap-1 text-xs"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Bàn giao
          </Button>
        </div>
      )}
    </div>
  )
}
