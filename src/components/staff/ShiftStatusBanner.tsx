import { Clock, CheckCircle, ChevronRight, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import {
  useMyStaffStatus,
  useShiftCheckIn,
  useShiftCheckOut,
  isCurrentlyOnShift,
  formatShiftStartTime,
  calculateShiftDuration,
} from '@/hooks/useShiftManagement'

/**
 * Compact banner that shows shift status on all mobile pages.
 * - Yellow banner when not on shift (with check-in button)
 * - Green banner when on shift (with check-out button)
 */
export function ShiftStatusBanner() {
  const { t } = useTranslation('common')
  const { data: myStatus, isLoading } = useMyStaffStatus()
  const { mutate: checkIn, isPending: isCheckingIn } = useShiftCheckIn()
  const { mutate: checkOut, isPending: isCheckingOut } = useShiftCheckOut()

  const isOnShift = isCurrentlyOnShift(myStatus)

  // Only hide while loading
  if (isLoading) return null

  // On shift - Green banner with check-out button
  if (isOnShift) {
    const startTime = formatShiftStartTime(myStatus?.shift_start_at)
    const duration = calculateShiftDuration(myStatus?.shift_start_at)

    return (
      <div className="bg-green-50 dark:bg-green-950 border-b border-green-200 dark:border-green-800 px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {t('shift.onShift', 'Đang trong ca')} • {startTime}
              {duration && ` (${duration})`}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
            onClick={() => checkOut()}
            disabled={isCheckingOut}
          >
            {isCheckingOut ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <LogOut className="h-3 w-3 mr-1" />
                {t('shift.checkOut', 'Kết thúc ca')}
              </>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Not on shift - Yellow banner with check-in button
  return (
    <div className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {t('shift.notOnShift', 'Bạn chưa vào ca hôm nay')}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900"
          onClick={() => checkIn()}
          disabled={isCheckingIn}
        >
          {isCheckingIn ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {t('shift.checkIn', 'Vào ca ngay')}
              <ChevronRight className="h-3 w-3 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
