import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowLeft, Ban, Printer, Pencil, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OrderStatusBadge } from '@/components/distribution/components/DistributionStatusBadge'
import { RouteDetailView } from '@/components/distribution/components/RouteDetailView'
import { CancelOrderDialog } from '@/components/distribution/dialogs/CancelOrderDialog'
import { UndoDeliveryDialog } from '@/components/distribution/dialogs/UndoDeliveryDialog'
import { EditDistributionDialog } from '@/components/distribution/dialogs/EditDistributionDialog'
import { useDistributionOrderDetail, useCancelDistributionOrder } from '@/hooks/useDistributionOrders'
import { useUndoRoomDelivery } from '@/hooks/useRoomDistributionHistory'
import { useConfirmReceiveOrder } from '@/hooks/useRouteBatch'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUser } from '@/hooks/useUser'
import { printDistributionOrder } from '@/utils/printDistributionOrder'
import type { DistributionOrderRoom } from '@/types/distribution.types'

const WAREHOUSE_MANAGER_ROLES = ['tenant_owner', 'manager', 'warehouse_manager', 'hotel_manager']

export default function DistributionOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user } = useUser()
  
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUndoDialog, setShowUndoDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<DistributionOrderRoom | null>(null)
  
  const { data: order, isLoading } = useDistributionOrderDetail(id)
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelDistributionOrder()
  const { mutate: undoDelivery, isPending: isUndoing } = useUndoRoomDelivery()
  const { mutate: confirmReceiveOrder, isPending: isConfirmingReceive } = useConfirmReceiveOrder()

  const isWarehouseManager = WAREHOUSE_MANAGER_ROLES.includes(user?.user_level_code || '')
  const isAssignee = user?.id && order?.assigned_to === user.id
  const canConfirmReceive = order?.status === 'released' && isAssignee

  const handleConfirmReceive = () => {
    if (!id) return
    confirmReceiveOrder({ orderId: id })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-muted-foreground">Không tìm thấy phiếu giao hàng</div>
        <Button variant="outline" onClick={() => navigate('/inventory/distributions')}>
          Quay lại
        </Button>
      </div>
    )
  }

  const completedRooms = order.rooms?.filter(r => r.status === 'confirmed' || r.status === 'rejected').length || 0
  const totalRooms = order.rooms?.length || 0
  const progress = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0

  const allRoomsPending = order.rooms?.every(r => r.status === 'pending') ?? false
  const canEdit = order.status === 'pending' && allRoomsPending
  const canCancel = order.status === 'pending' || order.status === 'in_progress'

  const handleUndoRoom = () => {
    if (!selectedRoom || !user?.id) return
    undoDelivery({
      distributionOrderRoomId: selectedRoom.id,
      performedBy: user.id
    }, {
      onSuccess: () => {
        setShowUndoDialog(false)
        setSelectedRoom(null)
      }
    })
  }

  const handleCancelOrder = () => {
    if (!id || !order) return
    cancelOrder({
      orderId: id,
      orderCode: order.order_code,
      assignedToUserId: order.assigned_to,
    }, {
      onSuccess: () => {
        setShowCancelDialog(false)
        navigate('/inventory/distributions')
      }
    })
  }

  const handleOpenUndo = (room: DistributionOrderRoom) => {
    setSelectedRoom(room)
    setShowUndoDialog(true)
  }

  // Mobile view - Use RouteDetailView for unified experience
  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background border-b p-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <div className="font-mono font-semibold">{order.order_code}</div>
                <OrderStatusBadge status={order.status} />
              </div>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {canCancel && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowCancelDialog(true)}
                  disabled={isCancelling}
                >
                  <Ban className="h-4 w-4" />
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => printDistributionOrder(order)}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Guidance for Manager when order is pending */}
          {order.status === 'pending' && isWarehouseManager && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Bước tiếp theo:</strong> Ấn "Giao batch này" bên dưới để chuyển hàng cho nhân viên
              </p>
            </div>
          )}

          {/* Guidance for Staff waiting for handover */}
          {order.status === 'pending' && isAssignee && !isWarehouseManager && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Vui lòng chờ quản lý kho giao hàng cho bạn trước khi đi giao
              </p>
            </div>
          )}

          {/* Confirm Receive Button for Assignee */}
          {canConfirmReceive && (
            <div className="p-4 bg-primary/5 border-b">
              <Button
                onClick={handleConfirmReceive}
                disabled={isConfirmingReceive}
                className="w-full h-14 text-lg gap-2"
                size="lg"
              >
                <CheckCircle className="h-6 w-6" />
                {isConfirmingReceive ? 'Đang xử lý...' : 'Xác nhận đã nhận đủ hàng'}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ấn để xác nhận bạn đã nhận đủ hàng từ kho
              </p>
            </div>
          )}

          {/* Use RouteDetailView for consistent batch/stop display */}
          <div className="flex-1 overflow-auto">
            {id && <RouteDetailView orderId={id} embedded />}
          </div>
        </div>

        {/* Dialogs */}
        <CancelOrderDialog
          open={showCancelDialog}
          onOpenChange={setShowCancelDialog}
          orderCode={order.order_code}
          onConfirm={handleCancelOrder}
          isPending={isCancelling}
        />
        
        <UndoDeliveryDialog
          open={showUndoDialog}
          onOpenChange={setShowUndoDialog}
          room={selectedRoom}
          onConfirm={handleUndoRoom}
          isPending={isUndoing}
        />
        
        <EditDistributionDialog
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          order={order}
        />
      </>
    )
  }

  // Desktop view with Tabs for Route vs Legacy view
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono">{order.order_code}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground">
            Tạo bởi {order.created_by_name} • {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowEditDialog(true)}
            disabled={!canEdit}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Chỉnh sửa
          </Button>
          {canCancel && (
            <Button 
              variant="destructive" 
              onClick={() => setShowCancelDialog(true)}
              disabled={isCancelling}
            >
              <Ban className="h-4 w-4 mr-2" />
              Hủy phiếu
            </Button>
          )}
          <Button variant="outline" onClick={() => printDistributionOrder(order)}>
            <Printer className="h-4 w-4 mr-2" />
            In phiếu
          </Button>
        </div>
      </div>

      {/* Guidance for Manager when order is pending */}
      {order.status === 'pending' && isWarehouseManager && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
          <CardContent className="p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Bước tiếp theo:</strong> Ấn "Giao batch này" bên dưới để chuyển hàng cho nhân viên được gán
            </p>
          </CardContent>
        </Card>
      )}

      {/* Guidance for Staff waiting for handover */}
      {order.status === 'pending' && isAssignee && !isWarehouseManager && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Vui lòng chờ quản lý kho giao hàng cho bạn trước khi đi giao
            </p>
          </CardContent>
        </Card>
      )}

      {/* Route View - Unified for all roles */}
      {id && <RouteDetailView orderId={id} embedded />}

      {/* Dialogs */}
      <CancelOrderDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        orderCode={order.order_code}
        onConfirm={handleCancelOrder}
        isPending={isCancelling}
      />
      
      <UndoDeliveryDialog
        open={showUndoDialog}
        onOpenChange={setShowUndoDialog}
        room={selectedRoom}
        onConfirm={handleUndoRoom}
        isPending={isUndoing}
      />
      
      <EditDistributionDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        order={order}
      />
    </div>
  )
}
