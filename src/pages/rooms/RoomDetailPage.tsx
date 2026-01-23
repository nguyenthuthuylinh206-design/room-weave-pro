import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { 
  Edit, 
  ClipboardCheck, 
  Printer,
  AlertCircle,
  RefreshCw,
  Truck,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Package,
  RotateCcw,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { RoomItemsList } from '@/components/rooms/RoomItemsList'
import { EnhancedCheckHistory } from '@/components/rooms/EnhancedCheckHistory'
import { RoomDistributionHistory } from '@/components/rooms/RoomDistributionHistory'
import { RoomHealthScore } from '@/components/rooms/RoomHealthScore'
import { GuestInfoCard } from '@/components/rooms/GuestInfoCard'
import { MobileRoomDetailPage } from '@/components/rooms/MobileRoomDetailPage'
import { CreateTaskDialog } from '@/components/housekeeping/CreateTaskDialog'
import { useRoom } from '@/hooks/useRooms'
import { useApplyStandards } from '@/hooks/useRoomStandards'
import { useSetupRoom } from '@/hooks/useSetupRoom'
import { useRoomDistributionHistory } from '@/hooks/useRoomDistributionHistory'
import { useUser } from '@/hooks/useUser'
import { useBreakpoint } from '@/lib/breakpoints'
import { formatCurrency } from '@/lib/utils'
import { canCreateHousekeepingTask } from '@/lib/userAccess'
import { PermissionGate } from '@/components/auth/PermissionGate'
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

export function RoomDetailPage() {
  const { t } = useTranslation(['rooms', 'common', 'distribution'])
  const { isMobile } = useBreakpoint()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useRoom(id)
  const applyStandards = useApplyStandards()
  const setupRoom = useSetupRoom()
  const { data: deliveryHistory } = useRoomDistributionHistory(id)
  const { user } = useUser()
  const deliveryRef = useRef<HTMLDivElement>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const canCreateTask = canCreateHousekeepingTask(user)
  
  // Count pending deliveries
  const pendingDeliveryCount = deliveryHistory?.filter(
    h => h.room_status === 'pending' || h.room_status === 'delivered'
  ).length || 0
  
  const scrollToDelivery = () => {
    deliveryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Mobile view
  if (isMobile) {
    return <MobileRoomDetailPage />
  }
  
  if (isLoading) {
    return <RoomDetailSkeleton />
  }
  
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">{t('rooms:detail.notFound')}</h3>
        <Button onClick={() => navigate('/rooms')} className="mt-4">
          {t('rooms:detail.backToList')}
        </Button>
      </div>
    )
  }
  
  // Destructure data from useRoom
  const { room, hotel, items, recent_checks: checks } = data
  
  // Calculate item statistics
  const standardItems = items.filter(item => item.has_standard)
  const otherItems = items.filter(item => !item.has_standard)
  const totalItemsInRoom = items.length
  const completeItems = standardItems.filter(item => item.missing_quantity === 0).length
  const missingCount = standardItems.filter(item => item.missing_quantity > 0).length
  
  // Calculate total missing quantity
  const totalMissingQuantity = standardItems.reduce((sum, item) => {
    return sum + item.missing_quantity
  }, 0)
  
  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Phòng {room.room_number}</h1>
              <RoomStatusBadge status={room.status as import('@/types/rooms.types').RoomStatus} />
            </div>
            <p className="text-xs text-muted-foreground capitalize">
              {room.room_type} • Tầng {room.floor} {room.area_sqm && `• ${room.area_sqm}m²`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PermissionGate module="rooms" action="update">
            <Button variant="outline" size="sm" onClick={() => navigate(`/rooms/${id}/edit`)}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Sửa
            </Button>
          </PermissionGate>
          <Button size="sm" onClick={() => navigate(`/rooms/${id}/check`)}>
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
            Kiểm tra
          </Button>
        </div>
      </div>
      
      {/* Alert Banner for Pending Deliveries */}
      {pendingDeliveryCount > 0 && (
        <div 
          className="flex items-center gap-3 p-3 border border-amber-300 dark:border-amber-700 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-950/30 transition-colors"
          onClick={scrollToDelivery}
        >
          <Truck className="h-4 w-4 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {pendingDeliveryCount} đơn giao đang chờ xác nhận
            </p>
          </div>
          <span className="text-xs text-amber-600">Xem →</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Room Info - Simplified */}
          <div className="border rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Số phòng</p>
                <p className="text-lg font-bold">{room.room_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Loại phòng</p>
                <p className="text-sm font-medium capitalize">{room.room_type}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tầng</p>
                <p className="text-sm font-medium">{room.floor}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sức chứa</p>
                <p className="text-sm font-medium">{room.max_guests} khách</p>
              </div>
              {room.bed_type && (
                <div>
                  <p className="text-xs text-muted-foreground">Giường</p>
                  <p className="text-sm capitalize">{room.bed_type}</p>
                </div>
              )}
              {room.view_type && (
                <div>
                  <p className="text-xs text-muted-foreground">View</p>
                  <p className="text-sm capitalize">{room.view_type}</p>
                </div>
              )}
              {room.base_price && (
                <div>
                  <p className="text-xs text-muted-foreground">Giá/đêm</p>
                  <p className="text-sm font-semibold text-primary">{formatCurrency(room.base_price)}</p>
                </div>
              )}
              {room.area_sqm && (
                <div>
                  <p className="text-xs text-muted-foreground">Diện tích</p>
                  <p className="text-sm">{room.area_sqm} m²</p>
                </div>
              )}
            </div>
            
            {room.amenities && room.amenities.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1.5">Tiện nghi</p>
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities.map((amenity: string, index: number) => (
                    <span key={index} className="text-xs px-2 py-0.5 bg-muted rounded">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {room.notes && (
              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                <p className="text-sm">{room.notes}</p>
              </div>
            )}
          </div>

          {/* Recent Check Photos */}
          {checks && checks.length > 0 && checks[0].photos && Array.isArray(checks[0].photos) && checks[0].photos.length > 0 && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">Ảnh kiểm tra gần nhất</p>
                <span className="text-xs text-muted-foreground">
                  {new Date(checks[0].checked_at).toLocaleDateString('vi-VN')} • {checks[0].checked_by_name}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {(checks[0].photos as string[]).slice(0, 4).map((photo, idx) => (
                  <a
                    key={idx}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  >
                    <img 
                      src={photo} 
                      alt={`Ảnh ${idx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                  </a>
                ))}
              </div>
              {(checks[0].photos as string[]).length > 4 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  +{(checks[0].photos as string[]).length - 4} ảnh khác
                </p>
              )}
            </div>
          )}
          
          {/* Room Items */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Đồ dùng trong phòng</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {completeItems} đủ
                </span>
                {missingCount > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle className="h-3.5 w-3.5" />
                    {missingCount} thiếu
                  </span>
                )}
              </div>
            </div>
            
            {/* Alert when no items */}
            {totalItemsInRoom === 0 && (
              <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Chưa có đồ dùng</p>
                  <p className="text-xs text-muted-foreground">
                    Áp dụng tiêu chuẩn phòng {room.room_type} để thêm đồ dùng
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => applyStandards.mutate(id!)}
                  disabled={applyStandards.isPending}
                  className="ml-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${applyStandards.isPending ? 'animate-spin' : ''}`} />
                  Áp dụng
                </Button>
              </div>
            )}
            
            {totalItemsInRoom > 0 && <RoomItemsList items={items} roomId={id!} />}
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-4">
          {/* Guest Info Card */}
          <GuestInfoCard 
            roomId={id!}
            hotelId={room.hotel_id}
            tenantId={room.tenant_id}
            roomNumber={room.room_number}
          />
          
          {/* Health Score - Compact */}
          <RoomHealthScore 
            checks={checks}
            totalItems={standardItems.length}
            missingItems={missingCount}
          />
          
          {/* Item Stats Row */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-around text-center">
              <div>
                <p className="text-xl font-bold text-primary">{totalItemsInRoom}</p>
                <p className="text-[10px] text-muted-foreground">Tổng</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xl font-bold text-green-600">{completeItems}</p>
                <p className="text-[10px] text-muted-foreground">Đủ</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <p className="text-xl font-bold text-red-600">{missingCount}</p>
                <p className="text-[10px] text-muted-foreground">Thiếu</p>
              </div>
            </div>
          </div>

          {/* Distribution History */}
          <div ref={deliveryRef}>
            <RoomDistributionHistory roomId={id!} roomNumber={room.room_number} />
          </div>
          
          {/* Check History */}
          <div className="border rounded-lg p-4">
            <p className="text-sm font-medium mb-3">Lịch sử kiểm tra</p>
            <EnhancedCheckHistory checks={checks} />
          </div>
          
          {/* Quick Actions */}
          <div className="border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">Thao tác nhanh</p>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => navigate(`/rooms/${id}/check`)}
            >
              <ClipboardCheck className="mr-2 h-3.5 w-3.5" />
              Kiểm tra phòng
            </Button>
            <Button 
              variant={standardItems.length === 0 ? "default" : "outline"}
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => applyStandards.mutate(id!)}
              disabled={applyStandards.isPending}
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${applyStandards.isPending ? 'animate-spin' : ''}`} />
              {standardItems.length === 0 ? 'Áp dụng tiêu chuẩn' : 'Đồng bộ tiêu chuẩn'}
            </Button>
            {canCreateTask && (
              <Button 
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={() => setShowCreateTask(true)}
              >
                <Wrench className="mr-2 h-3.5 w-3.5" />
                Yêu cầu công việc
              </Button>
            )}
            <Button 
              variant="outline"
              size="sm"
              className="w-full justify-start h-8 text-xs text-amber-600 hover:text-amber-700"
              onClick={() => setShowResetDialog(true)}
              disabled={setupRoom.isPending}
            >
              <RotateCcw className={`mr-2 h-3.5 w-3.5 ${setupRoom.isPending ? 'animate-spin' : ''}`} />
              Reset phòng
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-start h-8 text-xs"
              onClick={() => window.print()}
            >
              <Printer className="mr-2 h-3.5 w-3.5" />
              In danh sách đồ dùng
            </Button>
          </div>
        </div>
      </div>

      {/* Reset Room Confirmation Dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset phòng {room.room_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Xóa tất cả đồ dùng không có trong tiêu chuẩn</li>
                <li>Đặt lại số lượng theo tiêu chuẩn phòng {room.room_type}</li>
              </ul>
              <p className="mt-2 font-medium text-amber-600">Hành động này không thể hoàn tác.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setupRoom.mutate({ roomId: id!, reset: true })
                setShowResetDialog(false)
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset phòng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Task Dialog */}
      {showCreateTask && data && (
        <CreateTaskDialog
          open={showCreateTask}
          onOpenChange={setShowCreateTask}
          roomId={id!}
          roomNumber={room.room_number}
          hotelId={room.hotel_id}
        />
      )}
    </div>
  )
}

function RoomDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-24 mt-1" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}