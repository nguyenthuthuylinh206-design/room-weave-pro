import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'
import { OrderStatusText } from './DistributionStatusBadge'
import type { DistributionOrder } from '@/types/distribution.types'

interface DistributionOrderCardProps {
  order: DistributionOrder
  onClick?: () => void
}

export function DistributionOrderCard({ order, onClick }: DistributionOrderCardProps) {
  const progress = order.total_rooms > 0 
    ? Math.round((order.rooms_completed / order.total_rooms) * 100)
    : 0

  return (
    <div 
      className="border-b py-2.5 px-3 cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
    >
      {/* Row 1: Code, rooms, items, status */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono font-medium text-sm">{order.order_code}</span>
          <span className="text-xs text-muted-foreground">
            {order.rooms_completed}/{order.total_rooms} phòng
          </span>
          <span className="text-xs text-muted-foreground">
            {order.total_items} SP
          </span>
        </div>
        <OrderStatusText status={order.status} />
      </div>
      
      {/* Row 2: Assignee, date, progress */}
      <div className="flex items-center justify-between gap-2 mt-1">
        <span className="text-xs text-muted-foreground truncate">
          {order.assigned_to_name || 'Chưa phân công'} • {format(new Date(order.created_at), 'dd/MM HH:mm', { locale: vi })}
        </span>
        
        {order.status === 'in_progress' && (
          <div className="flex items-center gap-1.5">
            <Progress value={progress} className="w-12 h-1" />
            <span className="text-[10px] text-muted-foreground w-7">{progress}%</span>
          </div>
        )}
      </div>
    </div>
  )
}
