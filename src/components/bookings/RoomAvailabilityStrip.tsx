import { addDays, format, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import { cn } from '@/lib/utils'

interface Props {
  fromDate: string // yyyy-MM-dd
  days: number
  selectedIn?: string
  selectedOut?: string // exclusive
  isDateBooked: (d: string) => boolean
  onPickDate?: (d: string) => void
  isLoading?: boolean
}

/**
 * Mini-calendar dạng grid 7 cột hiển thị `days` ngày kế tiếp từ `fromDate`.
 * - Ô bận: đỏ
 * - Ô trong khoảng đang chọn: viền primary
 * - Click ô trống để set check-in mới
 */
export function RoomAvailabilityStrip({
  fromDate,
  days,
  selectedIn,
  selectedOut,
  isDateBooked,
  onPickDate,
  isLoading,
}: Props) {
  const start = parseISO(fromDate)
  const cells = Array.from({ length: days }, (_, i) => {
    const d = addDays(start, i)
    return {
      iso: format(d, 'yyyy-MM-dd'),
      dayNum: format(d, 'd'),
      dow: format(d, 'EEEEEE', { locale: vi }),
      isMonthStart: format(d, 'd') === '1' || i === 0,
      monthLabel: format(d, 'MM/yyyy'),
    }
  })

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Lịch phòng {days} ngày tới</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-muted border" /> Trống
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300" /> Đã đặt
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm ring-2 ring-primary bg-background" /> Đang chọn
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="h-24 rounded border bg-muted/30 animate-pulse" />
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c) => {
            const booked = isDateBooked(c.iso)
            const inRange =
              selectedIn && selectedOut && c.iso >= selectedIn && c.iso < selectedOut
            return (
              <button
                key={c.iso}
                type="button"
                disabled={booked}
                onClick={() => !booked && onPickDate?.(c.iso)}
                title={
                  booked
                    ? `${format(parseISO(c.iso), 'dd/MM/yyyy')} — Đã đặt`
                    : `${format(parseISO(c.iso), 'dd/MM/yyyy')} — Trống`
                }
                className={cn(
                  'h-10 rounded text-[11px] leading-tight flex flex-col items-center justify-center border transition-colors',
                  booked
                    ? 'bg-red-50 border-red-200 text-red-600 cursor-not-allowed'
                    : 'bg-muted hover:bg-accent border-transparent text-foreground cursor-pointer',
                  inRange && 'ring-2 ring-primary',
                )}
              >
                <span className="text-[9px] uppercase opacity-60">{c.dow}</span>
                <span className="font-medium">{c.dayNum}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
