import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface HeroStatCardProps {
  title: string
  value: string
  change?: {
    value: number | null
    label: string
  }
  isLoading?: boolean
}

export function HeroStatCard({ 
  title, 
  value, 
  change,
  isLoading 
}: HeroStatCardProps) {
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-6 text-primary-foreground">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 bg-white/20" />
          <Skeleton className="h-10 w-48 bg-white/20" />
          <Skeleton className="h-5 w-40 bg-white/20" />
        </div>
      </Card>
    )
  }

  const hasChange = change?.value !== undefined && change.value !== null
  const isPositive = (change?.value || 0) > 0

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-5 text-primary-foreground border-0 shadow-lg">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4 blur-xl" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-white/20">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium opacity-90">{title}</span>
        </div>
        
        {/* Main Value - 32px typography */}
        <p className="text-[32px] leading-tight font-bold tracking-tight">
          {value}
        </p>
        
        {/* Change Indicator */}
        {hasChange && (
          <div 
            className={cn(
              "inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full text-sm font-medium",
              isPositive ? "bg-green-500/20" : "bg-red-500/20"
            )}
          >
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {isPositive ? '+' : ''}
              {change?.value?.toFixed(1)}% {change?.label}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
