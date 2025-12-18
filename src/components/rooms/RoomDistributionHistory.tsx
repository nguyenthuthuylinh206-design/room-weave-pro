import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, differenceInHours } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Truck, CheckCircle, Clock, XCircle, Package, ChevronRight, AlertCircle, Undo2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useRoomDistributionHistory, useRejectRoomDelivery, useUndoRoomDelivery } from '@/hooks/useRoomDistributionHistory'
import { useCompleteRoomDelivery } from '@/hooks/useDistributionOrders'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/hooks/useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { triggerDistributionDeliveryRejected } from '@/hooks/useNotificationTriggers'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface RoomDistributionHistoryProps {
  roomId: string
  roomNumber?: string
}

const STATUS_CONFIG = {
  pending: { label: 'Chờ giao', icon: Clock, variant: 'secondary' as const, color: 'text-muted-foreground' },
  delivered: { label: 'Đang giao', icon: Truck, variant: 'default' as const, color: 'text-blue-600' },
  confirmed: { label: 'Đã xác nhận', icon: CheckCircle, variant: 'default' as const, color: 'text-green-600' },
  rejected: { label: 'Từ chối', icon: XCircle, variant: 'destructive' as const, color: 'text-destructive' }
}

export function RoomDistributionHistory({ roomId, roomNumber }: RoomDistributionHistoryProps) {
  const { t } = useTranslation(['distribution', 'common'])
  const { user } = useAuth()
  const { tenant } = useTenant()
  const { selectedHotel } = useHotelContext()
  const { data: history, isLoading } = useRoomDistributionHistory(roomId)
  
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedOrderRoomId, setSelectedOrderRoomId] = useState<string | null>(null)
  const [selectedOrderInfo, setSelectedOrderInfo] = useState<{
    orderId: string
    orderCode: string
    createdByUserId: string
    assignedToUserId: string | null
  } | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const completeDelivery = useCompleteRoomDelivery()
  const rejectDelivery = useRejectRoomDelivery()
  const undoDelivery = useUndoRoomDelivery()

  const handleConfirm = async (item: typeof history[0]) => {
    if (!user?.id) return
    
    // Find the distribution_order_room_id from the history
    const { data: roomOrder } = await import('@/integrations/supabase/client').then(m => 
      m.supabase
        .from('distribution_order_rooms')
        .select('id, distribution_order_id, distribution_orders(created_by)')
        .eq('distribution_order_id', item.order_id)
        .eq('room_id', roomId)
        .single()
    )

    if (!roomOrder) return

    completeDelivery.mutate({
      roomOrderId: roomOrder.id,
      orderCode: item.order_code,
      roomNumber: roomNumber,
      createdByUserId: (roomOrder.distribution_orders as any)?.created_by,
    })
  }

  const handleOpenRejectDialog = async (item: typeof history[0]) => {
    // Find the distribution_order_room_id
    const { data: roomOrder } = await import('@/integrations/supabase/client').then(m => 
      m.supabase
        .from('distribution_order_rooms')
        .select('id, distribution_order_id, distribution_orders(created_by, assigned_to)')
        .eq('distribution_order_id', item.order_id)
        .eq('room_id', roomId)
        .single()
    )

    if (!roomOrder) return

    setSelectedOrderRoomId(roomOrder.id)
    setSelectedOrderInfo({
      orderId: item.order_id,
      orderCode: item.order_code,
      createdByUserId: (roomOrder.distribution_orders as any)?.created_by,
      assignedToUserId: (roomOrder.distribution_orders as any)?.assigned_to,
    })
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!selectedOrderRoomId || !user?.id || !rejectionReason.trim()) return

    rejectDelivery.mutate({
      distributionOrderRoomId: selectedOrderRoomId,
      rejectedBy: user.id,
      rejectionReason: rejectionReason.trim(),
    }, {
      onSuccess: async () => {
        setRejectDialogOpen(false)
        
        // Send notification
        if (tenant?.id && selectedHotel?.id && selectedOrderInfo) {
          try {
            await triggerDistributionDeliveryRejected({
              tenantId: tenant.id,
              hotelId: selectedHotel.id,
              orderId: selectedOrderInfo.orderId,
              orderCode: selectedOrderInfo.orderCode,
              roomNumber: roomNumber || '',
              createdByUserId: selectedOrderInfo.createdByUserId,
              assignedToUserId: selectedOrderInfo.assignedToUserId,
              rejectedByUserId: user.id,
              rejectionReason: rejectionReason.trim(),
            })
          } catch (e) {
            console.error('Failed to send notification:', e)
          }
        }
      }
    })
  }

  const handleUndo = async (item: typeof history[0]) => {
    if (!user?.id) return

    // Find the distribution_order_room_id
    const { data: roomOrder } = await import('@/integrations/supabase/client').then(m => 
      m.supabase
        .from('distribution_order_rooms')
        .select('id')
        .eq('distribution_order_id', item.order_id)
        .eq('room_id', roomId)
        .single()
    )

    if (!roomOrder) return

    undoDelivery.mutate({
      distributionOrderRoomId: roomOrder.id,
      performedBy: user.id,
    })
  }

  const canUndo = (item: typeof history[0]) => {
    if (item.room_status !== 'confirmed' || !item.confirmed_at) return false
    const hoursSinceConfirm = differenceInHours(new Date(), new Date(item.confirmed_at))
    return hoursSinceConfirm <= 24
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Lịch sử giao hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Lịch sử giao hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có phiếu giao hàng nào</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Count pending deliveries for badge
  const pendingCount = history.filter(h => h.room_status === 'pending' || h.room_status === 'delivered').length

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Lịch sử giao hàng
            <Badge variant="secondary" className="ml-auto">{history.length}</Badge>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingCount} chờ xác nhận
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.map(item => {
            const config = STATUS_CONFIG[item.room_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
            const StatusIcon = config.icon
            const showActions = item.room_status === 'pending' || item.room_status === 'delivered'
            const showUndo = canUndo(item)

            return (
              <div 
                key={item.order_id} 
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  showActions && "border-primary/50 bg-primary/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5", config.color)}>
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link 
                        to={`/inventory/distribution/${item.order_id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {item.order_code}
                      </Link>
                      <Badge variant={config.variant} className="text-xs">
                        {config.label}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {item.total_items} loại • {item.total_quantity} sản phẩm
                      </p>
                      
                      {item.confirmed_at ? (
                        <p>
                          Xác nhận bởi <span className="font-medium">{item.confirmed_by_name}</span> • {' '}
                          {format(new Date(item.confirmed_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        </p>
                      ) : (
                        <p>
                          Tạo lúc {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                          {item.assigned_to_name && ` • Giao cho ${item.assigned_to_name}`}
                        </p>
                      )}

                      {item.rejection_reason && (
                        <p className="flex items-center gap-1 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Lý do: {item.rejection_reason}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    {showActions && (
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          onClick={() => handleConfirm(item)}
                          disabled={completeDelivery.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Xác nhận nhận hàng
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenRejectDialog(item)}
                          disabled={rejectDelivery.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Từ chối
                        </Button>
                      </div>
                    )}

                    {/* Undo button for recently confirmed */}
                    {showUndo && (
                      <div className="mt-3">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleUndo(item)}
                          disabled={undoDelivery.isPending}
                        >
                          <Undo2 className="h-4 w-4 mr-1" />
                          Hoàn tác (còn {24 - differenceInHours(new Date(), new Date(item.confirmed_at!))}h)
                        </Button>
                      </div>
                    )}
                  </div>

                  <Link to={`/inventory/distribution/${item.order_id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối nhận hàng</DialogTitle>
            <DialogDescription>
              Vui lòng nhập lý do từ chối nhận hàng. Hàng sẽ được trả về kho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Lý do từ chối *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Ví dụ: Sản phẩm không đúng yêu cầu, số lượng không khớp..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Hủy
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectDelivery.isPending}
            >
              {rejectDelivery.isPending ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
