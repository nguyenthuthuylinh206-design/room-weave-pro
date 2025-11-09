import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BatchStatus } from '@/types/laundry.types'

interface BatchStatusBadgeProps {
  status: BatchStatus
  className?: string
}

const statusConfig: Record<BatchStatus, { label: string; className: string }> = {
  delivered: {
    label: 'Đã giao',
    className: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  },
  washing: {
    label: 'Đang giặt',
    className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
  },
  ready: {
    label: 'Sẵn sàng',
    className: 'bg-green-100 text-green-800 hover:bg-green-200',
  },
  received: {
    label: 'Đã nhận',
    className: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-red-100 text-red-800 hover:bg-red-200',
  },
}

export function BatchStatusBadge({ status, className }: BatchStatusBadgeProps) {
  const config = statusConfig[status]
  
  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  )
}
