import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Truck, CheckCircle, Clock, XCircle, Package, ChevronRight, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoomDistributionHistory } from '@/hooks/useRoomDistributionHistory'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface RoomDistributionHistoryProps {
  roomId: string
}

const STATUS_CONFIG = {
  pending: { label: 'Chờ giao', icon: Clock, variant: 'secondary' as const, color: 'text-muted-foreground' },
  delivered: { label: 'Đang giao', icon: Truck, variant: 'default' as const, color: 'text-blue-600' },
  confirmed: { label: 'Đã xác nhận', icon: CheckCircle, variant: 'default' as const, color: 'text-green-600' },
  rejected: { label: 'Từ chối', icon: XCircle, variant: 'destructive' as const, color: 'text-destructive' }
}

export function RoomDistributionHistory({ roomId }: RoomDistributionHistoryProps) {
  const { t } = useTranslation(['distribution', 'common'])
  const { data: history, isLoading } = useRoomDistributionHistory(roomId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Lịch sử giao hàng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Lịch sử giao hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Chưa có phiếu giao hàng nào</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Lịch sử giao hàng
          <Badge variant="secondary" className="ml-auto">{history.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map(item => {
          const config = STATUS_CONFIG[item.room_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
          const StatusIcon = config.icon

          return (
            <Link 
              key={item.order_id} 
              to={`/inventory/distribution/${item.order_id}`}
              className="block"
            >
              <div className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                "hover:bg-accent/50 cursor-pointer"
              )}>
                <div className={cn("mt-0.5", config.color)}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{item.order_code}</span>
                    <Badge variant={config.variant} className="text-xs">
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {item.total_items} loại • {item.total_quantity} sản phẩm
                    </p>
                    
                    {item.confirmed_at ? (
                      <p>
                        Xác nhận bởi <span className="font-medium">{item.confirmed_by_name}</span> • {' '}
                        {format(new Date(item.confirmed_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                      </p>
                    ) : (
                      <p>
                        Tạo lúc {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                        {item.assigned_to_name && ` • Giao cho ${item.assigned_to_name}`}
                      </p>
                    )}

                    {item.rejection_reason && (
                      <p className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-3 w-3" />
                        Lý do: {item.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          )
        })}
      </CardContent>
    </Card>
  )
}
