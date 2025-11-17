import React, { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  swipeThreshold?: number
  className?: string
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  className
}: SwipeableCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
    if (touchStart !== null) {
      const distance = e.targetTouches[0].clientX - touchStart
      // Apply resistance to swipe
      const resistance = 0.4
      setSwipeOffset(distance * resistance)
    }
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0)
      return
    }

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight()
    }

    // Reset
    setSwipeOffset(0)
    setTouchStart(null)
    setTouchEnd(null)
  }

  return (
    <div
      ref={cardRef}
      className={cn('touch-pan-y', className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none'
      }}
    >
      {children}
    </div>
  )
}
