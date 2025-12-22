import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
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
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono font-medium">{order.order_code}</span>
          <OrderStatusBadge status={order.status} />
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
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
          <Progress value={progress} className="h-2" />
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {order.assigned_to_name || 'Chưa phân công'}
          </span>
          <span>
            {format(new Date(order.created_at), 'dd/MM HH:mm', { locale: vi })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
