import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  change?: {
    value: number | null
    label: string
  }
  description?: string
  onClick?: () => void
  isLoading?: boolean
  size?: 'default' | 'compact'
}

export function DashboardStatCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  description, 
  onClick,
  isLoading,
  size = 'default'
}: DashboardStatCardProps) {
  const isCompact = size === 'compact'
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1">
          <Skeleton className="h-3 w-16 mb-1" />
          <Skeleton className="h-5 w-12" />
        </div>
      </div>
    )
  }
  
  const changeColor = change?.value 
    ? change.value > 0 
      ? 'text-green-600 dark:text-green-500' 
      : change.value < 0 
        ? 'text-destructive' 
        : 'text-muted-foreground'
    : 'text-muted-foreground'
  
  const ChangeIcon = change?.value 
    ? change.value > 0 
      ? TrendingUp 
      : change.value < 0 
        ? TrendingDown 
        : Minus
    : null
  
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 border rounded-lg transition-colors",
        onClick && "cursor-pointer hover:bg-muted/50 hover:border-primary"
      )}
      onClick={onClick}
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground truncate">{title}</p>
        <p className={cn("font-bold", isCompact ? "text-lg" : "text-xl")}>{value}</p>
        
        {change && change.value !== null && (
          <div className={cn("flex items-center gap-1", changeColor, "text-[10px]")}>
            {ChangeIcon && <ChangeIcon className="h-2.5 w-2.5" />}
            <span className="font-medium">
              {change.value > 0 && '+'}
              {change.value.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}
        
        {description && (
          <p className="text-[10px] text-muted-foreground truncate">{description}</p>
        )}
      </div>
    </div>
  )
}
