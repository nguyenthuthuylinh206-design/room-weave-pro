import { useState, useMemo } from 'react'
import { Truck, Package, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Accordion } from '@/components/ui/accordion'
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
import { Button } from '@/components/ui/button'
import { 
  useRoomDistributionHistory, 
  useConfirmRoomDelivery,
  useBatchConfirmDeliveries,
  useRejectRoomDelivery, 
  useUndoRoomDelivery,
  type RoomDistributionHistoryItem
} from '@/hooks/useRoomDistributionHistory'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/hooks/useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { triggerDistributionDeliveryRejected } from '@/hooks/useNotificationTriggers'
import { DistributionAccordionItem } from './distribution/DistributionAccordionItem'
import { BatchConfirmBar } from './distribution/BatchConfirmBar'
import { useTranslation } from 'react-i18next'

interface RoomDistributionHistoryProps {
  roomId: string
  roomNumber?: string
}

export function RoomDistributionHistory({ roomId, roomNumber }: RoomDistributionHistoryProps) {
  const { t } = useTranslation(['distribution', 'common'])
  const { user } = useAuth()
  const { tenant } = useTenant()
  const { selectedHotel } = useHotelContext()
  const { data: history, isLoading } = useRoomDistributionHistory(roomId)
  
  const [selectedOrders, setSelectedOrders] = useState<string[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<RoomDistributionHistoryItem | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const confirmDelivery = useConfirmRoomDelivery()
  const batchConfirm = useBatchConfirmDeliveries()
  const rejectDelivery = useRejectRoomDelivery()
  const undoDelivery = useUndoRoomDelivery()

  // Separate pending vs processed
  const { pendingOrders, processedOrders } = useMemo(() => {
    if (!history) return { pendingOrders: [], processedOrders: [] }
    return {
      pendingOrders: history.filter(h => h.room_status === 'pending' || h.room_status === 'delivered'),
      processedOrders: history.filter(h => h.room_status !== 'pending' && h.room_status !== 'delivered')
    }
  }, [history])

  // Selection handlers
  const handleSelect = (id: string, selected: boolean) => {
    setSelectedOrders(prev => 
      selected ? [...prev, id] : prev.filter(x => x !== id)
    )
  }

  const handleSelectAll = () => {
    setSelectedOrders(pendingOrders.map(o => o.room_order_id))
  }

  const handleClearSelection = () => {
    setSelectedOrders([])
  }

  // Action handlers
  const handleConfirm = (item: RoomDistributionHistoryItem) => {
    if (!user?.id) return
    confirmDelivery.mutate({
      roomOrderId: item.room_order_id,
      confirmedBy: user.id
    })
  }

  const handleBatchConfirm = () => {
    if (!user?.id || selectedOrders.length === 0) return
    batchConfirm.mutate({
      roomOrderIds: selectedOrders,
      confirmedBy: user.id
    }, {
      onSuccess: () => setSelectedOrders([])
    })
  }

  const handleOpenRejectDialog = (item: RoomDistributionHistoryItem) => {
    setSelectedItem(item)
    setRejectionReason('')
    setRejectDialogOpen(true)
  }

  const handleReject = async () => {
    if (!selectedItem || !user?.id || !rejectionReason.trim()) return

    rejectDelivery.mutate({
      distributionOrderRoomId: selectedItem.room_order_id,
      rejectedBy: user.id,
      rejectionReason: rejectionReason.trim(),
    }, {
      onSuccess: async () => {
        setRejectDialogOpen(false)
        
        // Send notification
        if (tenant?.id && selectedHotel?.id) {
          try {
            await triggerDistributionDeliveryRejected({
              tenantId: tenant.id,
              hotelId: selectedHotel.id,
              orderId: selectedItem.order_id,
              orderCode: selectedItem.order_code,
              roomNumber: roomNumber || '',
              createdByUserId: user.id,
              assignedToUserId: null,
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

  const handleUndo = (item: RoomDistributionHistoryItem) => {
    if (!user?.id) return
    undoDelivery.mutate({
      distributionOrderRoomId: item.room_order_id,
      performedBy: user.id,
    })
  }

  // Default open pending items
  const defaultOpenItems = useMemo(() => 
    pendingOrders.map(o => o.room_order_id),
    [pendingOrders]
  )

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

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t('distribution:roomHistory.title')}
            <Badge variant="secondary" className="ml-auto">{history.length}</Badge>
            {pendingOrders.length > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingOrders.length} chờ xác nhận
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pb-20">
          {/* Pending Section */}
          {pendingOrders.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
                <AlertCircle className="h-4 w-4" />
                Cần xác nhận
              </div>
              <Accordion 
                type="multiple" 
                defaultValue={defaultOpenItems}
                className="space-y-2"
              >
                {pendingOrders.map(item => (
                  <DistributionAccordionItem
                    key={item.room_order_id}
                    item={item}
                    isSelected={selectedOrders.includes(item.room_order_id)}
                    onSelect={handleSelect}
                    onConfirm={handleConfirm}
                    onReject={handleOpenRejectDialog}
                    onUndo={handleUndo}
                    isConfirming={confirmDelivery.isPending}
                    isRejecting={rejectDelivery.isPending}
                    isUndoing={undoDelivery.isPending}
                  />
                ))}
              </Accordion>
            </div>
          )}

          {/* Processed Section */}
          {processedOrders.length > 0 && (
            <div className="space-y-2">
              {pendingOrders.length > 0 && (
                <div className="text-sm font-medium text-muted-foreground pt-2 border-t">
                  Đã xử lý
                </div>
              )}
              <Accordion type="multiple" className="space-y-2">
                {processedOrders.map(item => (
                  <DistributionAccordionItem
                    key={item.room_order_id}
                    item={item}
                    isSelected={false}
                    onSelect={() => {}}
                    onConfirm={handleConfirm}
                    onReject={handleOpenRejectDialog}
                    onUndo={handleUndo}
                    isConfirming={confirmDelivery.isPending}
                    isRejecting={rejectDelivery.isPending}
                    isUndoing={undoDelivery.isPending}
                  />
                ))}
              </Accordion>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Confirm Bar */}
      <BatchConfirmBar
        selectedCount={selectedOrders.length}
        totalPending={pendingOrders.length}
        onConfirmAll={handleBatchConfirm}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        isConfirming={batchConfirm.isPending}
      />

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
