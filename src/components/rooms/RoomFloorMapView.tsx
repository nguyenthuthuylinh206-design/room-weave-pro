import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatCurrency } from '@/lib/utils'
import { useFloorPlanLive, type FloorPlanRoom, type FloorPlanBooking } from '@/hooks/useFloorPlanLive'
import { useHotelContext } from '@/contexts/HotelContext'
import { useUser } from '@/hooks/useUser'
import { hasPermission } from '@/lib/permissions'
import { BookingDetailDialog } from '@/components/bookings/BookingDetailDialog'
import { RoomBookingDialog } from './RoomBookingDialog'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNowStrict, parseISO, differenceInHours } from 'date-fns'
import { vi } from 'date-fns/locale'

// Status → solid colors (đồng bộ với tape chart v1.0.92)
const STATUS_STYLE: Record<string, { bg: string; label: string; textCls: string }> = {
  available: { bg: 'bg-emerald-500', label: 'Còn trống', textCls: 'text-emerald-700' },
  vacant: { bg: 'bg-emerald-500', label: 'Còn trống', textCls: 'text-emerald-700' },
  occupied: { bg: 'bg-red-500', label: 'Đang ở', textCls: 'text-red-700' },
  checked_in: { bg: 'bg-red-500', label: 'Đang ở', textCls: 'text-red-700' },
  reserved: { bg: 'bg-orange-500', label: 'Đã đặt', textCls: 'text-orange-700' },
  arriving: { bg: 'bg-orange-500', label: 'Sắp đến', textCls: 'text-orange-700' },
  cleaning: { bg: 'bg-amber-500', label: 'Chờ dọn', textCls: 'text-amber-700' },
  dirty: { bg: 'bg-amber-500', label: 'Chờ dọn', textCls: 'text-amber-700' },
  inspection: { bg: 'bg-sky-500', label: 'Kiểm tra', textCls: 'text-sky-700' },
  maintenance: { bg: 'bg-slate-500', label: 'Bảo trì', textCls: 'text-slate-700' },
  out_of_order: { bg: 'bg-slate-500', label: 'Hỏng', textCls: 'text-slate-700' },
  dnd: { bg: 'bg-indigo-500', label: 'DND', textCls: 'text-indigo-700' },
  blocked: { bg: 'bg-slate-400', label: 'Bị chặn', textCls: 'text-slate-700' },
}

// Room type → left border accent
const TYPE_BORDER: Record<string, string> = {
  standard: 'border-l-blue-300',
  deluxe: 'border-l-cyan-300',
  superior: 'border-l-violet-300',
  suite: 'border-l-amber-300',
  vip: 'border-l-pink-300',
}

function getStatusStyle(status: string) {
  return STATUS_STYLE[status] || { bg: 'bg-slate-300', label: status, textCls: 'text-slate-600' }
}

function formatStayDuration(checkIn: string | null | undefined): string {
  if (!checkIn) return ''
  try {
    const d = parseISO(checkIn)
    const hrs = Math.abs(differenceInHours(new Date(), d))
    if (hrs < 1) return 'Vừa vào'
    if (hrs < 24) return `${hrs} giờ`
    return formatDistanceToNowStrict(d, { locale: vi, addSuffix: false })
      .replace(' ngày', ' ngày')
      .replace(' tuần', ' tuần')
  } catch {
    return ''
  }
}

function formatArriveIn(checkInDate: string, time: string | null | undefined): string {
  try {
    const t = (time || '14:00').slice(0, 5)
    const d = parseISO(`${checkInDate}T${t}:00`)
    const hrs = differenceInHours(d, new Date())
    if (hrs < 0) return 'Trễ giờ'
    if (hrs < 1) return 'Sắp đến'
    if (hrs < 24) return `${hrs}h nữa`
    return formatDistanceToNowStrict(d, { locale: vi, addSuffix: false })
  } catch {
    return ''
  }
}

