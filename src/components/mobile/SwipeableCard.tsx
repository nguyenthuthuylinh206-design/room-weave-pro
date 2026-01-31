import React, { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { triggerHaptic } from '@/lib/haptics'

interface SwipeableCardProps {
  children: React.ReactNode
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  swipeThreshold?: number
  className?: string
  hapticOnSwipe?: boolean
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  swipeThreshold = 100,
  className,
  hapticOnSwipe = true
}: SwipeableCardProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
    setIsSwiping(true)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return
    
    setTouchEnd(e.targetTouches[0].clientX)
    const distance = e.targetTouches[0].clientX - touchStart
    
    // Apply resistance to swipe - more resistance as distance increases
    const maxOffset = 150
    const resistance = 1 - Math.min(Math.abs(distance) / (maxOffset * 2), 0.6)
    setSwipeOffset(distance * resistance)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setSwipeOffset(0)
      setIsSwiping(false)
      return
    }

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe && onSwipeLeft) {
      if (hapticOnSwipe) triggerHaptic('medium')
      onSwipeLeft()
    }
    if (isRightSwipe && onSwipeRight) {
      if (hapticOnSwipe) triggerHaptic('medium')
      onSwipeRight()
    }

    // Reset
    setSwipeOffset(0)
    setTouchStart(null)
    setTouchEnd(null)
    setIsSwiping(false)
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
        transition: swipeOffset === 0 ? 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        willChange: isSwiping ? 'transform' : 'auto'
      }}
    >
      {children}
    </div>
  )
}
