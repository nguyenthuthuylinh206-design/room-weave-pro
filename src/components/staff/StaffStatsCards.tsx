import { UserCheck, UserX, Coffee, Wifi } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StaffStats {
  available: number
  busy: number
  break: number
  offline: number
  total: number
}

interface StaffStatsCardsProps {
  stats: StaffStats
  selectedStatus: string | null
  onStatusClick: (status: string | null) => void
}

const statusConfig = [
  {
    key: 'available',
    label: 'Rảnh',
    icon: UserCheck,
    color: 'text-green-600',
    bgHover: 'hover:bg-green-50',
    bgActive: 'bg-green-50 border-green-200',
  },
  {
    key: 'busy',
    label: 'Đang bận',
    icon: Wifi,
    color: 'text-red-600',
    bgHover: 'hover:bg-red-50',
    bgActive: 'bg-red-50 border-red-200',
  },
  {
    key: 'break',
    label: 'Nghỉ giải lao',
    icon: Coffee,
    color: 'text-amber-600',
    bgHover: 'hover:bg-amber-50',
    bgActive: 'bg-amber-50 border-amber-200',
  },
  {
    key: 'offline',
    label: 'Offline',
    icon: UserX,
    color: 'text-muted-foreground',
    bgHover: 'hover:bg-muted/50',
    bgActive: 'bg-muted/50 border-muted',
  },
]

export function StaffStatsCards({ stats, selectedStatus, onStatusClick }: StaffStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statusConfig.map(({ key, label, icon: Icon, color, bgHover, bgActive }) => {
        const count = stats[key as keyof StaffStats] as number
        const isSelected = selectedStatus === key
        
        return (
          <button
            key={key}
            type="button"
            onClick={() => onStatusClick(isSelected ? null : key)}
            className={cn(
              'flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
              isSelected ? bgActive : `bg-background ${bgHover}`
            )}
          >
            <div className={cn('p-2 rounded-full bg-background', color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
