import { Clock, Truck, CheckCircle, XCircle, PackageCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { DistributionOrderStatus, DistributionRoomStatus } from '@/types/distribution.types'

const ORDER_STATUS_CONFIG: Record<DistributionOrderStatus, { 
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: typeof Clock 
}> = {
  pending: { label: 'Chờ giao', variant: 'outline', icon: Clock },
  released: { label: 'Đã giao cho NV', variant: 'secondary', icon: PackageCheck },
  in_progress: { label: 'Đang giao', variant: 'default', icon: Truck },
  completed: { label: 'Hoàn thành', variant: 'secondary', icon: CheckCircle },
  cancelled: { label: 'Đã hủy', variant: 'destructive', icon: XCircle },
}

const ROOM_STATUS_CONFIG: Record<DistributionRoomStatus, { 
  label: string
  className: string
}> = {
  pending: { label: 'Chờ xác nhận', className: 'bg-muted text-muted-foreground' },
  delivered: { label: 'Đang giao', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  confirmed: { label: 'Đã giao', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
}

interface OrderStatusBadgeProps {
  status: DistributionOrderStatus
  showIcon?: boolean
}

export function OrderStatusBadge({ status, showIcon = true }: OrderStatusBadgeProps) {
  const config = ORDER_STATUS_CONFIG[status]
  if (!config) return null
  
  const Icon = config.icon
  
  return (
    <Badge variant={config.variant}>
      {showIcon && <Icon className="h-3 w-3 mr-1" />}
      {config.label}
    </Badge>
  )
}

interface RoomStatusBadgeProps {
  status: DistributionRoomStatus
}

export function RoomStatusBadge({ status }: RoomStatusBadgeProps) {
  const config = ROOM_STATUS_CONFIG[status]
  if (!config) return null
  
  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}

// Export configs for use elsewhere
export { ORDER_STATUS_CONFIG, ROOM_STATUS_CONFIG }
