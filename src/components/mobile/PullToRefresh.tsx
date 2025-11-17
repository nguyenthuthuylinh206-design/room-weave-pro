import React from 'react'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
  maxPullDistance?: number
  enabled?: boolean
  className?: string
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  maxPullDistance = 120,
  enabled = true,
  className
}: PullToRefreshProps) {
  const {
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress,
    shouldRefresh
  } = usePullToRefresh({
    onRefresh,
    threshold,
    maxPullDistance,
    enabled
  })

  return (
    <div className={cn('relative', className)}>
      {/* Pull indicator */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 ease-out"
        style={{
          height: pullDistance,
          opacity: Math.min(pullProgress / 100, 1)
        }}
      >
        <div className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground',
          shouldRefresh && 'text-primary'
        )}>
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải...</span>
            </>
          ) : shouldRefresh ? (
            <span>Thả để làm mới</span>
          ) : (
            <span>Kéo xuống để làm mới</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`
        }}
      >
        {children}
      </div>
    </div>
  )
}
