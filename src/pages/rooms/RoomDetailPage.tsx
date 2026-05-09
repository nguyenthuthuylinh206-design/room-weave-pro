import { useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Edit,
  ClipboardCheck,
  AlertCircle,
  ArrowLeft,
  RotateCcw,
  Wrench,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { MobileRoomDetailPage } from '@/components/rooms/MobileRoomDetailPage'
import { CreateTaskDialog } from '@/components/housekeeping/CreateTaskDialog'
import { CleaningRequestBanner } from '@/components/rooms/CleaningRequestBanner'
import { useRoom } from '@/hooks/useRooms'
import { useApplyStandards } from '@/hooks/useRoomStandards'
import { useSetupRoom } from '@/hooks/useSetupRoom'
import { useUser } from '@/hooks/useUser'
import { useBreakpoint } from '@/lib/breakpoints'
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
import { PanelGuestBooking } from '@/components/rooms/detail/PanelGuestBooking'
import { PanelAssetStatus } from '@/components/rooms/detail/PanelAssetStatus'
import { PanelPerformance } from '@/components/rooms/detail/PanelPerformance'
import { PanelItems } from '@/components/rooms/detail/PanelItems'
import { PanelTimeline } from '@/components/rooms/detail/PanelTimeline'
import { RoomMetaSubtitle } from '@/components/rooms/detail/RoomMetaSubtitle'

export function RoomDetailPage() {
  const { isMobile } = useBreakpoint()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useRoom(id)
  const applyStandards = useApplyStandards()
  const setupRoom = useSetupRoom()
  const { user } = useUser()
  const timelineRef = useRef<HTMLDivElement>(null)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const canCreateTask = canCreateHousekeepingTask(user)

  if (isMobile) return <MobileRoomDetailPage />
  if (isLoading) return <RoomDetailSkeleton />

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Không tìm thấy phòng</h3>
        <Button onClick={() => navigate('/rooms')} className="mt-4">Về danh sách</Button>
      </div>
    )
  }

  const { room, items, recent_checks: checks } = data
  const standardItems = items.filter((i) => i.has_standard)
  const missingCount = standardItems.filter((i) => i.missing_quantity > 0).length

  const scrollToTimeline = () => {
    timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-7rem)] min-h-[680px] max-w-[1600px] mx-auto">
      {/* Header — gọn, 1 dòng */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Phòng {room.room_number}</h1>
              <RoomStatusBadge status={room.status as import('@/types/rooms.types').RoomStatus} />
            </div>
            <RoomMetaSubtitle
              roomType={room.room_type}
              floor={room.floor}
              areaSqm={room.area_sqm}
              bedType={room.bed_type}
              viewType={room.view_type}
              basePrice={room.base_price}
              amenities={room.amenities}
              notes={room.notes}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PermissionGate module="rooms" action="update">
            <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(`/rooms/${id}/edit`)}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />Sửa
            </Button>
          </PermissionGate>
          {canCreateTask && (
            <Button variant="outline" size="sm" className="h-8" onClick={() => setShowCreateTask(true)}>
              <Wrench className="mr-1.5 h-3.5 w-3.5" />Yêu cầu CV
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-amber-600 hover:text-amber-700"
            onClick={() => setShowResetDialog(true)}
            disabled={setupRoom.isPending}
          >
            <RotateCcw className={`mr-1.5 h-3.5 w-3.5 ${setupRoom.isPending ? 'animate-spin' : ''}`} />
            Reset
          </Button>
          <Button size="sm" className="h-8" onClick={() => navigate(`/rooms/${id}/check`)}>
            <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />Kiểm tra
          </Button>
        </div>
      </div>

      {/* Cleaning banner — chỉ khi cần */}
      {room.status === 'cleaning' && (
        <div className="flex-shrink-0">
          <CleaningRequestBanner roomId={id!} roomNumber={room.room_number} hotelId={room.hotel_id} />
        </div>
      )}

      {/* ROW 1 — 3 panel hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-shrink-0" style={{ minHeight: 320 }}>
        <PanelGuestBooking
          roomId={id!}
          hotelId={room.hotel_id}
          tenantId={room.tenant_id}
          roomNumber={room.room_number}
        />
        <PanelAssetStatus
          roomId={id!}
          items={items}
          checks={checks}
          onScrollToDelivery={scrollToTimeline}
        />
        <PanelPerformance
          roomId={id!}
          checks={checks}
          totalStandard={standardItems.length}
          missingCount={missingCount}
        />
      </div>

      {/* ROW 2 — 2 panel chính, fill phần còn lại, scroll nội bộ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-[360px]">
        <div className="lg:col-span-7 min-h-0">
          <PanelItems
            roomId={id!}
            items={items}
            roomType={room.room_type}
            onApplyStandards={() => applyStandards.mutate(id!)}
            isApplying={applyStandards.isPending}
          />
        </div>
        <div className="lg:col-span-5 min-h-0" ref={timelineRef}>
          <PanelTimeline roomId={id!} checks={checks} />
        </div>
      </div>

      {/* Reset confirmation */}
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
              <RotateCcw className="mr-2 h-4 w-4" />Reset phòng
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    <div className="flex flex-col gap-3 h-[calc(100vh-7rem)] min-h-[680px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-3 w-48 mt-1" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3" style={{ minHeight: 320 }}>
        <Skeleton className="h-full rounded-lg" />
        <Skeleton className="h-full rounded-lg" />
        <Skeleton className="h-full rounded-lg" />
      </div>
      <div className="grid grid-cols-12 gap-3 flex-1">
        <Skeleton className="col-span-7 h-full rounded-lg" />
        <Skeleton className="col-span-5 h-full rounded-lg" />
      </div>
    </div>
  )
}
