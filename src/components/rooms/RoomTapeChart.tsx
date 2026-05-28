import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDays, format, parseISO, isToday, isSameDay, differenceInCalendarDays } from 'date-fns'
import { vi } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatCurrency } from '@/lib/utils'
import { useTapeChart, type TapeChartBooking, type TapeChartRoom } from '@/hooks/useTapeChart'
import { getRoomStatusMeta, normalizeRoomStatus } from '@/lib/roomStatus'
import { useIsMobile } from '@/hooks/use-mobile'

const DESKTOP_DAYS = 14
const TABLET_DAYS = 7
const MOBILE_DAYS = 3

const ROOM_COL_W = 132 // px sticky left column
const CELL_W_DESKTOP = 96
const CELL_W_MOBILE = 108
const ROW_H = 56

interface BookingLayout {
  booking: TapeChartBooking
  startIdx: number      // 0..days-1
  spanCells: number     // số cell phủ
  startHalf: boolean    // bắt đầu nửa cell (check-in trong ngày)
  endHalf: boolean      // kết thúc nửa cell (check-out trong ngày)
}

function bookingColorClasses(b: TapeChartBooking): string {
  const debt = (Number(b.total_amount) || 0) - (Number(b.amount_paid) || 0) - (Number(b.deposit_amount) || 0)
  if (b.status === 'checked_out') {
    return debt > 0
      ? 'bg-red-100 border-red-300 text-red-900 hover:bg-red-200'
      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
  }
  if (b.status === 'checked_in') {
    return 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200'
  }
  // confirmed
  return debt > 0
    ? 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200'
    : 'bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200'
}

function buildRoomLayouts(
  bookings: TapeChartBooking[],
  startDate: Date,
  days: number,
): BookingLayout[] {
  const end = addDays(startDate, days)
  return bookings
    .map<BookingLayout | null>((b) => {
      const ci = parseISO(b.check_in_date)
      const co = parseISO(b.check_out_date)
      if (co <= startDate || ci >= end) return null
      const clampedStart = ci < startDate ? startDate : ci
      const clampedEnd = co > end ? end : co
      const startIdx = differenceInCalendarDays(clampedStart, startDate)
      const spanCells = Math.max(1, differenceInCalendarDays(clampedEnd, clampedStart))
      return {
        booking: b,
        startIdx,
        spanCells,
        startHalf: ci >= startDate, // bắt đầu thật trong window → vẽ lùi nửa cell
        endHalf: co <= end,         // kết thúc thật trong window → vẽ cụt nửa cell
      }
    })
    .filter((x): x is BookingLayout => x !== null)
}

interface RoomRowProps {
  room: TapeChartRoom
  layouts: BookingLayout[]
  days: number
  cellW: number
  startDate: Date
  onBookingClick: (b: TapeChartBooking) => void
  onEmptyCellClick: (room: TapeChartRoom, date: Date) => void
}

