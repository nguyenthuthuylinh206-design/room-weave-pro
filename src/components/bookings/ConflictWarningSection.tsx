import { format, differenceInCalendarDays, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { AlertOctagon, Phone, Copy, LogOut, ArrowRightLeft, PhoneCall } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { ConflictingBooking } from '@/hooks/useBookingConflicts'

interface ConflictWarningSectionProps {
  nextBooking: ConflictingBooking
  onCheckoutNow?: () => void
  onTransferRoom?: () => void
  onContactGuest?: () => void
  showActions?: boolean
}

export function ConflictWarningSection({
  nextBooking,
  onCheckoutNow,
  onTransferRoom,
  onContactGuest,
  showActions = true,
}: ConflictWarningSectionProps) {
  const { toast } = useToast()
  
  const daysWaiting = differenceInCalendarDays(
    new Date(),
    parseISO(nextBooking.check_in_date)
  )
  
  const handleCopyPhone = () => {
    if (nextBooking.guest_phone) {
      navigator.clipboard.writeText(nextBooking.guest_phone)
      toast({
        title: 'Đã sao chép',
        description: `SĐT: ${nextBooking.guest_phone}`,
      })
    }
  }
  
  const handleCallGuest = () => {
    if (nextBooking.guest_phone) {
      window.open(`tel:${nextBooking.guest_phone}`, '_self')
    }
  }
  
  return (
    <div className="rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/30 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertOctagon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-red-700 dark:text-red-400">
            ⚠️ KHÁCH TIẾP THEO ĐÃ ĐẾN NGÀY CHECK-IN!
          </h4>
          
          <div className="text-sm space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tên khách:</span>
              <span className="font-medium">{nextBooking.guest_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ngày check-in:</span>
              <span className="font-medium text-red-600">
                {format(parseISO(nextBooking.check_in_date), 'dd/MM/yyyy', { locale: vi })}
                {daysWaiting > 0 && (
                  <span className="text-xs ml-1">(đã qua {daysWaiting} ngày)</span>
                )}
              </span>
            </div>
            {nextBooking.guest_phone && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Liên hệ:</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm">{nextBooking.guest_phone}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={handleCopyPhone}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-green-600"
                    onClick={handleCallGuest}
                  >
                    <Phone className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {nextBooking.deposit_amount && nextBooking.deposit_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tiền cọc:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(nextBooking.deposit_amount)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {showActions && (
        <div className="pt-2 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-muted-foreground mb-2">Chọn phương án xử lý:</p>
          <div className="flex flex-wrap gap-2">
            {onCheckoutNow && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="gap-1.5"
                onClick={onCheckoutNow}
              >
                <LogOut className="h-3.5 w-3.5" />
                Checkout ngay
              </Button>
            )}
            {onTransferRoom && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={onTransferRoom}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Chuyển phòng
              </Button>
            )}
            {onContactGuest && nextBooking.guest_phone && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={onContactGuest}
              >
                <PhoneCall className="h-3.5 w-3.5" />
                Liên hệ khách mới
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
