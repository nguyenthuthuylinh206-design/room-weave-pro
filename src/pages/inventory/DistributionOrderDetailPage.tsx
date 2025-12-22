import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowLeft, Ban, Printer, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { OrderStatusBadge } from '@/components/distribution/components/DistributionStatusBadge'
import { RoomDeliveryCard } from '@/components/distribution/components/RoomDeliveryCard'
import { DistributionSummaryCards } from '@/components/distribution/components/DistributionSummaryCards'
import { CancelOrderDialog } from '@/components/distribution/dialogs/CancelOrderDialog'
import { UndoDeliveryDialog } from '@/components/distribution/dialogs/UndoDeliveryDialog'
import { EditDistributionDialog } from '@/components/distribution/dialogs/EditDistributionDialog'
import { useDistributionOrderDetail, useCancelDistributionOrder, useConfirmWarehouseDelivery } from '@/hooks/useDistributionOrders'
import { useUndoRoomDelivery } from '@/hooks/useRoomDistributionHistory'
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
  const { mutate: confirmWarehouseDelivery, isPending: isConfirmingWarehouse } = useConfirmWarehouseDelivery()

  const isWarehouseManager = WAREHOUSE_MANAGER_ROLES.includes(user?.user_level_code || '')

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

  const handleConfirmDelivery = (roomOrderId: string) => {
    confirmWarehouseDelivery({ roomOrderId })
  }

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

  // Mobile view
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

          {/* Progress */}
          <div className="p-4 bg-muted/30 border-b">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Tiến độ giao hàng</span>
              <span className="text-sm font-medium">{completedRooms}/{totalRooms} phòng</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Rooms List */}
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {order.rooms?.map(room => (
              <RoomDeliveryCard
                key={room.id}
                room={room}
                isWarehouseManager={isWarehouseManager}
                onConfirmDelivery={handleConfirmDelivery}
                onUndoDelivery={handleOpenUndo}
                isConfirming={isConfirmingWarehouse}
              />
            ))}
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

  // Desktop view
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

      {/* Summary Cards */}
      <DistributionSummaryCards
        totalRooms={totalRooms}
        completedRooms={completedRooms}
        totalItems={order.total_items}
        assignedTo={order.assigned_to_name}
      />

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tiến độ giao hàng</span>
          <span className="font-medium">{progress}% ({completedRooms}/{totalRooms} phòng)</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {order.rooms?.map(room => (
          <RoomDeliveryCard
            key={room.id}
            room={room}
            isWarehouseManager={isWarehouseManager}
            onConfirmDelivery={handleConfirmDelivery}
            onUndoDelivery={handleOpenUndo}
            isConfirming={isConfirmingWarehouse}
          />
        ))}
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
    </div>
  )
}