function RoomRow({ room, layouts, days, cellW, startDate, onBookingClick, onEmptyCellClick }: RoomRowProps) {
  const meta = getRoomStatusMeta(room.status)
  const v2 = normalizeRoomStatus(room.status)
  const blocked = v2 === 'out_of_order' || v2 === 'out_of_service'

  // Mảng đánh dấu cell nào đã bị chiếm bởi booking để biết cell trống
  const occupied = new Array(days).fill(false)
  layouts.forEach((l) => {
    for (let i = l.startIdx; i < l.startIdx + l.spanCells; i++) {
      if (i >= 0 && i < days) occupied[i] = true
    }
  })

  return (
    <div className="flex border-b last:border-b-0 hover:bg-muted/20" style={{ height: ROW_H }}>
      {/* Sticky room column */}
      <div
        className="sticky left-0 z-10 flex items-center gap-2 border-r bg-background px-3"
        style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.bg, 'border', meta.border)} />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{room.room_number}</div>
          <div className="truncate text-[10px] capitalize text-muted-foreground">
            {room.room_type}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative flex" style={{ width: days * cellW }}>
        {/* Background cells */}
        {Array.from({ length: days }).map((_, i) => {
          const date = addDays(startDate, i)
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const today = isToday(date)
          const cellOccupied = occupied[i]
          return (
            <button
              key={i}
              type="button"
              disabled={cellOccupied || blocked}
              onClick={() => onEmptyCellClick(room, date)}
              className={cn(
                'border-r last:border-r-0 transition-colors',
                isWeekend && 'bg-muted/30',
                today && 'bg-primary/5',
                blocked && 'bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_8px)] cursor-not-allowed',
                !cellOccupied && !blocked && 'hover:bg-accent/40 cursor-pointer',
                cellOccupied && 'cursor-default',
              )}
              style={{ width: cellW, height: ROW_H }}
              aria-label={`${room.room_number} ${format(date, 'dd/MM')}`}
            />
          )
        })}

        {/* Booking bars overlay */}
        {layouts.map((l) => {
          const offsetPx = l.startIdx * cellW + (l.startHalf ? cellW / 2 : 0)
          const lengthPx = l.spanCells * cellW - (l.startHalf ? cellW / 2 : 0) - (l.endHalf ? cellW / 2 : 0)
          const colors = bookingColorClasses(l.booking)
          const debt =
            (Number(l.booking.total_amount) || 0) -
            (Number(l.booking.amount_paid) || 0) -
            (Number(l.booking.deposit_amount) || 0)
          return (
            <TooltipProvider key={l.booking.id} delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onBookingClick(l.booking)
                    }}
                    className={cn(
                      'absolute top-1.5 flex items-center gap-1 overflow-hidden rounded-md border px-2 text-left text-[11px] font-medium shadow-sm transition-all',
                      colors,
                    )}
                    style={{
                      left: offsetPx + 2,
                      width: lengthPx - 4,
                      height: ROW_H - 12,
                    }}
                  >
                    <span className="truncate">{l.booking.guest_name}</span>
                    {l.booking.guest_count ? (
                      <span className="shrink-0 opacity-70">· {l.booking.guest_count}</span>
                    ) : null}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1 text-xs">
                    <div className="font-semibold">{l.booking.guest_name}</div>
                    <div className="text-muted-foreground">
                      {format(parseISO(l.booking.check_in_date), 'dd/MM', { locale: vi })}
                      {l.booking.expected_check_in_time ? ` ${l.booking.expected_check_in_time.slice(0, 5)}` : ''}
                      {' → '}
                      {format(parseISO(l.booking.check_out_date), 'dd/MM', { locale: vi })}
                      {l.booking.expected_check_out_time ? ` ${l.booking.expected_check_out_time.slice(0, 5)}` : ''}
                    </div>
                    {l.booking.guest_phone && <div>SĐT: {l.booking.guest_phone}</div>}
                    {l.booking.booking_source && (
                      <div>Nguồn: <span className="capitalize">{l.booking.booking_source}</span></div>
                    )}
                    <div>
                      Tổng: {formatCurrency(Number(l.booking.total_amount) || 0)}
                    </div>
                    {debt > 0 && (
                      <div className="text-red-600">
                        Còn nợ: {formatCurrency(debt)}
                      </div>
                    )}
                    {l.booking.status === 'checked_in' && (
                      <div className="text-blue-700">Đang lưu trú</div>
                    )}
                    {l.booking.status === 'checked_out' && (
                      <div className="text-slate-600">Đã trả phòng</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )
        })}
      </div>
    </div>
  )
}

