import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { differenceInCalendarDays, format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import type { TapeChartBooking, TapeChartRoom } from '@/hooks/useTapeChart'
import {
  getBarColor,
  getPaymentState,
  PAYMENT_LABEL,
  getSourceBadge,
} from '@/lib/tape-chart'
import {
  getRoomStatusMeta,
  canRoomCheckIn,
  isRoomDirty,
  isRoomBlockedForMaintenance,
} from '@/lib/roomStatus'
import {
  useBookingSheetDetails,
  formatIdType,
  vipLabel,
  actionLabel,
} from '@/hooks/useBookingSheetDetails'
import { Link2, AlertCircle, CheckCircle2, ImageIcon } from 'lucide-react'

interface Props {
  booking: TapeChartBooking | null
  room: TapeChartRoom | null
  groupBookings?: TapeChartBooking[]
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function TapeChartBookingSheet({
  booking,
  room,
  groupBookings,
  open,
  onOpenChange,
}: Props) {
  const navigate = useNavigate()

  const total = Number(booking?.total_amount) || 0
  const paid = Number(booking?.amount_paid) || 0
  const deposit = Number(booking?.deposit_amount) || 0
  const settled = paid + deposit
  const remaining = total - settled
  const paymentState = booking ? getPaymentState(booking) : null
  const colors = booking ? getBarColor(booking) : null
  const sourceBadge = getSourceBadge(booking?.booking_source)
  const roomMeta = room ? getRoomStatusMeta(room.status) : null

  const { data: details } = useBookingSheetDetails(booking?.id, open && !!booking)
  const breakdown = details?.breakdown
  const hasIdScan = !!details?.guest_id_image_url || !!details?.guest_id_number
  const crm = details?.crmGuest
  const vip = vipLabel(crm?.vip_level)

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

  const nights = useMemo(() => {
    if (!booking) return 0
    return Math.max(
      1,
      differenceInCalendarDays(
        parseISO(booking.check_out_date),
        parseISO(booking.check_in_date),
      ),
    )
  }, [booking])

  // ---- Operational warnings ----
  const warnings: { tone: 'red' | 'amber'; text: string }[] = []
  if (booking && room) {
    if (booking.status === 'confirmed') {
      if (isRoomBlockedForMaintenance(room.status)) {
        warnings.push({
          tone: 'red',
          text: `Phòng đang ${roomMeta?.label.toLowerCase()} — không thể nhận khách`,
        })
      } else if (isRoomDirty(room.status)) {
        warnings.push({
          tone: 'amber',
          text: 'Phòng đang bẩn — cần dọn trước khi nhận khách',
        })
      } else if (!canRoomCheckIn(room.status) && booking.status === 'confirmed') {
        warnings.push({
          tone: 'amber',
          text: `Phòng đang "${roomMeta?.label}" — kiểm tra trước khi nhận`,
        })
      }
    }
    if (booking.status === 'checked_out' && remaining > 1000) {
      warnings.push({
        tone: 'red',
        text: `Khách đã trả phòng nhưng còn nợ ${formatCurrency(remaining)}`,
      })
    }
  }

  // ---- Primary CTA label theo status ----
  const primaryCta = useMemo(() => {
    if (!booking) return { label: 'Mở booking', emphasize: false }
    if (booking.status === 'confirmed') {
      return { label: 'Tiếp tục nhận phòng', emphasize: true }
    }
    if (booking.status === 'checked_in') {
      return remaining > 1000
        ? { label: 'Thu tiền & trả phòng', emphasize: true }
        : { label: 'Trả phòng', emphasize: true }
    }
    return { label: 'Mở phiếu booking', emphasize: false }
  }, [booking, remaining])

  const goDetail = () => {
    if (!booking) return
    onOpenChange(false)
    navigate(`/bookings/${booking.id}`)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        {booking && (
          <>
            {/* ============== HEADER ============== */}
            <div className={cn('shrink-0 px-5 pt-5 pb-3', colors?.bg)}>
              <SheetHeader className="space-y-1 text-left">
                {/* Dòng 1: identifier + trạng thái */}
                <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide opacity-75">
                  <span className="font-semibold">Phòng {room?.room_number}</span>
                  {sourceBadge && (
                    <span className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px]">
                      {sourceBadge}
                    </span>
                  )}
                  <span className="ml-auto">{statusLabel}</span>
                </div>

                {/* Dòng 2: tên khách */}
                <SheetTitle className="truncate text-xl">
                  {booking.guest_name}
                </SheetTitle>

                {/* Dòng 3: phone tap-to-call + guest count */}
                <SheetDescription className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
                  {booking.guest_phone && (
                    <a
                      href={`tel:${booking.guest_phone}`}
                      className="font-medium text-foreground/90 underline-offset-2 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {booking.guest_phone}
                    </a>
                  )}
                  {booking.guest_count && <span>{booking.guest_count} khách</span>}
                  {paymentState && (
                    <span className="ml-auto opacity-75">
                      {PAYMENT_LABEL[paymentState]}
                    </span>
                  )}
                </SheetDescription>
              </SheetHeader>
            </div>

            {/* ============== WARNINGS ============== */}
            {warnings.length > 0 && (
              <div className="shrink-0 space-y-1 border-y bg-muted/40 px-5 py-2">
                {warnings.map((w, i) => (
                  <div
                    key={i}
                    className={cn(
                      'text-xs font-medium leading-snug',
                      w.tone === 'red' ? 'text-red-700' : 'text-amber-700',
                    )}
                  >
                    {w.text}
                  </div>
                ))}
              </div>
            )}

            {/* ============== BODY (scroll) ============== */}
            <div className="flex-1 overflow-y-auto">
              {/* Lưu trú — compact vertical timeline */}
              <section className="border-b px-5 py-4">
                <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Lưu trú
                </h3>
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-semibold tabular-nums">
                    {format(parseISO(booking.check_in_date), 'EEE dd/MM', {
                      locale: vi,
                    })}
                  </span>
                  <span className="h-px bg-border" />
                  <span className="tabular-nums text-muted-foreground">
                    {booking.expected_check_in_time?.slice(0, 5) || '14:00'}
                  </span>

                  <span className="col-span-3 py-0.5 text-[11px] text-muted-foreground">
                    {nights} đêm · {room?.room_type}
                  </span>

                  <span className="font-semibold tabular-nums">
                    {format(parseISO(booking.check_out_date), 'EEE dd/MM', {
                      locale: vi,
                    })}
                  </span>
                  <span className="h-px bg-border" />
                  <span className="tabular-nums text-muted-foreground">
                    {booking.expected_check_out_time?.slice(0, 5) || '12:00'}
                  </span>
                </div>

                {(booking.actual_check_in || booking.actual_check_out) && (
                  <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                    {booking.actual_check_in && (
                      <div>
                        Nhận thực tế:{' '}
                        <span className="font-medium text-foreground/80">
                          {format(parseISO(booking.actual_check_in), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    )}
                    {booking.actual_check_out && (
                      <div>
                        Trả thực tế:{' '}
                        <span className="font-medium text-foreground/80">
                          {format(parseISO(booking.actual_check_out), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Tài chính */}
              <section className="border-b px-5 py-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Tài chính
                  </h3>
                  <span className="text-base font-semibold tabular-nums">
                    {formatCurrency(total)}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  {total > 0 && nights > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Trung bình / đêm</span>
                      <span className="tabular-nums">
                        {formatCurrency(Math.round(total / nights))}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đã cọc</span>
                    <span className="tabular-nums">{formatCurrency(deposit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Đã thu</span>
                    <span className="tabular-nums">{formatCurrency(paid)}</span>
                  </div>
                </div>

                {remaining > 1000 && (
                  <div className="mt-2 flex items-baseline justify-between border-t pt-2">
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        booking.status === 'checked_out'
                          ? 'text-red-700'
                          : 'text-amber-700',
                      )}
                    >
                      {booking.status === 'checked_out' ? 'Còn nợ' : 'Còn phải thu'}
                    </span>
                    <span
                      className={cn(
                        'text-base font-bold tabular-nums',
                        booking.status === 'checked_out'
                          ? 'text-red-700'
                          : 'text-amber-700',
                      )}
                    >
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                )}

                {remaining <= 1000 && settled > 0 && (
                  <div className="mt-2 border-t pt-2 text-sm font-medium text-emerald-700">
                    Đã thanh toán đủ
                  </div>
                )}
              </section>

              {/* Nhóm đặt phòng */}
              {groupBookings && groupBookings.length > 1 && (
                <section className="border-b px-5 py-4">
                  <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Nhóm đặt phòng · {groupBookings.length} phòng
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {groupBookings.map((gb) => (
                      <button
                        key={gb.id}
                        type="button"
                        onClick={() => {
                          onOpenChange(false)
                          navigate(`/bookings/${gb.id}`)
                        }}
                        className={cn(
                          'rounded border px-2 py-1 text-xs hover:bg-accent',
                          gb.id === booking.id &&
                            'border-primary bg-accent font-semibold',
                        )}
                      >
                        {gb.guest_name}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Ghi chú */}
              {booking.notes && (
                <section className="border-b px-5 py-4">
                  <h3 className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ghi chú
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-foreground/90">
                    {booking.notes}
                  </p>
                </section>
              )}

              {/* Spacer cuối để footer không che */}
              <div className="h-2" />
            </div>

            {/* ============== STICKY FOOTER ============== */}
            <div className="shrink-0 border-t bg-background px-5 py-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Đóng
                </Button>
                <Button
                  className="flex-[2]"
                  variant={primaryCta.emphasize ? 'default' : 'secondary'}
                  onClick={goDetail}
                >
                  {primaryCta.label}
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
