import { 
  Clock, 
  ClipboardCheck,
  CheckCircle,
  XCircle,
  User,
  Package,
  TrendingDown,
  Calendar
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { AdjustmentWithDetails } from '@/types/inventory.types'

interface MobileAdjustmentCardProps {
  adjustment: AdjustmentWithDetails
  onClick?: () => void
  className?: string
}

const statusConfig = {
  draft: {
    icon: Clock,
    label: 'Nháp',
    variant: 'secondary' as const,
    color: 'text-muted-foreground',
  },
  in_progress: {
    icon: ClipboardCheck,
    label: 'Đang kiểm',
    variant: 'default' as const,
    color: 'text-primary',
  },
  completed: {
    icon: Clock,
    label: 'Hoàn thành',
    variant: 'secondary' as const,
    color: 'text-yellow-600',
  },
  approved: {
    icon: CheckCircle,
    label: 'Đã duyệt',
    variant: 'default' as const,
    color: 'text-green-600',
  },
  rejected: {
    icon: XCircle,
    label: 'Từ chối',
    variant: 'destructive' as const,
    color: 'text-destructive',
  },
}

const typeLabels: Record<string, string> = {
  inventory_check: '📋 Kiểm kê định kỳ',
  damage: '❌ Kiểm tra hư hỏng',
  loss: '🚫 Kiểm tra mất mát',
  correction: '🔧 Điều chỉnh số liệu',
}

export function MobileAdjustmentCard({ 
  adjustment, 
  onClick, 
  className 
}: MobileAdjustmentCardProps) {
  const config = statusConfig[adjustment.status as keyof typeof statusConfig]
  const StatusIcon = config.icon
  const typeLabel = typeLabels[adjustment.adjustment_type] || adjustment.adjustment_type

  return (
    <Card 
      className={cn(
        'p-4 active:scale-[0.98] transition-transform cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Header: Status + Date */}
        <div className="flex items-center justify-between">
          <Badge variant={config.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {format(new Date(adjustment.created_at), 'dd/MM/yyyy', { locale: vi })}
          </span>
        </div>

        {/* Type + Code */}
        <div>
          <div className="text-lg font-semibold mb-1">
            {typeLabel}
          </div>
          <div className="text-sm text-muted-foreground">
            {adjustment.adjustment_code}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{adjustment.total_items_checked || 0}</span>
            <span className="text-muted-foreground">items</span>
          </div>
          
          {adjustment.total_discrepancies && adjustment.total_discrepancies > 0 && (
            <div className="flex items-center gap-1.5 text-destructive">
              <TrendingDown className="h-4 w-4" />
              <span className="font-medium">{adjustment.total_discrepancies}</span>
              <span className="text-xs">sai lệch</span>
            </div>
          )}
        </div>

        {/* Value Changed (if any) */}
        {adjustment.total_value_difference && adjustment.total_value_difference !== 0 && (
          <div className={cn(
            'p-2 rounded-lg border',
            adjustment.total_value_difference > 0 
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
              : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
          )}>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Chênh lệch giá trị:</span>
              <span className={cn(
                'font-bold',
                adjustment.total_value_difference > 0 ? 'text-green-600' : 'text-red-600'
              )}>
                {adjustment.total_value_difference > 0 ? '+' : ''}
                {formatCurrency(adjustment.total_value_difference)}
              </span>
            </div>
          </div>
        )}

        {/* Creator Info */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10">
              {adjustment.created_by_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {adjustment.created_by_name || 'Không rõ'}
            </p>
          </div>
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {format(new Date(adjustment.scheduled_date), 'dd/MM', { locale: vi })}
          </span>
        </div>
      </div>
    </Card>
  )
}
