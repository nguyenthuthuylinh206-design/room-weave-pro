import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { useFloorPlan } from '@/hooks/useFloorPlan'
import { cn } from '@/lib/utils'
import { 
  Building2, 
  Users, 
  Sparkles, 
  Wrench, 
  AlertTriangle,
  DoorOpen,
  LogIn,
  LogOut
} from 'lucide-react'

const statusConfig = {
  vacant: {
    label: 'Trống',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: DoorOpen
  },
  occupied: {
    label: 'Có khách',
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: Users
  },
  cleaning: {
    label: 'Dọn dẹp',
    color: 'bg-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400',
    icon: Sparkles
  },
  maintenance: {
    label: 'Bảo trì',
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-700 dark:text-orange-400',
    icon: Wrench
  },
  out_of_order: {
    label: 'Ngừng sử dụng',
    color: 'bg-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-500',
    textColor: 'text-red-700 dark:text-red-400',
    icon: AlertTriangle
  },
  check_in: {
    label: 'Check In',
    color: 'bg-indigo-500',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    borderColor: 'border-indigo-500',
    textColor: 'text-indigo-700 dark:text-indigo-400',
    icon: LogIn
  },
  check_out: {
    label: 'Check Out',
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: LogOut
  }
}

const roomTypeLabels: Record<string, string> = {
  standard: 'Standard',
  deluxe: 'Deluxe',
  suite: 'Suite',
  vip: 'VIP'
}

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
              <div className="flex gap-3 flex-wrap">
                {[...Array(8)].map((_, j) => (
                  <Skeleton key={j} className="h-24 w-28" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }
  
  if (!floorPlan || Object.keys(floorPlan).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Không có dữ liệu sơ đồ tầng</p>
      </div>
    )
  }
  
  // Sort floors descending
  const floors = Object.keys(floorPlan).sort((a, b) => parseInt(b) - parseInt(a))
  
  // Calculate stats
  const totalRooms = floors.reduce((acc, floor) => acc + floorPlan[floor].length, 0)
  const statusCounts = floors.reduce((acc, floor) => {
    floorPlan[floor].forEach(room => {
      acc[room.status] = (acc[room.status] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)
  
  return (
    <div className="space-y-6">
      {/* Legend & Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Chú thích trạng thái</h3>
              <Badge variant="outline" className="text-sm">
                Tổng: {totalRooms} phòng
              </Badge>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(statusConfig).map(([key, config]) => {
                const count = statusCounts[key] || 0
                const Icon = config.icon
                return (
                  <div 
                    key={key}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border",
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    <Icon className={cn("h-4 w-4", config.textColor)} />
                    <span className={cn("text-sm font-medium", config.textColor)}>
                      {config.label}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={cn("ml-1 text-xs", config.textColor)}
                    >
                      {count}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Floor Plans */}
      {floors.map((floor) => {
        const rooms = floorPlan[floor]
        const floorStats = rooms.reduce((acc, room) => {
          acc[room.status] = (acc[room.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        return (
          <Card key={floor}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Tầng {floor}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {rooms.length} phòng
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {Object.entries(floorStats).map(([status, count]) => {
                    const config = statusConfig[status as keyof typeof statusConfig]
                    if (!config) return null
                    return (
                      <Badge 
                        key={status}
                        variant="outline"
                        className={cn("text-xs", config.textColor, config.borderColor)}
                      >
                        {config.label}: {count}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                {rooms.map((room) => {
                  const config = statusConfig[room.status as keyof typeof statusConfig] || statusConfig.vacant
                  const Icon = config.icon
                  
                  return (
                    <button
                      key={room.id}
                      onClick={() => navigate(`/rooms/${room.id}`)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                        "hover:shadow-lg hover:scale-105 active:scale-100",
                        config.bgColor,
                        config.borderColor
                      )}
                    >
                      {/* Status Icon */}
                      <div className={cn(
                        "absolute -top-2 -right-2 p-1.5 rounded-full",
                        config.color
                      )}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      
                      {/* Room Number */}
                      <div className={cn(
                        "text-xl font-bold",
                        config.textColor
                      )}>
                        {room.room_number}
                      </div>
                      
                      {/* Room Type */}
                      <Badge 
                        variant="secondary" 
                        className="mt-1 text-[10px] px-2 py-0"
                      >
                        {roomTypeLabels[room.room_type] || room.room_type}
                      </Badge>
                      
                      {/* Status Label */}
                      <span className={cn(
                        "mt-2 text-[10px] font-medium",
                        config.textColor
                      )}>
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
