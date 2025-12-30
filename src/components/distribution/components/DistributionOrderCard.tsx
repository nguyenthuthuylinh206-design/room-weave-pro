import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'
import { OrderStatusBadge } from './DistributionStatusBadge'
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
      className="border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors space-y-2"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono font-medium text-sm">{order.order_code}</span>
        <OrderStatusBadge status={order.status} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Phòng:</span>{' '}
          <span className="font-medium">{order.rooms_completed}/{order.total_rooms}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Sản phẩm:</span>{' '}
          <span className="font-medium">{order.total_items}</span>
        </div>
      </div>

      {order.status === 'in_progress' && (
        <Progress value={progress} className="h-1.5" />
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{order.assigned_to_name || 'Chưa phân công'}</span>
        <span>{format(new Date(order.created_at), 'dd/MM HH:mm', { locale: vi })}</span>
      </div>
    </div>
  )
}