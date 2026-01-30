import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { Clock, AlertTriangle, Check } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { DEFAULT_PRICING_RULES, parseTimeToHours } from '@/lib/bookingCalculations'
import { cn } from '@/lib/utils'

interface CheckInConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guestName: string
  roomNumber: string
  actualCheckInTime: string
  roomPrice: number
  suggestedCharge: number
  bookingType?: 'daily' | 'hourly' | 'monthly'
  bookingHours?: number
  bookingMonths?: number
  onConfirm: (finalCharge: number, adjustmentNote?: string) => void
  isLoading?: boolean
}

// Surcharge tier definitions
const EARLY_CHECKIN_TIERS = [
  { id: 'before5', label: 'Trước 05:00', percent: 100, description: '= 1 đêm', minHour: 0, maxHour: 5 },
  { id: '5to9', label: '05:00 - 09:00', percent: 50, description: '', minHour: 5, maxHour: 9 },
  { id: '9to14', label: '09:00 - 14:00', percent: 30, description: '', minHour: 9, maxHour: 14 },
  { id: 'after14', label: 'Sau 14:00', percent: 0, description: 'Miễn phí', minHour: 14, maxHour: 24 },
]

export function CheckInConfirmDialog({
  open,
  onOpenChange,
  guestName,
  roomNumber,
  actualCheckInTime,
  roomPrice,
  suggestedCharge,
  bookingType = 'daily',
  bookingHours,
  bookingMonths,
  onConfirm,
  isLoading = false,
}: CheckInConfirmDialogProps) {
  const [adjustedCharge, setAdjustedCharge] = useState<number>(suggestedCharge)
  const [adjustmentNote, setAdjustmentNote] = useState('')

  // Reset when dialog opens
  useMemo(() => {
    if (open) {
      setAdjustedCharge(suggestedCharge)
      setAdjustmentNote('')
    }
  }, [open, suggestedCharge])

  // Determine which tier applies - only for daily bookings
  const currentHour = parseTimeToHours(actualCheckInTime)
  const activeTier = bookingType === 'daily' 
    ? EARLY_CHECKIN_TIERS.find(tier => currentHour >= tier.minHour && currentHour < tier.maxHour)
    : null

  // Check if charge was adjusted from suggested
  const isAdjusted = adjustedCharge !== suggestedCharge
  const needsNote = isAdjusted && !adjustmentNote.trim()

  const handleConfirm = () => {
    onConfirm(adjustedCharge, isAdjusted ? adjustmentNote : undefined)
  }

  const handleWaive = () => {
    setAdjustedCharge(0)
  }

  const handleResetToStandard = () => {
    setAdjustedCharge(suggestedCharge)
    setAdjustmentNote('')
  }

  // For hourly/monthly, show simple confirmation without surcharge table
  const isNonDailyBooking = bookingType !== 'daily'

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {isNonDailyBooking ? 'Xác nhận Check-in' : 'Xác nhận Check-in sớm'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {/* Guest & Room Info */}
              <div className="flex justify-between text-sm">
                <span>Khách: <strong>{guestName}</strong></span>
                <span>Phòng: <strong>{roomNumber}</strong></span>
              </div>

              {/* Booking Type Info */}
              {isNonDailyBooking ? (
                <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {bookingType === 'hourly' ? (
                        <>Đặt phòng theo giờ: <strong>{bookingHours} giờ</strong></>
                      ) : (
                        <>Đặt phòng theo tháng: <strong>{bookingMonths} tháng</strong></>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-green-600">
                      {bookingType === 'hourly' 
                        ? 'Không áp dụng phụ thu check-in sớm'
                        : 'Không áp dụng phụ thu thời gian'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Time Info - Only for daily */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Giờ check-in tiêu chuẩn: <strong>14:00</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <span>Giờ check-in thực tế: <strong className="text-amber-600">{actualCheckInTime}</strong></span>
                  </div>

                  <Separator />

                  {/* Surcharge Tiers Table - Only for daily */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 text-xs font-medium">
                      BẢNG PHỤ THU CHECK-IN SỚM
                    </div>
                    <div className="divide-y">
                      {EARLY_CHECKIN_TIERS.map((tier) => {
                        const isActive = tier.id === activeTier?.id
                        const tierAmount = Math.round(roomPrice * tier.percent / 100)
                        return (
                          <div
                            key={tier.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 text-sm",
                              isActive && "bg-amber-50 dark:bg-amber-950/30 border-l-2 border-l-amber-500"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isActive && <Check className="h-4 w-4 text-amber-600" />}
                              <span className={cn(isActive && "font-medium")}>{tier.label}</span>
                              {tier.description && (
                                <span className="text-xs text-muted-foreground">({tier.description})</span>
                              )}
                            </div>
                            <span className={cn("font-mono text-xs", isActive && "font-medium text-amber-600")}>
                              {tier.percent}% = {formatCurrency(tierAmount)}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Editable Charge - Only for daily bookings */}
              {!isNonDailyBooking && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Giá phòng</Label>
                      <span className="font-medium">{formatCurrency(roomPrice)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <Label className="text-sm">
                          Phụ thu áp dụng ({activeTier?.percent || 0}%)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="w-32 h-8 text-right font-mono"
                            value={adjustedCharge > 0 ? adjustedCharge.toString() : ''}
                            onChange={(e) => {
                              const value = e.target.value.replace(/[^0-9]/g, '')
                              setAdjustedCharge(parseInt(value) || 0)
                            }}
                            placeholder="0"
                          />
                          <span className="text-sm text-muted-foreground">đ</span>
                        </div>
                      </div>
                      {adjustedCharge > 0 && (
                        <p className="text-xs text-muted-foreground text-right">
                          {formatCurrency(adjustedCharge)}
                        </p>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleWaive}
                        className="flex-1 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950"
                        disabled={adjustedCharge === 0}
                      >
                        Miễn phí
                      </Button>
                      {isAdjusted && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetToStandard}
                          className="flex-1"
                        >
                          Theo chuẩn ({formatCurrency(suggestedCharge)})
                        </Button>
                      )}
                    </div>

                    {/* Adjustment Note (required if changed) */}
                    {isAdjusted && (
                      <div className="space-y-1.5">
                        <Label className="text-xs text-amber-600 dark:text-amber-400">
                          Lý do điều chỉnh {needsNote && '*'}
                        </Label>
                        <Textarea
                          placeholder="VD: Khách quen, đặt phòng lâu dài..."
                          className="h-16 text-sm"
                          value={adjustmentNote}
                          onChange={(e) => setAdjustmentNote(e.target.value)}
                        />
                        {needsNote && (
                          <p className="text-xs text-destructive">Vui lòng nhập lý do điều chỉnh phí</p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || needsNote}
          >
            {isLoading ? 'Đang xử lý...' : 'Xác nhận Check-in'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
