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
}

export function DashboardStatCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  description, 
  onClick,
  isLoading 
}: DashboardStatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-3 w-24" />
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
        "transition-all hover:shadow-md",
        onClick && "cursor-pointer hover:border-primary"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        
        {change && change.value !== null && (
          <div className={cn("flex items-center gap-1 text-xs mt-1", changeColor)}>
            {ChangeIcon && <ChangeIcon className="h-3 w-3" />}
            <span className="font-medium">
              {change.value > 0 && '+'}
              {change.value.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">{change.label}</span>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
