import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ArrowLeft, CheckCircle, Clock, Truck, XCircle, User, Package, DoorOpen, Ban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
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
import { useDistributionOrderDetail, useCompleteRoomDelivery, useCancelDistributionOrder } from '@/hooks/useDistributionOrders'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import type { DistributionOrderStatus, DistributionRoomStatus } from '@/types/distribution.types'

const STATUS_CONFIG: Record<DistributionOrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  pending: { label: 'Chờ giao', variant: 'outline', icon: Clock },
  in_progress: { label: 'Đang giao', variant: 'default', icon: Truck },
  completed: { label: 'Hoàn thành', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', variant: 'destructive', icon: XCircle },
}

const ROOM_STATUS_CONFIG: Record<DistributionRoomStatus, { label: string; color: string }> = {
  pending: { label: 'Chờ giao', color: 'bg-muted text-muted-foreground' },
  delivered: { label: 'Đã giao', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Đã xác nhận', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', color: 'bg-red-100 text-red-700' },
}

export default function DistributionOrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  
  const { data: order, isLoading } = useDistributionOrderDetail(id)
  const { mutate: completeDelivery, isPending } = useCompleteRoomDelivery()
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelDistributionOrder()

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
  const completedRooms = order.rooms?.filter(r => r.status === 'confirmed').length || 0
  const totalRooms = order.rooms?.length || 0
  const progress = totalRooms > 0 ? Math.round((completedRooms / totalRooms) * 100) : 0

  const handleConfirmRoom = (roomOrderId: string) => {
    completeDelivery({ roomOrderId })
  }

  const handleCancelOrder = () => {
    if (!id) return
    cancelOrder(id, {
      onSuccess: () => {
        setShowCancelDialog(false)
        navigate('/inventory/distributions')
      }
    })
  }

  const canCancel = order.status === 'pending' || order.status === 'in_progress'

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
          {order.rooms?.map(room => {
            const roomConfig = ROOM_STATUS_CONFIG[room.status]
            const canConfirm = room.status === 'pending' || room.status === 'delivered'

            return (
              <Card key={room.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DoorOpen className="h-5 w-5 text-muted-foreground" />
                      <span className="font-semibold">Phòng {room.room_number}</span>
                      <Badge variant="outline">Tầng {room.floor}</Badge>
                    </div>
                    <Badge className={roomConfig.color}>{roomConfig.label}</Badge>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    {room.items?.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">{item.item_name}</span>
                          <span className="text-muted-foreground ml-2">({item.item_code})</span>
                        </div>
                        <Badge variant="secondary">x{item.quantity}</Badge>
                      </div>
                    ))}
                  </div>

                  {canConfirm && (
                    <Button 
                      className="w-full" 
                      onClick={() => handleConfirmRoom(room.id)}
                      disabled={isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Xác nhận đã giao
                    </Button>
                  )}

                  {room.confirmed_at && (
                    <div className="text-xs text-muted-foreground text-center">
                      Xác nhận bởi {room.confirmed_by_name} lúc{' '}
                      {format(new Date(room.confirmed_at), 'HH:mm dd/MM', { locale: vi })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Cancel Dialog */}
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
              <div className="text-sm text-muted-foreground">Đã hoàn thành</div>
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
        {order.rooms?.map(room => {
          const roomConfig = ROOM_STATUS_CONFIG[room.status]
          const canConfirm = room.status === 'pending' || room.status === 'delivered'

          return (
            <Card key={room.id} className={cn(
              'transition-all',
              room.status === 'confirmed' && 'opacity-75'
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
                      <Badge variant="secondary">x{item.quantity}</Badge>
                    </div>
                  ))}
                </div>

                {canConfirm && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleConfirmRoom(room.id)}
                    disabled={isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Xác nhận đã giao
                  </Button>
                )}

                {room.confirmed_at && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    Xác nhận bởi {room.confirmed_by_name} lúc{' '}
                    {format(new Date(room.confirmed_at), 'HH:mm dd/MM/yyyy', { locale: vi })}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
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

      {/* Cancel Dialog */}
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
    </div>
  )
}
