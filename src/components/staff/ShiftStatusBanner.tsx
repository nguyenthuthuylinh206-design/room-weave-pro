import { Clock, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from 'react-i18next'
import {
  useMyStaffStatus,
  useShiftCheckIn,
  isCurrentlyOnShift,
} from '@/hooks/useShiftManagement'

/**
 * Compact banner that shows on all mobile pages when staff hasn't checked in yet.
 * Hidden when already on shift.
 */
export function ShiftStatusBanner() {
  const { t } = useTranslation('common')
  const { data: myStatus, isLoading } = useMyStaffStatus()
  const { mutate: checkIn, isPending } = useShiftCheckIn()

  const isOnShift = isCurrentlyOnShift(myStatus)

  // Don't show if loading or already on shift
  if (isLoading || isOnShift) return null

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
          disabled={isPending}
        >
          {isPending ? (
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
