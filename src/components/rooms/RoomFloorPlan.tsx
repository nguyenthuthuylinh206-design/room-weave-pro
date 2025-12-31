import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
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

const statusIcons = {
  vacant: DoorOpen,
  occupied: Users,
  cleaning: Sparkles,
  maintenance: Wrench,
  out_of_order: AlertTriangle,
  check_in: LogIn,
  check_out: LogOut
}

const statusConfig = {
  vacant: { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  occupied: { color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500' },
  cleaning: { color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  maintenance: { color: 'text-orange-600 dark:text-orange-400', dot: 'bg-orange-500' },
  out_of_order: { color: 'text-red-600 dark:text-red-400', dot: 'bg-red-500' },
  check_in: { color: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
  check_out: { color: 'text-purple-600 dark:text-purple-400', dot: 'bg-purple-500' }
}

export function RoomFloorPlan() {
  const { t } = useTranslation(['rooms'])
  const navigate = useNavigate()
  const { data: floorPlan, isLoading } = useFloorPlan()

  const getConfig = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.vacant
    const Icon = statusIcons[status as keyof typeof statusIcons] || DoorOpen
    return { ...config, icon: Icon, label: t(`status.${status}`) }
  }
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-3">
            <Skeleton className="h-5 w-24 mb-3" />
            <div className="flex gap-2 flex-wrap">
              {[...Array(8)].map((_, j) => (
                <Skeleton key={j} className="h-16 w-20" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  
  if (!floorPlan || Object.keys(floorPlan).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{t('floorPlan.noData')}</p>
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
    <div className="space-y-4">
      {/* Legend & Summary */}
      <div className="border rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">{t('floorPlan.statusLegend')}</span>
          <span className="text-xs text-muted-foreground">
            {t('floorPlan.totalRooms', { count: totalRooms })}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {Object.keys(statusConfig).map((key) => {
            const count = statusCounts[key] || 0
            const config = getConfig(key)
            const Icon = config.icon
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                <span className={cn("w-2 h-2 rounded-full", config.dot)} />
                <Icon className={cn("h-3 w-3", config.color)} />
                <span className={config.color}>{config.label}</span>
                <span className="text-muted-foreground">({count})</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Floor Plans */}
      {floors.map((floor) => {
        const rooms = floorPlan[floor]
        const floorStats = rooms.reduce((acc, room) => {
          acc[room.status] = (acc[room.status] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        return (
          <div key={floor} className="border rounded-lg">
            {/* Floor Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {t('floorPlan.floor', { number: floor })}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({rooms.length} {t('floorPlan.rooms')})
                </span>
              </div>
              <div className="flex gap-2">
                {Object.entries(floorStats).map(([status, count]) => {
                  const config = getConfig(status)
                  return (
                    <span key={status} className={cn("text-xs", config.color)}>
                      {config.label}: {count}
                    </span>
                  )
                })}
              </div>
            </div>
            
            {/* Rooms Grid */}
            <div className="p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                {rooms.map((room) => {
                  const config = getConfig(room.status)
                  const Icon = config.icon
                  
                  return (
                    <button
                      key={room.id}
                      onClick={() => navigate(`/rooms/${room.id}`)}
                      className={cn(
                        "relative flex flex-col items-center p-2 rounded-lg border transition-all",
                        "hover:bg-muted/50 hover:shadow-sm active:scale-95"
                      )}
                    >
                      {/* Status dot */}
                      <span className={cn("absolute top-1 right-1 w-2 h-2 rounded-full", config.dot)} />
                      
                      {/* Room Number */}
                      <span className="text-sm font-semibold">{room.room_number}</span>
                      
                      {/* Room Type */}
                      <span className="text-[10px] text-muted-foreground truncate max-w-full">
                        {t(`roomTypes.${room.room_type}`, { defaultValue: room.room_type })}
                      </span>
                      
                      {/* Status */}
                      <div className={cn("flex items-center gap-0.5 mt-0.5", config.color)}>
                        <Icon className="h-2.5 w-2.5" />
                        <span className="text-[9px]">{config.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
