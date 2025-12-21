import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInHours } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowLeft, CheckCircle, Clock, Truck, XCircle, User, Package, DoorOpen, Ban, Printer, AlertTriangle, Undo2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDistributionOrderDetail, useCompleteRoomDelivery, useCancelDistributionOrder, useConfirmWarehouseDelivery } from '@/hooks/useDistributionOrders'
import { useRejectRoomDelivery, useUndoRoomDelivery } from '@/hooks/useRoomDistributionHistory'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUser } from '@/hooks/useUser'
import { cn } from '@/lib/utils'
import { printDistributionOrder } from '@/utils/printDistributionOrder'
import { useTranslation } from 'react-i18next'
import type { DistributionOrderStatus, DistributionRoomStatus, DistributionOrderRoom } from '@/types/distribution.types'
import ConfirmReceiptDialog from '@/components/inventory/ConfirmReceiptDialog'

const STATUS_CONFIG: Record<DistributionOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Chờ giao', variant: 'outline', icon: Clock },
  in_progress: { label: 'Đang giao', variant: 'default', icon: Truck },
  completed: { label: 'Hoàn thành', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', variant: 'destructive', icon: XCircle },
}

const ROOM_STATUS_CONFIG: Record<DistributionRoomStatus, { label: string; color: string }> = {
  pending: { label: 'Chờ xuất kho', color: 'bg-muted text-muted-foreground' },
  delivered: { label: 'Đã xuất kho', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
}

// Roles that can confirm warehouse delivery
const WAREHOUSE_MANAGER_ROLES = ['tenant_owner', 'manager', 'warehouse_manager']

export default function DistributionOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user } = useUser()
  const { t } = useTranslation('distribution')
  
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [showUndoDialog, setShowUndoDialog] = useState(false)
  const [showConfirmReceiptDialog, setShowConfirmReceiptDialog] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<DistributionOrderRoom | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  
  const { data: order, isLoading } = useDistributionOrderDetail(id)
  const { mutate: completeDelivery, isPending } = useCompleteRoomDelivery()
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelDistributionOrder()
  const { mutate: rejectDelivery, isPending: isRejecting } = useRejectRoomDelivery()
  const { mutate: undoDelivery, isPending: isUndoing } = useUndoRoomDelivery()
  const { mutate: confirmWarehouseDelivery, isPending: isConfirmingWarehouse } = useConfirmWarehouseDelivery()

  // Check if current user is the assigned staff member
  const isAssignedStaff = order?.assigned_to === user?.id
  
  // Check if current user is warehouse manager (can confirm warehouse delivery)
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

  const config = STATUS_CONFIG[order.status]
  const completedRooms = order.rooms?.filter(r => r.status === 'confirmed' || r.status === 'rejected').length || 0
  const totalRooms = order.rooms?.length || 0
  const progress = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0

  const handleConfirmRoom = (
    roomOrderId: string,
    items: { item_id: string; quantity_confirmed: number }[],
    additionalItems: { item_id: string; quantity: number }[]
  ) => {
    completeDelivery({ 
      roomOrderId, 
      items,
      additionalItems,
      orderCode: order?.order_code,
      roomNumber: selectedRoom?.room_number,
      createdByUserId: order?.created_by,
    }, {
      onSuccess: () => {
        setShowConfirmReceiptDialog(false)
        setSelectedRoom(null)
      }
    })
  }

  const handleConfirmWarehouseDelivery = (roomOrderId: string) => {
    confirmWarehouseDelivery({ roomOrderId })
  }

  const handleRejectRoom = () => {
    if (!selectedRoom || !user?.id || !rejectionReason.trim()) return
    rejectDelivery({
      distributionOrderRoomId: selectedRoom.id,
      rejectedBy: user.id,
      rejectionReason: rejectionReason.trim()
    }, {
      onSuccess: () => {
        setShowRejectDialog(false)
        setSelectedRoom(null)
        setRejectionReason('')
      }
    })
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

  const canUndoRoom = (room: DistributionOrderRoom) => {
    if (room.status !== 'confirmed' || !room.confirmed_at) return false
    const hoursSinceConfirm = differenceInHours(new Date(), new Date(room.confirmed_at))
    return hoursSinceConfirm < 24 && isAssignedStaff
  }

  const canCancel = order.status === 'pending' || order.status === 'in_progress'

  // Room card component for reuse
  const RoomCard = ({ room }: { room: DistributionOrderRoom }) => {
    const roomConfig = ROOM_STATUS_CONFIG[room.status]
    
    // Warehouse manager can confirm warehouse delivery (pending -> delivered)
    const canConfirmWarehouse = room.status === 'pending' && isWarehouseManager
    
    // Assigned staff can confirm receipt (delivered -> confirmed) or reject
    const canConfirmReceipt = room.status === 'delivered' && isAssignedStaff
    
    const canUndo = canUndoRoom(room)

    return (
      <Card className={cn(
        'transition-all',
        room.status === 'confirmed' && 'border-green-200 bg-green-50/30',
        room.status === 'rejected' && 'border-red-200 bg-red-50/30',
        room.status === 'delivered' && 'border-blue-200 bg-blue-50/30'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />
              Phòng {room.room_number}
            </CardTitle>
            <Badge className={roomConfig.color}>{roomConfig.label}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">Tầng {room.floor}</div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Separator />
          <div className="space-y-2">
            {room.items?.map(item => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 truncate">
                  <span className="font-medium">{item.item_name}</span>
                  <span className="text-muted-foreground ml-1">({item.item_code})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">x{item.quantity}</Badge>
                  {item.quantity_confirmed !== null && item.quantity_confirmed !== item.quantity && (
                    <Badge variant={item.quantity_confirmed < item.quantity ? 'destructive' : 'outline'}>
                      Nhận: {item.quantity_confirmed}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Warehouse manager: Confirm warehouse delivery (pending -> delivered) */}
          {room.status === 'pending' && (
            <>
              {canConfirmWarehouse ? (
                <div className="pt-2">
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => handleConfirmWarehouseDelivery(room.id)}
                    disabled={isConfirmingWarehouse}
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    {isConfirmingWarehouse ? t('warehouseDelivery.confirming') : t('warehouseDelivery.confirmButton')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{t('warehouseDelivery.onlyWarehouseManager')}</span>
                </div>
              )}
            </>
          )}

          {/* Delivered info */}
          {room.status === 'delivered' && room.delivered_at && room.delivered_by_name && (
            <div className="text-xs text-muted-foreground py-1">
              {t('warehouseDelivery.deliveredBy', { name: room.delivered_by_name })}{' '}
              {t('warehouseDelivery.deliveredAt', { date: format(new Date(room.delivered_at), 'HH:mm dd/MM', { locale: vi }) })}
            </div>
          )}

          {/* Assigned staff: Confirm receipt or reject (delivered -> confirmed/rejected) */}
          {room.status === 'delivered' && (
            <>
              {canConfirmReceipt ? (
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      setSelectedRoom(room)
                      setShowConfirmReceiptDialog(true)
                    }}
                    disabled={isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Xác nhận nhận hàng
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setSelectedRoom(room)
                      setShowRejectDialog(true)
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Chỉ nhân viên được phân công ({order.assigned_to_name || 'Chưa phân công'}) mới có thể xác nhận nhận hàng</span>
                </div>
              )}
            </>
          )}

          {/* Confirmed info with undo */}
          {room.status === 'confirmed' && room.confirmed_at && (
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs text-muted-foreground">
                Xác nhận bởi {room.confirmed_by_name} lúc{' '}
                {format(new Date(room.confirmed_at), 'HH:mm dd/MM', { locale: vi })}
              </div>
              {canUndo && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedRoom(room)
                    setShowUndoDialog(true)
                  }}
                >
                  <Undo2 className="h-3 w-3 mr-1" />
                  Hoàn tác
                </Button>
              )}
            </div>
          )}

          {/* Rejected info */}
          {room.status === 'rejected' && (
            <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <div>
                <p>Từ chối bởi {room.confirmed_by_name}</p>
                {room.rejection_reason && (
                  <p className="mt-1">Lý do: {room.rejection_reason}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (isMobile) {
    return (
      <>
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="sticky top-0 z-10 bg-background border-b p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="font-mono font-semibold">{order.order_code}</div>
              <Badge variant={config.variant} className="mt-1">
                <config.icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => order && printDistributionOrder(order)}
            >
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
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy phiếu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy phiếu giao hàng <span className="font-mono font-semibold">{order.order_code}</span>?
              Tất cả sản phẩm chưa giao sẽ được hoàn trả về kho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Đóng</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối giao hàng</DialogTitle>
            <DialogDescription>
              Từ chối giao hàng cho phòng {selectedRoom?.room_number}. Sản phẩm sẽ được hoàn trả về kho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Lý do từ chối *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Nhập lý do từ chối..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Hủy</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectRoom}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tác xác nhận</AlertDialogTitle>
            <AlertDialogDescription>
              Hoàn tác xác nhận giao hàng cho phòng {selectedRoom?.room_number}? 
              Sản phẩm sẽ được chuyển về trạng thái chờ giao.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUndoing}>Đóng</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndoRoom} disabled={isUndoing}>
              {isUndoing ? 'Đang xử lý...' : 'Xác nhận hoàn tác'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </>
    )
  }

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
            <Badge variant={config.variant} className="text-sm">
              <config.icon className="h-4 w-4 mr-1" />
              {config.label}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Tạo bởi {order.created_by_name} • {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button 
            variant="outline" 
            onClick={() => order && printDistributionOrder(order)}
          >
            <Printer className="h-4 w-4 mr-2" />
            In phiếu
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <DoorOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalRooms}</div>
              <div className="text-sm text-muted-foreground">Tổng phòng</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{completedRooms}</div>
              <div className="text-sm text-muted-foreground">Đã xử lý</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{order.total_items}</div>
              <div className="text-sm text-muted-foreground">Tổng sản phẩm</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <User className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm font-medium truncate">
                {order.assigned_to_name || 'Chưa phân công'}
              </div>
              <div className="text-sm text-muted-foreground">Người giao</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Tiến độ giao hàng</span>
            <span className="text-sm text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </CardContent>
      </Card>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {order.rooms?.map(room => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>

      {order.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Ghi chú</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{order.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận hủy phiếu</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn hủy phiếu giao hàng <span className="font-mono font-semibold">{order.order_code}</span>?
              Tất cả sản phẩm chưa giao sẽ được hoàn trả về kho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Đóng</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối giao hàng</DialogTitle>
            <DialogDescription>
              Từ chối giao hàng cho phòng {selectedRoom?.room_number}. Sản phẩm sẽ được hoàn trả về kho.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason-desktop">Lý do từ chối *</Label>
              <Textarea
                id="rejection-reason-desktop"
                placeholder="Nhập lý do từ chối..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Hủy</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectRoom}
              disabled={isRejecting || !rejectionReason.trim()}
            >
              {isRejecting ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tác xác nhận</AlertDialogTitle>
            <AlertDialogDescription>
              Hoàn tác xác nhận giao hàng cho phòng {selectedRoom?.room_number}? 
              Sản phẩm sẽ được chuyển về trạng thái chờ giao.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUndoing}>Đóng</AlertDialogCancel>
            <AlertDialogAction onClick={handleUndoRoom} disabled={isUndoing}>
              {isUndoing ? 'Đang xử lý...' : 'Xác nhận hoàn tác'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
