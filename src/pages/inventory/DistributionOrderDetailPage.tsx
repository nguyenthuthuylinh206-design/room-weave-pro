import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, differenceInHours } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowLeft, CheckCircle, Clock, Truck, XCircle, User, Package, DoorOpen, Ban, Printer, AlertTriangle, Undo2, AlertCircle, Pencil } from 'lucide-react'
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
import { useDistributionOrderDetail, useCancelDistributionOrder, useConfirmWarehouseDelivery } from '@/hooks/useDistributionOrders'
import { useUndoRoomDelivery } from '@/hooks/useRoomDistributionHistory'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUser } from '@/hooks/useUser'
import { cn } from '@/lib/utils'
import { printDistributionOrder } from '@/utils/printDistributionOrder'
import { useTranslation } from 'react-i18next'
import type { DistributionOrderStatus, DistributionRoomStatus, DistributionOrderRoom } from '@/types/distribution.types'
import EditDistributionOrderDialog from '@/components/inventory/EditDistributionOrderDialog'

const STATUS_CONFIG: Record<DistributionOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Chờ giao', variant: 'outline', icon: Clock },
  in_progress: { label: 'Đang giao', variant: 'default', icon: Truck },
  completed: { label: 'Hoàn thành', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', variant: 'destructive', icon: XCircle },
}

const ROOM_STATUS_CONFIG: Record<DistributionRoomStatus, { label: string; color: string }> = {
  pending: { label: 'Chờ xác nhận', color: 'bg-muted text-muted-foreground' },
  delivered: { label: 'Đang giao', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Đã giao', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
}

// Roles that can confirm warehouse delivery
const WAREHOUSE_MANAGER_ROLES = ['tenant_owner', 'manager', 'warehouse_manager', 'hotel_manager']

export default function DistributionOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { user } = useUser()
  const { t } = useTranslation('distribution')
  
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [showUndoDialog, setShowUndoDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<DistributionOrderRoom | null>(null)
  
  const { data: order, isLoading } = useDistributionOrderDetail(id)
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelDistributionOrder()
  const { mutate: undoDelivery, isPending: isUndoing } = useUndoRoomDelivery()
  const { mutate: confirmWarehouseDelivery, isPending: isConfirmingWarehouse } = useConfirmWarehouseDelivery()

  // Check if current user is warehouse manager (can confirm delivery)
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

  // Check if ALL rooms are still pending (can edit)
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

  const canUndoRoom = (room: DistributionOrderRoom) => {
    if (room.status !== 'confirmed' || !room.confirmed_at) return false
    const hoursSinceConfirm = differenceInHours(new Date(), new Date(room.confirmed_at))
    return hoursSinceConfirm < 24 && isWarehouseManager
  }

  // Room card component
  const RoomCard = ({ room }: { room: DistributionOrderRoom }) => {
    const roomConfig = ROOM_STATUS_CONFIG[room.status]
    const canConfirm = room.status === 'pending' && isWarehouseManager
    const canUndo = canUndoRoom(room)

    return (
      <Card className={cn(
        'transition-all',
        room.status === 'confirmed' && 'border-green-200 bg-green-50/30',
        room.status === 'rejected' && 'border-red-200 bg-red-50/30'
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
                  {/* Chỉ hiển thị số lượng nhận khi đã xác nhận VÀ khác với số yêu cầu */}
                  {room.status === 'confirmed' && item.quantity_confirmed !== null && item.quantity_confirmed !== item.quantity && (
                    <Badge variant={item.quantity_confirmed < item.quantity ? 'destructive' : 'outline'}>
                      Thực: {item.quantity_confirmed}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Warehouse manager: Confirm delivery (pending -> confirmed) */}
          {room.status === 'pending' && (
            <>
              {canConfirm ? (
                <div className="pt-2">
                  <Button 
                    className="w-full" 
                    onClick={() => handleConfirmDelivery(room.id)}
                    disabled={isConfirmingWarehouse}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {isConfirmingWarehouse ? 'Đang xử lý...' : 'Xác nhận giao hàng'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Chỉ quản lý kho mới có thể xác nhận giao hàng</span>
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
            {canEdit && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
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

      <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tác xác nhận</AlertDialogTitle>
            <AlertDialogDescription>
              Hoàn tác xác nhận giao hàng cho phòng {selectedRoom?.room_number}? 
              Phòng sẽ được chuyển về trạng thái chờ xác nhận.
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
      
      <EditDistributionOrderDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        order={order}
      />
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
          {canEdit && (
            <Button 
              variant="outline" 
              onClick={() => setShowEditDialog(true)}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Chỉnh sửa
            </Button>
          )}
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
              <div className="text-sm text-muted-foreground">Đã giao</div>
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

      <AlertDialog open={showUndoDialog} onOpenChange={setShowUndoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hoàn tác xác nhận</AlertDialogTitle>
            <AlertDialogDescription>
              Hoàn tác xác nhận giao hàng cho phòng {selectedRoom?.room_number}? 
              Phòng sẽ được chuyển về trạng thái chờ xác nhận.
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

      <EditDistributionOrderDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        order={order}
      />
    </div>
  )
}
