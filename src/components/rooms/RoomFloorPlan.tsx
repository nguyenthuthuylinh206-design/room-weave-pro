import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { RoomStatusBadge } from './RoomStatusBadge'
import { useFloorPlan } from '@/hooks/useFloorPlan'
import { cn } from '@/lib/utils'

export function RoomFloorPlan() {
  const navigate = useNavigate()
  const { data: floorPlan, isLoading } = useFloorPlan()
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {[...Array(10)].map((_, j) => (
                  <Skeleton key={j} className="h-20 w-24" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  if (!floorPlan) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Không có dữ liệu sơ đồ tầng</p>
      </div>
    )
  }
  
  // Sort floors descending
  const floors = Object.keys(floorPlan).sort((a, b) => parseInt(b) - parseInt(a))
  
  return (
    <div className="space-y-6">
      {floors.map((floor) => (
        <Card key={floor}>
          <CardHeader>
            <CardTitle>Tầng {floor}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              {floorPlan[floor].map((room) => (
                <button
                  key={room.id}
                  onClick={() => navigate(`/rooms/${room.id}`)}
                  className={cn(
                    "relative flex h-20 w-24 flex-col items-center justify-center rounded-lg border-2 transition-all hover:shadow-md",
                    room.status === 'vacant' && "border-green-500 bg-green-50 hover:bg-green-100",
                    room.status === 'occupied' && "border-blue-500 bg-blue-50 hover:bg-blue-100",
                    room.status === 'cleaning' && "border-yellow-500 bg-yellow-50 hover:bg-yellow-100",
                    room.status === 'maintenance' && "border-orange-500 bg-orange-50 hover:bg-orange-100",
                    room.status === 'out_of_order' && "border-red-500 bg-red-50 hover:bg-red-100"
                  )}
                >
                  <div className="text-lg font-bold">{room.room_number}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {room.room_type}
                  </div>
                  <RoomStatusBadge 
                    status={room.status} 
                    className="absolute -top-2 -right-2 text-xs px-1.5 py-0.5"
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
