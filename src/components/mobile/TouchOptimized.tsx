import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptics';
import {
  SWIPE_THRESHOLD_PX,
  SWIPE_VELOCITY_MIN,
  SWIPE_ANGLE_RATIO,
} from '@/lib/touch-constants';

// Minimum touch target size: 48x48px (WCAG 2.1 AA)
export const TOUCH_TARGET_SIZE = 48;
interface TouchButtonProps extends ButtonProps {
  touchOptimized?: boolean;
}
export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(({
  className,
  touchOptimized = true,
  size,
  onClick,
  ...props
}, ref) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (touchOptimized) {
      triggerHaptic('light');
    }
    onClick?.(e);
  };
  
  return (
    <Button
      ref={ref}
      className={cn(
        touchOptimized && 'min-h-[48px] min-w-[48px]',
        className
      )}
      size={size}
      onClick={handleClick}
      {...props}
    />
  );
});
TouchButton.displayName = 'TouchButton';
interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  className?: string;
}
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  className = ''
}: SwipeableCardProps) {
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };
  return <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className={cn('touch-pan-y', className)}>
      {children}
    </div>;
}
// PullToRefresh is now exported from src/components/mobile/PullToRefresh.tsx
// Re-export for backward compatibility
export { PullToRefresh } from './PullToRefresh'