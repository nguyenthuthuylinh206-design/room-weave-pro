import { useNavigate } from 'react-router-dom'
import { 
  Users, 
  Bed, 
  Maximize, 
  CheckCircle, 
  AlertTriangle,
  Wind,
} from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from './RoomStatusBadge'
import { formatCurrency } from '@/lib/utils'
import type { RoomWithStats, RoomStatus } from '@/types/rooms.types'

interface RoomGridProps {
  rooms: RoomWithStats[]
  isLoading: boolean
}

export function RoomGrid({ rooms, isLoading }: RoomGridProps) {
  const navigate = useNavigate()
  
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    )
  }
  
  if (rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Bed className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">Không tìm thấy phòng</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thử thay đổi bộ lọc hoặc thêm phòng mới
        </p>
      </div>
    )
  }
  
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {rooms.map((room) => (
        <Card
          key={room.id}
          className="cursor-pointer transition-all hover:shadow-lg"
          onClick={() => navigate(`/rooms/${room.id}`)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">{room.room_number}</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {room.room_type}
                </p>
              </div>
              <RoomStatusBadge status={room.status as RoomStatus} />
            </div>
          </CardHeader>
          
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>{room.max_guests}</span>
              </div>
              <div className="flex items-center gap-1">
                <Bed className="h-3 w-3 text-muted-foreground" />
                <span className="capitalize">{room.bed_type || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Maximize className="h-3 w-3 text-muted-foreground" />
                <span>{room.area_sqm || 'N/A'} m²</span>
              </div>
            </div>
            
            <div className="space-y-1 border-t pt-2 text-xs">
              {room.missing_items === 0 ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>Đồ dùng đầy đủ</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Thiếu {room.missing_items} items</span>
                </div>
              )}
              
              {room.items_in_laundry > 0 && (
                <div className="flex items-center gap-1 text-cyan-600">
                  <Wind className="h-3 w-3" />
                  <span>{room.items_in_laundry} items đang giặt</span>
                </div>
              )}
            </div>
            
            {room.base_price && (
              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground">Giá cơ bản</p>
                <p className="font-semibold">{formatCurrency(room.base_price)}/đêm</p>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/rooms/${room.id}`)
              }}
            >
              Xem chi tiết
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/rooms/${room.id}/check`)
              }}
            >
              Kiểm tra
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
