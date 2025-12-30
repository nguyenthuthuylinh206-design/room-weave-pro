import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  DoorOpen,
  Package,
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowRightLeft,
  Undo2,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StopCardProps {
  stop: RouteStop
  canDeliver?: boolean
  canMarkCannotAccess?: boolean
  canRetry?: boolean
  canReturnToStock?: boolean
  canHandover?: boolean
  onAction?: () => void
}

export function StopCard({
  stop,
  canDeliver = false,
  canMarkCannotAccess = false,
  canRetry = false,
  canReturnToStock = false,
  canHandover = false,
  onAction,
}: StopCardProps) {
  const { t } = useTranslation('distribution')
  const [showCannotAccessDialog, setShowCannotAccessDialog] = useState(false)
  const [showHandoverDialog, setShowHandoverDialog] = useState(false)
  const [exceptionType, setExceptionType] = useState<ExceptionType>('guest_inside')
  const [exceptionReason, setExceptionReason] = useState('')
  const [nextShift, setNextShift] = useState<ShiftCode>('afternoon')

  const deliverStop = useDeliverStop()
  const markCannotAccess = useMarkCannotAccess()
  const retryStop = useRetryStop()
  const returnToStock = useReturnToStock()
  const handoverStop = useHandoverStop()

  const handleDeliver = () => {
    deliverStop.mutate(
      { roomOrderId: stop.id },
      { onSuccess: () => onAction?.() }
    )
  }

  const handleMarkCannotAccess = () => {
    markCannotAccess.mutate(
      {
        roomOrderId: stop.id,
        exceptionType,
        exceptionReason: exceptionReason || undefined,
      },
      {
        onSuccess: () => {
          setShowCannotAccessDialog(false)
          setExceptionReason('')
          onAction?.()
        },
      }
    )
  }

  const handleRetry = () => {
    retryStop.mutate(
      { roomOrderId: stop.id },
      { onSuccess: () => onAction?.() }
    )
  }

  const handleReturnToStock = () => {
    returnToStock.mutate(
      { roomOrderId: stop.id },
      { onSuccess: () => onAction?.() }
    )
  }

  const handleHandover = () => {
    handoverStop.mutate(
      {
        roomOrderId: stop.id,
        nextShiftCode: nextShift,
      },
      {
        onSuccess: () => {
          setShowHandoverDialog(false)
          onAction?.()
        },
      }
    )
  }

  const totalItems = stop.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <Card
        className={cn(
          'transition-colors',
          stop.stop_status === 'delivered' && 'bg-green-50/50 dark:bg-green-900/10',
          stop.stop_status === 'cannot_access' && 'bg-red-50/50 dark:bg-red-900/10',
          stop.stop_status === 'resolved' && 'bg-purple-50/50 dark:bg-purple-900/10'
        )}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-3">
            {/* Room info */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                <DoorOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{stop.room_number}</span>
                  <StopStatusBadge status={stop.stop_status} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    {stop.items.length} sản phẩm
                  </span>
                  <span>•</span>
                  <span>{totalItems} đơn vị</span>
                </div>
                {stop.exception_type && (
                  <p className="text-xs text-destructive mt-1">
                    {EXCEPTION_TYPE_LABELS[stop.exception_type]}
                    {stop.exception_reason && `: ${stop.exception_reason}`}
                  </p>
                )}
                {stop.returned_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ✓ Đã trả kho lúc {new Date(stop.returned_at).toLocaleTimeString('vi-VN')}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {canDeliver && (
                <Button
                  size="sm"
                  onClick={handleDeliver}
                  disabled={deliverStop.isPending}
                  className="gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Giao
                </Button>
              )}
              {canMarkCannotAccess && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowCannotAccessDialog(true)}
                  className="gap-1.5 text-destructive hover:text-destructive"
                >
                  <XCircle className="h-4 w-4" />
                  Không vào được
                </Button>
              )}
              {canRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRetry}
                  disabled={retryStop.isPending}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  Thử lại
                </Button>
              )}
              {canReturnToStock && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReturnToStock}
                  disabled={returnToStock.isPending}
                  className="gap-1.5"
                >
                  <Undo2 className="h-4 w-4" />
                  Trả kho
                </Button>
              )}
              {canHandover && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowHandoverDialog(true)}
                  className="gap-1.5"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Bàn giao
                </Button>
              )}
            </div>
          </div>

          {/* Item list (collapsed by default, expand on click) */}
          {stop.items.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Xem chi tiết sản phẩm
              </summary>
              <div className="mt-2 space-y-1 pl-2 border-l-2 border-muted">
                {stop.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.item_name}</span>
                    <Badge variant="outline" className="text-xs">
                      x{item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>

      {/* Cannot Access Dialog */}
      <Dialog open={showCannotAccessDialog} onOpenChange={setShowCannotAccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Không vào được phòng {stop.room_number}</DialogTitle>
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
            <DialogTitle>Bàn giao phòng {stop.room_number}</DialogTitle>
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

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Lưu ý:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Hàng đã được trả về kho</li>
                <li>Route mới sẽ được tạo với cùng danh sách sản phẩm</li>
                <li>Route mới sẽ gán cho giám sát ca sau</li>
              </ul>
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
    </>
  )
}
