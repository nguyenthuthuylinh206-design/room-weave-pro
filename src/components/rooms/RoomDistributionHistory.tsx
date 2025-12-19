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
            {t('distribution:roomHistory.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('distribution:roomHistory.empty')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Separate pending vs processed orders
  const pendingOrders = history.filter(h => h.room_status === 'pending' || h.room_status === 'delivered')
  const processedOrders = history.filter(h => h.room_status !== 'pending' && h.room_status !== 'delivered')
  const pendingCount = pendingOrders.length

  const renderOrderItem = (item: typeof history[0]) => {
    const config = STATUS_CONFIG[item.room_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
    const StatusIcon = config.icon
    const showActions = item.room_status === 'pending' || item.room_status === 'delivered'
    const showUndoBtn = canUndo(item)

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
                to={`/inventory/distributions/${item.order_id}`}
                className="font-medium text-sm hover:underline"
              >
                {item.order_code}
              </Link>
              <Badge variant={config.variant} className="text-xs">
                {t(`distribution:roomHistory.status.${item.room_status}`, { defaultValue: config.label })}
              </Badge>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {t('distribution:roomHistory.itemsSummary', { types: item.total_items, total: item.total_quantity })}
              </p>
              
              {item.confirmed_at ? (
                <p>
                  {t('distribution:roomHistory.confirmedBy', { name: item.confirmed_by_name })} • {' '}
                  {format(new Date(item.confirmed_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                </p>
              ) : (
                <p>
                  {t('distribution:roomHistory.createdAt', { date: format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi }) })}
                  {item.assigned_to_name && ` • ${t('distribution:roomHistory.assignedTo', { name: item.assigned_to_name })}`}
                </p>
              )}

              {item.rejection_reason && (
                <p className="flex items-center gap-1 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {t('distribution:roomHistory.rejectionReason', { reason: item.rejection_reason })}
                </p>
              )}
            </div>

            {/* Items list for pending orders */}
            {item.items && item.items.length > 0 && showActions && (
              <div className="mt-3 bg-accent/50 dark:bg-accent/30 rounded-lg border border-border/50 p-3">
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5 text-foreground">
                  <Package className="h-3.5 w-3.5" />
                  {t('distribution:roomHistory.itemsToDeliver')}
                </p>
                <ul className="text-xs space-y-1.5">
                  {item.items.map((i) => (
                    <li key={i.item_id} className="flex justify-between items-center py-1 px-2 bg-background rounded">
                      <span className="text-muted-foreground">{i.item_name}</span>
                      <Badge variant="secondary" className="text-xs font-medium">
                        x{i.quantity}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action buttons */}
            {showActions && (
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  onClick={() => handleConfirm(item)}
                  disabled={completeDelivery.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  {t('distribution:roomHistory.confirmButton')}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleOpenRejectDialog(item)}
                  disabled={rejectDelivery.isPending}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  {t('distribution:roomHistory.rejectButton')}
                </Button>
              </div>
            )}

            {/* Undo button for recently confirmed */}
            {showUndoBtn && (
              <div className="mt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleUndo(item)}
                  disabled={undoDelivery.isPending}
                >
                  <Undo2 className="h-4 w-4 mr-1" />
                  {t('distribution:roomHistory.undoButton', { hours: 24 - differenceInHours(new Date(), new Date(item.confirmed_at!)) })}
                </Button>
              </div>
            )}
          </div>

          <Link to={`/inventory/distributions/${item.order_id}`}>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t('distribution:roomHistory.title')}
            <Badge variant="secondary" className="ml-auto">{history.length}</Badge>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {t('distribution:roomHistory.pendingBadge', { count: pendingCount })}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Section - Highlighted */}
          {pendingCount > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                {t('distribution:roomHistory.needsAction')}
              </div>
              <div className="space-y-3">
                {pendingOrders.map(renderOrderItem)}
              </div>
            </div>
          )}

          {/* Processed Section */}
          {processedOrders.length > 0 && (
            <div className="space-y-2">
              {pendingCount > 0 && (
                <div className="text-sm font-medium text-muted-foreground pt-2 border-t">
                  {t('distribution:roomHistory.processedHistory')}
                </div>
              )}
              <div className="space-y-3">
                {processedOrders.map(renderOrderItem)}
              </div>
            </div>
          )}

        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('distribution:rejectDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('distribution:rejectDialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">{t('distribution:rejectDialog.reasonLabel')}</Label>
              <Textarea
                id="rejection-reason"
                placeholder={t('distribution:rejectDialog.reasonPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              {t('distribution:rejectDialog.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectDelivery.isPending}
            >
              {rejectDelivery.isPending ? t('distribution:rejectDialog.processing') : t('distribution:rejectDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
