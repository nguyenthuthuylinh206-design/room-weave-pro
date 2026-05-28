import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn, formatCurrency } from '@/lib/utils'
import type { TapeChartBooking, TapeChartRoom } from '@/hooks/useTapeChart'
import { getBarColor, getPaymentState, PAYMENT_LABEL, getSourceBadge } from '@/lib/tape-chart'

interface Props {
  booking: TapeChartBooking | null
  room: TapeChartRoom | null
  groupBookings?: TapeChartBooking[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TapeChartBookingSheet({ booking, room, groupBookings, open, onOpenChange }: Props) {
  const navigate = useNavigate()

  const total = Number(booking?.total_amount) || 0
  const paid = Number(booking?.amount_paid) || 0
  const deposit = Number(booking?.deposit_amount) || 0
  const remaining = total - paid - deposit
  const paymentState = booking ? getPaymentState(booking) : null
  const colors = booking ? getBarColor(booking) : null
  const sourceBadge = getSourceBadge(booking?.booking_source)

  const statusLabel = useMemo(() => {
    if (!booking) return ''
    switch (booking.status) {
      case 'confirmed':
        return 'Đã xác nhận'
      case 'checked_in':
        return 'Đang lưu trú'
      case 'checked_out':
        return 'Đã trả phòng'
      default:
        return booking.status
    }
  }, [booking])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto p-0 sm:max-w-md">
        {booking && (
          <>
            <div className={cn('px-5 pt-5 pb-4', colors?.bg)}>
              <SheetHeader className="space-y-1.5 text-left">
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide opacity-70">
                  <span>Phòng {room?.room_number}</span>
                  {sourceBadge && (
                    <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">
                      {sourceBadge}
                    </span>
                  )}
                  <span className="ml-auto">{statusLabel}</span>
                </div>
                <SheetTitle className="text-xl">{booking.guest_name}</SheetTitle>
                <SheetDescription className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  {booking.guest_phone && <span>{booking.guest_phone}</span>}
                  {booking.guest_count && <span>{booking.guest_count} khách</span>}
                </SheetDescription>
              </SheetHeader>
            </div>

            <div className="space-y-4 p-5">
              {/* Lưu trú */}
              <section className="space-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lưu trú
                </h3>
                <div className="flex items-baseline gap-2 text-sm">
                  <span className="font-semibold">
                    {format(parseISO(booking.check_in_date), 'EEE dd/MM', { locale: vi })}
                  </span>
                  <span className="text-muted-foreground">
                    {booking.expected_check_in_time?.slice(0, 5) || '14:00'}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-semibold">
                    {format(parseISO(booking.check_out_date), 'EEE dd/MM', { locale: vi })}
                  </span>
                  <span className="text-muted-foreground">
                    {booking.expected_check_out_time?.slice(0, 5) || '12:00'}
                  </span>
                </div>
                {booking.actual_check_in && (
                  <p className="text-xs text-blue-700">
                    Nhận thực tế: {format(parseISO(booking.actual_check_in), 'dd/MM HH:mm')}
                  </p>
                )}
                {booking.actual_check_out && (
                  <p className="text-xs text-slate-600">
                    Trả thực tế: {format(parseISO(booking.actual_check_out), 'dd/MM HH:mm')}
                  </p>
                )}
              </section>

              <Separator />

              {/* Tài chính */}
              <section className="space-y-1.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Tài chính
                </h3>
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">Tổng</span>
                  <span className="text-right font-semibold">{formatCurrency(total)}</span>
                  <span className="text-muted-foreground">Đã cọc</span>
                  <span className="text-right">{formatCurrency(deposit)}</span>
                  <span className="text-muted-foreground">Đã thu</span>
                  <span className="text-right">{formatCurrency(paid)}</span>
                  {remaining > 1000 && (
                    <>
                      <span className="text-red-600">Còn nợ</span>
                      <span className="text-right font-semibold text-red-600">
                        {formatCurrency(remaining)}
                      </span>
                    </>
                  )}
                </div>
                {paymentState && (
                  <p className="text-xs text-muted-foreground">{PAYMENT_LABEL[paymentState]}</p>
                )}
              </section>

              {groupBookings && groupBookings.length > 1 && (
                <>
                  <Separator />
                  <section className="space-y-1.5">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Nhóm đặt phòng ({groupBookings.length} phòng)
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {groupBookings.map((gb) => (
                        <button
                          key={gb.id}
                          type="button"
                          onClick={() => navigate(`/bookings/${gb.id}`)}
                          className={cn(
                            'rounded border px-2 py-0.5 text-xs hover:bg-accent',
                            gb.id === booking.id && 'bg-accent font-semibold',
                          )}
                        >
                          {gb.guest_name}
                        </button>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {booking.notes && (
                <>
                  <Separator />
                  <section className="space-y-1">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Ghi chú
                    </h3>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{booking.notes}</p>
                  </section>
                </>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Đóng
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => {
                    onOpenChange(false)
                    navigate(`/bookings/${booking.id}`)
                  }}
                >
                  Xem chi tiết
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