export function RoomFloorMapView() {
  const { t: _t } = useTranslation(['rooms'])
  const { selectedHotel } = useHotelContext()
  const { user, role } = useUser()
  const navigate = useNavigate()
  const { data, isLoading } = useFloorPlanLive()
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null)
  const [bookingDialog, setBookingDialog] = useState<{ roomId: string; roomNumber: string } | null>(null)
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  const { floors, totals, types } = useMemo(() => {
    const _floors = data ? Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a)) : []
    const _totals: Record<string, number> = {}
    const _types = new Set<string>()
    if (data) {
      for (const f of _floors) {
        for (const r of data[f]) {
          _totals[r.status] = (_totals[r.status] || 0) + 1
          if (r.room_type) _types.add(r.room_type)
        }
      }
    }
    return { floors: _floors, totals: _totals, types: Array.from(_types).sort() }
  }, [data])

  const canBook = hasPermission(role, 'manage_rooms')

  const handleRoomClick = (room: FloorPlanRoom) => {
    if (room.current_booking?.id) {
      setDetailBookingId(room.current_booking.id)
      return
    }
    if (room.next_booking?.id) {
      setDetailBookingId(room.next_booking.id)
      return
    }
    if ((room.status === 'available' || room.status === 'vacant') && canBook && selectedHotel) {
      setBookingDialog({ roomId: room.id, roomNumber: room.room_number })
      return
    }
    navigate(`/rooms/${room.id}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border rounded-lg p-3 space-y-2">
            <Skeleton className="h-5 w-32" />
            <div className="grid grid-cols-6 md:grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }).map((_, j) => <Skeleton key={j} className="h-20" />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!floors.length) {
    return (
      <div className="border rounded-lg p-8 text-center text-sm text-muted-foreground">
        Chưa có phòng nào để hiển thị sơ đồ. Hãy thêm phòng để bắt đầu.
      </div>
    )
  }

  const statusKeys = Object.keys(totals).sort()

  return (
    <div className="space-y-3">
      {/* Summary + Legend */}
      <div className="rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {statusKeys.map((s) => {
            const st = getStatusStyle(s)
            return (
              <div key={s} className="flex items-center gap-1.5 text-xs">
                <span className={cn('inline-block h-3 w-3 rounded', st.bg)} />
                <span className={cn('font-medium', st.textCls)}>{st.label}</span>
                <span className="text-muted-foreground">({totals[s]})</span>
              </div>
            )
          })}
        </div>
        {types.length > 1 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
            <span className="text-xs text-muted-foreground mr-1">Loại:</span>
            {types.map((tp) => {
              const active = typeFilter.length === 0 || typeFilter.includes(tp)
              return (
                <button
                  key={tp}
                  type="button"
                  onClick={() =>
                    setTypeFilter((prev) =>
                      prev.includes(tp) ? prev.filter((x) => x !== tp) : [...prev, tp],
                    )
                  }
                  className={cn(
                    'h-6 rounded border px-2 text-[11px] font-medium transition-colors',
                    active ? 'bg-foreground text-background' : 'bg-background text-muted-foreground',
                  )}
                >
                  {tp}
                </button>
              )
            })}
            {typeFilter.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[11px]"
                onClick={() => setTypeFilter([])}
              >
                Xoá lọc
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Floor panels */}
      <TooltipProvider delayDuration={300}>
        {floors.map((floor) => {
          const rooms = data![floor]
          return (
            <div key={floor} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between border-b px-3 py-1.5">
                <div className="text-sm font-semibold">Tầng {floor}</div>
                <div className="text-xs text-muted-foreground">{rooms.length} phòng</div>
              </div>
              <div className="p-2 grid gap-1.5 grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-12">
                {rooms.map((room) => {
                  const st = getStatusStyle(room.status)
                  const dim = typeFilter.length > 0 && !typeFilter.includes(room.room_type)
                  const bk = room.current_booking
                  const next = room.next_booking
                  const showAsArriving = !bk && next
                  const bgClass = showAsArriving ? 'bg-orange-500' : st.bg
                  const guest = bk?.guest_name || next?.guest_name
                  const guestCount = bk?.guest_count || next?.guest_count
                  const chip = bk
                    ? formatStayDuration(bk.actual_check_in || `${bk.check_in_date}T${(bk.expected_check_in_time || '14:00').slice(0, 5)}:00`)
                    : next
                    ? formatArriveIn(next.check_in_date, next.expected_check_in_time)
                    : ''

                  return (
                    <Tooltip key={room.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleRoomClick(room)}
                          className={cn(
                            'relative flex h-20 flex-col items-stretch justify-between rounded-md border-l-[3px] p-1.5 text-left text-white shadow-sm transition-all hover:brightness-110 active:scale-95',
                            bgClass,
                            TYPE_BORDER[room.room_type] || 'border-l-white/40',
                            dim && 'opacity-30',
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-base font-bold leading-none">{room.room_number}</span>
                            {chip && (
                              <span className="shrink-0 rounded bg-white/25 px-1 py-0.5 text-[9px] font-medium leading-none">
                                {chip}
                              </span>
                            )}
                          </div>
                          {guest ? (
                            <div className="truncate text-[10px] font-medium leading-tight">
                              {guestCount ? `(${guestCount}) ` : ''}{guest.toUpperCase()}
                            </div>
                          ) : (
                            <div className="text-[10px] opacity-80 leading-tight">{st.label}</div>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <RoomTooltip room={room} bk={bk || next} isArriving={!!showAsArriving} />
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          )
        })}
      </TooltipProvider>

      {/* Booking detail popup */}
      <BookingDetailDialog
        bookingId={detailBookingId}
        open={!!detailBookingId}
        onOpenChange={(v) => !v && setDetailBookingId(null)}
      />

      {/* Quick new booking */}
      {bookingDialog && selectedHotel && user?.tenant_id && (
        <RoomBookingDialog
          open={!!bookingDialog}
          onOpenChange={(v) => !v && setBookingDialog(null)}
          roomId={bookingDialog.roomId}
          roomNumber={bookingDialog.roomNumber}
          hotelId={selectedHotel.id}
          tenantId={user.tenant_id}
        />
      )}
    </div>
  )
}

function RoomTooltip({
  room,
  bk,
  isArriving,
}: {
  room: FloorPlanRoom
  bk: FloorPlanBooking | null
  isArriving: boolean
}) {
  const st = getStatusStyle(room.status)
  return (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">
        Phòng {room.room_number} · {room.room_type}
      </div>
      <div className={cn('font-medium', st.textCls)}>{st.label}</div>
      {bk && (
        <>
          <div className="border-t pt-1 font-medium">
            {isArriving ? 'Sắp đến: ' : 'Khách: '}
            {bk.guest_name}
            {bk.guest_count ? ` (${bk.guest_count})` : ''}
          </div>
          {bk.guest_phone && <div>SĐT: {bk.guest_phone}</div>}
          <div className="text-muted-foreground">
            {bk.check_in_date} {(bk.expected_check_in_time || '14:00').slice(0, 5)}
            {bk.check_out_date && ` → ${bk.check_out_date} ${(bk.expected_check_out_time || '12:00').slice(0, 5)}`}
          </div>
          {bk.total_amount != null && (
            <div>
              Tổng: {formatCurrency(Number(bk.total_amount) || 0)}
              {(() => {
                const remaining = (Number(bk.total_amount) || 0) - (Number(bk.amount_paid) || 0) - (Number(bk.deposit_amount) || 0)
                return remaining > 1000 ? (
                  <span className="ml-1 text-red-600">· Còn {formatCurrency(remaining)}</span>
                ) : null
              })()}
            </div>
          )}
        </>
      )}
      <div className="border-t pt-1 text-[10px] text-muted-foreground">Bấm để mở chi tiết</div>
    </div>
  )
}
