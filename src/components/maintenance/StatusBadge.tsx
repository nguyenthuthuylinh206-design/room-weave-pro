import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  className?: string
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = {
    pending: {
      label: 'Chờ xử lý',
      className: 'bg-gray-500 text-white',
    },
    assigned: {
      label: 'Đã gán',
      className: 'bg-blue-500 text-white',
    },
    in_progress: {
      label: 'Đang xử lý',
      className: 'bg-yellow-500 text-white',
    },
    completed: {
      label: 'Hoàn thành',
      className: 'bg-green-500 text-white',
    },
    cancelled: {
      label: 'Đã hủy',
      className: 'bg-red-500 text-white',
    },
  }

  const { label, className: badgeClass } = config[status]

  return (
    <Badge className={cn(badgeClass, className)}>
      {label}
    </Badge>
  )
}