export function RoomTapeChart() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const defaultDays = isMobile ? MOBILE_DAYS : DESKTOP_DAYS
  const cellW = isMobile ? CELL_W_MOBILE : CELL_W_DESKTOP

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [days, setDays] = useState<number>(defaultDays)

  const startStr = format(startDate, 'yyyy-MM-dd')
  const { data, isLoading } = useTapeChart(startStr, days)

  const roomsByFloor = useMemo(() => {
    const rooms = data?.rooms || []
    const grouped = new Map<number, TapeChartRoom[]>()
    rooms.forEach((r) => {
      const arr = grouped.get(r.floor) || []
      arr.push(r)
      grouped.set(r.floor, arr)
    })
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, rooms]) => ({
        floor,
        rooms: rooms.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true })),
      }))
  }, [data?.rooms])

  const bookingsByRoom = useMemo(() => {
    const map = new Map<string, BookingLayout[]>()
    const bookings = data?.bookings || []
    bookings.forEach((b) => {
      const layout = buildRoomLayouts([b], startDate, days)[0]
      if (!layout) return
      const arr = map.get(b.room_id) || []
      arr.push(layout)
      map.set(b.room_id, arr)
    })
    return map
  }, [data?.bookings, startDate, days])

  // KPI
  const kpis = useMemo(() => {
    const bookings = data?.bookings || []
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    const arrivals = bookings.filter((b) => b.check_in_date === todayStr).length
    const departures = bookings.filter((b) => b.check_out_date === todayStr).length
    const inHouse = bookings.filter(
      (b) => b.status === 'checked_in' && b.check_in_date <= todayStr && b.check_out_date > todayStr,
    ).length
    const totalRooms = data?.rooms.length || 0
    const occupancy = totalRooms ? Math.round((inHouse / totalRooms) * 100) : 0
    return { arrivals, departures, inHouse, totalRooms, occupancy }
  }, [data])

  const onBookingClick = (b: TapeChartBooking) => {
    navigate(`/bookings/${b.id}`)
  }

  const onEmptyCellClick = (room: TapeChartRoom, date: Date) => {
    const d = format(date, 'yyyy-MM-dd')
    navigate(`/bookings?action=create&room_id=${room.id}&check_in_date=${d}`)
  }

  const shiftDate = (n: number) => setStartDate((d) => addDays(d, n))

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!data || data.rooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center">
        <Building2 className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Chưa có phòng nào để hiển thị tape chart.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Toolbar: navigation + window selector + KPI */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" onClick={() => shiftDate(-days)} className="h-8 px-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const d = new Date()
              d.setHours(0, 0, 0, 0)
              setStartDate(d)
            }}
            className="h-8 px-3 text-xs"
          >
            Hôm nay
          </Button>
          <Button size="sm" variant="outline" onClick={() => shiftDate(days)} className="h-8 px-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 text-sm font-medium">
            {format(startDate, 'dd/MM', { locale: vi })} – {format(addDays(startDate, days - 1), 'dd/MM/yyyy', { locale: vi })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            {[3, 7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {d} ngày
              </button>
            ))}
          </div>

          <div className="hidden gap-4 text-xs sm:flex">
            <div>
              <span className="text-muted-foreground">Đang ở</span>{' '}
              <span className="font-semibold">{kpis.inHouse}/{kpis.totalRooms}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Đến</span>{' '}
              <span className="font-semibold text-emerald-600">{kpis.arrivals}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Đi</span>{' '}
              <span className="font-semibold text-blue-600">{kpis.departures}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Lấp đầy</span>{' '}
              <span className="font-semibold">{kpis.occupancy}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded border border-emerald-400 bg-emerald-100" /> Đã xác nhận
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded border border-blue-400 bg-blue-100" /> Đang lưu trú
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded border border-amber-400 bg-amber-100" /> Chưa thu đủ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded border border-red-300 bg-red-100" /> Còn nợ sau trả
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded border border-slate-300 bg-slate-100" /> Đã trả phòng
        </span>
      </div>

      {/* Scrollable chart */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <div className="min-w-fit">
          {/* Date header */}
          <div className="flex border-b bg-muted/40">
            <div
              className="sticky left-0 z-20 border-r bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground"
              style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W }}
            >
              Phòng
            </div>
            {Array.from({ length: days }).map((_, i) => {
              const date = addDays(startDate, i)
              const today = isToday(date)
              const weekend = date.getDay() === 0 || date.getDay() === 6
              return (
                <div
                  key={i}
                  className={cn(
                    'flex flex-col items-center justify-center border-r py-1.5 text-[11px] leading-tight last:border-r-0',
                    today && 'bg-primary/10 font-semibold text-primary',
                    weekend && !today && 'bg-muted/60',
                  )}
                  style={{ width: cellW, minWidth: cellW }}
                >
                  <span className="text-[10px] uppercase text-muted-foreground">
                    {format(date, 'EEE', { locale: vi })}
                  </span>
                  <span className="text-sm font-semibold">{format(date, 'dd/MM')}</span>
                </div>
              )
            })}
          </div>

          {/* Rows by floor */}
          {roomsByFloor.map(({ floor, rooms }) => (
            <div key={floor}>
              <div className="sticky left-0 z-10 flex items-center gap-2 border-b border-t bg-muted/20 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
                Tầng {floor} <span className="text-muted-foreground/70">({rooms.length} phòng)</span>
              </div>
              {rooms.map((room) => (
                <RoomRow
                  key={room.id}
                  room={room}
                  layouts={bookingsByRoom.get(room.id) || []}
                  days={days}
                  cellW={cellW}
                  startDate={startDate}
                  onBookingClick={onBookingClick}
                  onEmptyCellClick={onEmptyCellClick}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Hint */}
      <p className="px-1 text-[11px] text-muted-foreground">
        Chạm vào dải tên khách để xem chi tiết booking. Chạm vào ô trống để tạo đặt phòng mới cho ngày đó.
      </p>
    </div>
  )
}
