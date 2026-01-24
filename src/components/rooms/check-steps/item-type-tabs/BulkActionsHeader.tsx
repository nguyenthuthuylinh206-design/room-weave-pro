import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface BulkActionsHeaderProps {
  totalItems: number
  checkedCount: number
  onMarkAllOk: () => void
  onResetAll?: () => void
  className?: string
}

/**
 * Compact header with progress + bulk actions for room check tabs
 */
export function BulkActionsHeader({
  totalItems,
  checkedCount,
  onMarkAllOk,
  onResetAll,
  className
}: BulkActionsHeaderProps) {
  const progressPercent = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0
  const isComplete = checkedCount === totalItems && totalItems > 0
  const remaining = totalItems - checkedCount

  return (
    <div className={cn(
      "flex items-center justify-between gap-2 py-2 px-1",
      className
    )}>
      {/* Progress indicator */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            "text-sm font-medium tabular-nums",
            isComplete ? "text-green-600" : "text-foreground"
          )}>
            {checkedCount}/{totalItems}
          </span>
          {isComplete && <Check className="h-4 w-4 text-green-600" />}
        </div>
        <Progress 
          value={progressPercent} 
          className={cn(
            "h-1.5 flex-1 max-w-24",
            isComplete && "[&>div]:bg-green-500"
          )}
        />
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-1">
        {remaining > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs border-green-500 text-green-600 hover:bg-green-50"
            onClick={onMarkAllOk}
          >
            <Check className="h-3 w-3 mr-1" />
            Tất cả OK
          </Button>
        )}
        {onResetAll && checkedCount > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground"
            onClick={onResetAll}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </div>
  )
}
