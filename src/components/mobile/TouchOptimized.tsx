import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Minimum touch target size: 48x48px (WCAG 2.1 AA)
export const TOUCH_TARGET_SIZE = 48

interface TouchButtonProps extends ButtonProps {
  touchOptimized?: boolean
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
  ({ className, touchOptimized = true, size, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size={size}
        className={cn(
          touchOptimized && [
            'min-h-[48px] min-w-[48px]',
            'touch-manipulation', // Prevents double-tap zoom
            'active:scale-95 transition-transform duration-100'
          ],
          className
        )}
        {...props}
      />
    )
  }
)
TouchButton.displayName = 'TouchButton'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  threshold?: number
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  className = ''
}: SwipeableCardProps) {
  const [touchStart, setTouchStart] = React.useState<number | null>(null)
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > threshold
    const isRightSwipe = distance < -threshold

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight()
    }
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={cn('touch-pan-y', className)}
    >
      {children}
    </div>
  )
}

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  threshold?: number
}

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = React.useState(false)
  const [pullDistance, setPullDistance] = React.useState(0)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const startY = React.useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      setIsPulling(true)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPulling && window.scrollY === 0) {
      const currentY = e.touches[0].clientY
      const distance = Math.max(0, currentY - startY.current)
      setPullDistance(Math.min(distance, threshold))
    }
  }

  const handleTouchEnd = async () => {
    if (isPulling && pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setIsPulling(false)
    setPullDistance(0)
  }

  const pullProgress = (pullDistance / threshold) * 100

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      {(isPulling || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center py-2 transition-opacity"
          style={{ opacity: pullProgress / 100 }}
        >
          <div className={cn(
            "h-8 w-8 rounded-full border-2 border-primary",
            isRefreshing && "animate-spin border-t-transparent"
          )} />
        </div>
      )}
      {children}
    </div>
  )
}
