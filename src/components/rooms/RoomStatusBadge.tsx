import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RoomStatus } from '@/types/rooms.types'

interface RoomStatusBadgeProps {
  status: RoomStatus
  className?: string
}

const statusConfig: Record<RoomStatus, { label: string; className: string }> = {
  vacant: {
    label: 'Trống',
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
  },
  occupied: {
    label: 'Có khách',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  },
  cleaning: {
    label: 'Đang dọn',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  },
  maintenance: {
    label: 'Bảo trì',
    className: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  },
  out_of_order: {
    label: 'Hỏng',
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
  },
}

export function RoomStatusBadge({ status, className }: RoomStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
