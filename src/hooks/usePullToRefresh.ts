import { useState, useRef, useCallback, useEffect, RefObject } from 'react'

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPullDistance?: number
  enabled?: boolean
  containerRef?: RefObject<HTMLElement>
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  enabled = true,
  containerRef
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)

  const getScrollTop = useCallback(() => {
    if (containerRef?.current) {
      return containerRef.current.scrollTop
    }
    return window.scrollY
  }, [containerRef])

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || getScrollTop() !== 0) return
    
    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [enabled, getScrollTop])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !enabled || getScrollTop() !== 0) {
      if (isPulling) {
        setIsPulling(false)
        setPullDistance(0)
      }
      return
    }
    
    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    // Apply resistance effect as user pulls further
    const resistance = 0.5
    const adjustedDistance = Math.min(
      distance * resistance,
      maxPullDistance
    )
    
    setPullDistance(adjustedDistance)

    // Only prevent default if we're actually pulling down
    if (distance > 10 && adjustedDistance > 0) {
      e.preventDefault()
    }
  }, [isPulling, enabled, maxPullDistance, getScrollTop])

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || !enabled) return

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setIsPulling(false)
    setPullDistance(0)
  }, [isPulling, enabled, pullDistance, threshold, isRefreshing, onRefresh])

  useEffect(() => {
    if (!enabled) return

    const target = containerRef?.current || document

    // Use passive: true for start/end, passive: false only for move when needed
    target.addEventListener('touchstart', handleTouchStart as EventListener, { passive: true })
    target.addEventListener('touchmove', handleTouchMove as EventListener, { passive: false })
    target.addEventListener('touchend', handleTouchEnd as EventListener, { passive: true })

    return () => {
      target.removeEventListener('touchstart', handleTouchStart as EventListener)
      target.removeEventListener('touchmove', handleTouchMove as EventListener)
      target.removeEventListener('touchend', handleTouchEnd as EventListener)
    }
  }, [enabled, containerRef, handleTouchStart, handleTouchMove, handleTouchEnd])

  const pullProgress = Math.min((pullDistance / threshold) * 100, 100)
  const shouldRefresh = pullDistance >= threshold

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    pullProgress,
    shouldRefresh
  }
}
