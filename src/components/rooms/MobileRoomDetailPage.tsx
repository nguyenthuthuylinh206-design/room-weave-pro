import { useParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { 
  ArrowLeft,
  Edit, 
  ClipboardCheck, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  DoorOpen,
  Bed,
  Users,
  Maximize2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { RoomItemsList } from '@/components/rooms/RoomItemsList'
import { EnhancedCheckHistory } from '@/components/rooms/EnhancedCheckHistory'
import { PullToRefresh } from '@/components/mobile/PullToRefresh'
import { useRoom } from '@/hooks/useRooms'
import { useApplyStandards } from '@/hooks/useRoomStandards'
import { formatCurrency } from '@/lib/utils'
import type { RoomStatus } from '@/types/rooms.types'

export function MobileRoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useRoom(id)
  const applyStandards = useApplyStandards()

  const handleRefresh = async () => {
    await refetch()
  }
  
  if (isLoading) {
    return <MobileRoomDetailSkeleton />
  }
  
  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Chi tiết phòng</h1>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">Không tìm thấy phòng</h3>
          <Button onClick={() => navigate('/rooms')} className="mt-4">
            Quay lại danh sách
          </Button>
        </div>
      </div>
    )
  }
  
  const { room, items, recent_checks: checks } = data
  
  const standardItems = items.filter(item => item.has_standard)
  const totalItems = standardItems.length
  const completeItems = standardItems.filter(item => item.missing_quantity === 0).length
  const missingCount = standardItems.filter(item => item.missing_quantity > 0).length
  const totalMissingQuantity = standardItems.reduce((sum, item) => sum + item.missing_quantity, 0)

  return (
    <PullToRefresh onRefresh={handleRefresh} className="flex flex-col min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">Phòng {room.room_number}</h1>
                <RoomStatusBadge status={room.status as RoomStatus} />
              </div>
              <p className="text-xs text-muted-foreground capitalize">
                {room.room_type} • Tầng {room.floor}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/rooms/${id}/edit`)}>
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalItems}</p>
              <p className="text-xs text-muted-foreground">Tổng đồ dùng</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{completeItems}</p>
              <p className="text-xs text-muted-foreground">Đầy đủ</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{missingCount}</p>
              <p className="text-xs text-muted-foreground">Thiếu</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="flex-1">
        <TabsList className="w-full justify-start px-4 bg-transparent border-b rounded-none h-auto gap-4">
          <TabsTrigger 
            value="info" 
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
          >
            Thông tin
          </TabsTrigger>
          <TabsTrigger 
            value="items"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
          >
            Đồ dùng
            {missingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {missingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="history"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-2"
          >
            Lịch sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="flex-1 p-4 space-y-4 m-0">
          {/* Room Info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thông tin phòng</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Số phòng</p>
                    <p className="font-semibold">{room.room_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Bed className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Loại giường</p>
                    <p className="font-medium capitalize">{room.bed_type || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sức chứa</p>
                    <p className="font-medium">{room.max_guests} khách</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Diện tích</p>
                    <p className="font-medium">{room.area_sqm ? `${room.area_sqm} m²` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              {room.base_price && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Giá cơ bản</p>
                  <p className="font-semibold text-lg">{formatCurrency(room.base_price)}/đêm</p>
                </div>
              )}

              {room.amenities && room.amenities.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Tiện ích</p>
                  <div className="flex flex-wrap gap-1">
                    {room.amenities.map((amenity: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {room.notes && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                  <p className="text-sm">{room.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Photos */}
          {checks && checks.length > 0 && checks[0].photos && Array.isArray(checks[0].photos) && checks[0].photos.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Ảnh kiểm tra gần nhất</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {new Date(checks[0].checked_at).toLocaleDateString('vi-VN')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {(checks[0].photos as string[]).slice(0, 3).map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative aspect-square rounded-lg overflow-hidden border"
                    >
                      <img 
                        src={photo} 
                        alt={`Ảnh ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
                {(checks[0].photos as string[]).length > 3 && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    +{(checks[0].photos as string[]).length - 3} ảnh khác
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="flex-1 p-4 m-0">
          {totalItems === 0 && (
            <Card className="mb-4 border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="p-3 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Chưa có đồ dùng
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Nhấn "Áp dụng chuẩn" bên dưới để thêm đồ dùng theo chuẩn loại phòng {room.room_type}.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          <RoomItemsList items={items} roomId={id!} />
        </TabsContent>

        <TabsContent value="history" className="flex-1 p-4 m-0">
          <EnhancedCheckHistory checks={checks} />
        </TabsContent>
      </Tabs>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-3 safe-area-bottom">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => applyStandards.mutate(id!)}
            disabled={applyStandards.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${applyStandards.isPending ? 'animate-spin' : ''}`} />
            {totalItems === 0 ? 'Áp dụng chuẩn' : 'Đồng bộ chuẩn'}
          </Button>
          <Button 
            className="flex-1"
            onClick={() => navigate(`/rooms/${id}/check`)}
          >
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Kiểm tra phòng
          </Button>
        </div>
      </div>
    </PullToRefresh>
  )
}

function MobileRoomDetailSkeleton() {
  const navigate = useNavigate()
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/rooms')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}
