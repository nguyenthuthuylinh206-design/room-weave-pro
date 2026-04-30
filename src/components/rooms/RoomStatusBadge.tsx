import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { RoomStatus } from '@/types/rooms.types'

interface RoomStatusBadgeProps {
  status: RoomStatus
  className?: string
}

const statusStyles: Partial<Record<RoomStatus, string>> = {
  vacant: 'bg-green-100 text-green-800 hover:bg-green-200',
  occupied: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  check_in: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  check_out: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
  cleaning: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  maintenance: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  out_of_order: 'bg-red-100 text-red-800 hover:bg-red-200',
}

export function RoomStatusBadge({ status, className }: RoomStatusBadgeProps) {
  const { t } = useTranslation('rooms')
  
  return (
    <Badge className={cn(statusStyles[status], className)}>
      {t(`status.${status}`)}
    </Badge>
  )
}
