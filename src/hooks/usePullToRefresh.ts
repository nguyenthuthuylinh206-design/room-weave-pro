import { useState, useRef, useCallback, useEffect } from 'react'

export interface PullToRefreshOptions {
  onRefresh: () => Promise<void>
  threshold?: number
  maxPullDistance?: number
  enabled?: boolean
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPullDistance = 120,
  enabled = true
}: PullToRefreshOptions) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled || window.scrollY !== 0) return
    
    startY.current = e.touches[0].clientY
    setIsPulling(true)
  }, [enabled])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || !enabled || window.scrollY !== 0) return
    
    currentY.current = e.touches[0].clientY
    const distance = Math.max(0, currentY.current - startY.current)
    
    // Apply resistance effect as user pulls further
    const resistance = 0.5
    const adjustedDistance = Math.min(
      distance * resistance,
      maxPullDistance
    )
    
    setPullDistance(adjustedDistance)

    // Prevent default scroll if pulling down from top
    if (distance > 0) {
      e.preventDefault()
    }
  }, [isPulling, enabled, maxPullDistance])

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

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

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
