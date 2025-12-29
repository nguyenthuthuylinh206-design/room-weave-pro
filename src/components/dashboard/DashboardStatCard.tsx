import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
      <Card className={cn(isCompact && "py-1")}>
        <CardHeader className={cn(
          "flex flex-row items-center justify-between space-y-0",
          isCompact ? "pb-1 pt-3 px-4" : "pb-2"
        )}>
          <Skeleton className={cn("w-32", isCompact ? "h-3" : "h-4")} />
          <Skeleton className={cn("rounded", isCompact ? "h-3 w-3" : "h-4 w-4")} />
        </CardHeader>
        <CardContent className={cn(isCompact && "px-4 pb-3")}>
          <Skeleton className={cn("mb-1.5", isCompact ? "h-6 w-28" : "h-8 w-40")} />
          <Skeleton className={cn(isCompact ? "h-2.5 w-20" : "h-3 w-24")} />
        </CardContent>
      </Card>
    )
  }
  
  const changeColor = change?.value 
    ? change.value > 0 
      ? 'text-green-600 dark:text-green-500' 
      : change.value < 0 
        ? 'text-red-600 dark:text-red-500' 
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
    <Card 
      className={cn(
        "transition-all",
        isCompact && "py-1",
        onClick && "cursor-pointer hover:shadow-md hover:border-primary"
      )}
      onClick={onClick}
    >
      <CardHeader className={cn(
        "flex flex-row items-center justify-between space-y-0",
        isCompact ? "pb-1 pt-3 px-4" : "pb-2"
      )}>
        <CardTitle className={cn(
          "font-medium text-muted-foreground",
          isCompact ? "text-xs" : "text-sm"
        )}>
          {title}
        </CardTitle>
        <Icon className={cn(
          "text-muted-foreground",
          isCompact ? "h-3.5 w-3.5" : "h-4 w-4"
        )} />
      </CardHeader>
      <CardContent className={cn(isCompact && "px-4 pb-3")}>
        <div className={cn(
          "font-bold",
          isCompact ? "text-xl" : "text-2xl"
        )}>
          {value}
        </div>
        
        {change && change.value !== null && (
          <div className={cn(
            "flex items-center gap-1 mt-1",
            changeColor,
            isCompact ? "text-[10px]" : "text-xs"
          )}>
            {ChangeIcon && <ChangeIcon className={cn(isCompact ? "h-2.5 w-2.5" : "h-3 w-3")} />}
            <span className="font-medium">
              {change.value > 0 && '+'}
              {change.value.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}
        
        {description && (
          <p className={cn(
            "text-muted-foreground mt-0.5",
            isCompact ? "text-[10px]" : "text-xs"
          )}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
