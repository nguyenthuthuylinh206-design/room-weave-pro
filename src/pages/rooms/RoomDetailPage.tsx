import { useParams, useNavigate } from 'react-router-dom'
import { 
  Edit, 
  ClipboardCheck, 
  Printer, 
  Plus,
  AlertCircle,
  CheckCircle2,
  Wind,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from '@/components/rooms/RoomStatusBadge'
import { RoomItemsList } from '@/components/rooms/RoomItemsList'
import { EnhancedCheckHistory } from '@/components/rooms/EnhancedCheckHistory'
import { RoomHealthScore } from '@/components/rooms/RoomHealthScore'
import { useRoom } from '@/hooks/useRooms'
import { formatCurrency } from '@/lib/utils'

export function RoomDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading } = useRoom(id)
  
  if (isLoading) {
    return <RoomDetailSkeleton />
  }
  
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Không tìm thấy phòng</h3>
        <Button onClick={() => navigate('/rooms')} className="mt-4">
          Quay lại danh sách
        </Button>
      </div>
    )
  }
  
  // Destructure data from useRoom
  const { room, hotel, items, recent_checks: checks } = data
  
  const totalItems = items.length
  const completeItems = items.filter(item => 
    !item.standard_quantity || item.quantity >= item.standard_quantity
  ).length
  const missingCount = items.filter(item => 
    item.standard_quantity && item.quantity < item.standard_quantity
  ).length
  
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Phòng ${room.room_number}`}
        description={`${room.room_type} - Tầng ${room.floor}`}
        action={{
          label: 'Kiểm tra phòng',
          icon: ClipboardCheck,
          onClick: () => navigate(`/rooms/${id}/check`),
        }}
      >
        <Button
          variant="outline"
          onClick={() => navigate(`/rooms/${id}/edit`)}
        >
          <Edit className="mr-2 h-4 w-4" />
          Sửa thông tin
        </Button>
      </PageHeader>
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Room Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Thông tin phòng</CardTitle>
                <RoomStatusBadge status={room.status as import('@/types/rooms.types').RoomStatus} />
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Số phòng</dt>
                  <dd className="text-2xl font-bold">{room.room_number}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Loại phòng</dt>
                  <dd className="text-lg font-medium capitalize">{room.room_type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Tầng</dt>
                  <dd className="text-lg">Tầng {room.floor}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Diện tích</dt>
                  <dd className="text-lg">{room.area_sqm ? `${room.area_sqm} m²` : 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Loại giường</dt>
                  <dd className="text-lg capitalize">{room.bed_type || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Số khách tối đa</dt>
                  <dd className="text-lg">{room.max_guests} người</dd>
                </div>
                {room.view_type && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">View</dt>
                    <dd className="text-lg capitalize">{room.view_type}</dd>
                  </div>
                )}
                {room.base_price && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Giá cơ bản</dt>
                    <dd className="text-lg font-semibold">{formatCurrency(room.base_price)}/đêm</dd>
                  </div>
                )}
              </dl>
              
              {room.amenities && room.amenities.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm font-medium text-muted-foreground mb-2">Tiện ích</dt>
                  <div className="flex flex-wrap gap-2">
                    {room.amenities.map((amenity: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {room.notes && (
                <div className="mt-4 pt-4 border-t">
                  <dt className="text-sm font-medium text-muted-foreground mb-1">Ghi chú</dt>
                  <dd className="text-sm">{room.notes}</dd>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Room Items */}
          <Card>
            <CardHeader>
              <CardTitle>Đồ dùng trong phòng</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">
                    Tất cả ({totalItems})
                  </TabsTrigger>
                  <TabsTrigger value="complete">
                    Đầy đủ ({completeItems})
                  </TabsTrigger>
                  <TabsTrigger value="missing">
                    Thiếu ({missingCount})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="mt-4">
                  <RoomItemsList items={items} roomId={id!} />
                </TabsContent>
                
                <TabsContent value="complete" className="mt-4">
                  <RoomItemsList 
                    items={items.filter(item => 
                      !item.standard_quantity || item.quantity >= item.standard_quantity
                    )} 
                    roomId={id!}
                  />
                </TabsContent>
                
                <TabsContent value="missing" className="mt-4">
                  <RoomItemsList 
                    items={items.filter(item => 
                      item.standard_quantity && item.quantity < item.standard_quantity
                    )} 
                    roomId={id!}
                    showMissing
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4">
            <RoomHealthScore 
              checks={checks}
              totalItems={totalItems}
              missingItems={missingCount}
            />
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tổng đồ dùng</p>
                    <p className="text-2xl font-bold">{totalItems}</p>
                  </div>
                  <div className="rounded-full bg-blue-100 p-3">
                    <CheckCircle2 className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Đầy đủ</p>
                    <p className="text-2xl font-bold text-green-600">{completeItems}</p>
                  </div>
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {missingCount > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Thiếu</p>
                      <p className="text-2xl font-bold text-red-600">{missingCount}</p>
                    </div>
                    <div className="rounded-full bg-red-100 p-3">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Check History */}
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử kiểm tra</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedCheckHistory checks={checks} />
            </CardContent>
          </Card>
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Thao tác nhanh</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/rooms/${id}/check`)}
              >
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Kiểm tra phòng
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => window.print()}
              >
                <Printer className="mr-2 h-4 w-4" />
                In danh sách đồ dùng
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function RoomDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  )
}
