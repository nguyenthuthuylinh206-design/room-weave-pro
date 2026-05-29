import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn, formatCurrency } from '@/lib/utils'
import { useFloorPlanLive, type FloorPlanRoom, type FloorPlanBooking } from '@/hooks/useFloorPlanLive'
import { useHotelContext } from '@/contexts/HotelContext'
import { useUser } from '@/hooks/useUser'
import { hasPermission } from '@/lib/permissions'
import { BookingDetailDialog } from '@/components/bookings/BookingDetailDialog'
import { RoomBookingDialog } from './RoomBookingDialog'
import { RoomAuditLogDialog } from './RoomAuditLogDialog'
import { ReceptionQuickDialog } from './ReceptionQuickDialog'
import { useRoomTransition } from '@/hooks/useRoomTransition'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNowStrict, parseISO, differenceInHours, format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Search, Plus, FileSpreadsheet, History, Unlock } from 'lucide-react'

// "Bucket" hiển thị cho lễ tân — gom 11 trạng thái nội bộ vào 5 nhóm dễ hiểu
type ReceptionBucket = 'sellable' | 'due_out' | 'dirty' | 'occupied' | 'blocked'

const BUCKET_META: Record<ReceptionBucket, { label: string; short: string; dot: string; ring: string; bg: string; text: string }> = {
  sellable: { label: 'Bán được',        short: 'Bán được',   dot: 'bg-emerald-500', ring: 'ring-emerald-300', bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  due_out:  { label: 'Checkout hôm nay', short: 'Sắp trả',    dot: 'bg-amber-500',   ring: 'ring-amber-300',   bg: 'bg-amber-50',    text: 'text-amber-700' },
  dirty:    { label: 'Đang dọn',         short: 'Đang dọn',   dot: 'bg-rose-500',    ring: 'ring-rose-300',    bg: 'bg-rose-50',     text: 'text-rose-700' },
  occupied: { label: 'Có khách',         short: 'Có khách',   dot: 'bg-sky-500',     ring: 'ring-sky-300',     bg: 'bg-sky-50',      text: 'text-sky-700' },
  blocked:  { label: 'Khoá / Bảo trì',   short: 'Khoá',       dot: 'bg-slate-500',   ring: 'ring-slate-300',   bg: 'bg-slate-50',    text: 'text-slate-700' },
}

function getBucket(room: FloorPlanRoom): ReceptionBucket {
  const s = room.status
  if (s === 'out_of_order' || s === 'out_of_service' || s === 'dnd' || s === 'skipper') return 'blocked'
  if (s === 'vacant_dirty' || s === 'occupied_dirty' || s === 'cleaning') return 'dirty'
  // Occupied bucket: có booking hiện tại
  if (room.current_booking) {
    const today = format(new Date(), 'yyyy-MM-dd')
    if (room.current_booking.check_out_date === today) return 'due_out'
    return 'occupied'
  }
  if (s === 'occupied' || s === 'occupied_clean') return 'occupied'
  // Còn lại: trống sạch / đã QC / vacant / reserved → bán được
  return 'sellable'
}


const LIFTABLE_STATUSES = new Set(['dnd', 'out_of_service', 'out_of_order'])

// Status → solid colors
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

const TYPE_BORDER: Record<string, string> = {
  standard: 'border-l-blue-300',
  deluxe: 'border-l-cyan-300',
  superior: 'border-l-violet-300',
  suite: 'border-l-amber-300',
  vip: 'border-l-pink-300',
}

// Stable color per booking group (chỉ tô viền nhóm nếu có nhiều hơn 1 phòng cùng nhóm)
const GROUP_RING_COLORS = [
  'ring-fuchsia-400',
  'ring-cyan-400',
  'ring-lime-400',
  'ring-rose-400',
  'ring-violet-400',
  'ring-teal-400',
  'ring-yellow-400',
]
function ringForGroup(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return GROUP_RING_COLORS[h % GROUP_RING_COLORS.length]
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

export function RoomFloorMapView({
  onAddRoom,
  onBulkImport,
}: {
  onAddRoom?: () => void
  onBulkImport?: () => void
} = {}) {
  const { t: _t } = useTranslation(['rooms'])
  const { selectedHotel } = useHotelContext()
  const { role, tenantId } = useUser()
  const navigate = useNavigate()
  const { data, isLoading } = useFloorPlanLive()
  const [detailBookingId, setDetailBookingId] = useState<string | null>(null)
  const [bookingDialog, setBookingDialog] = useState<{ roomId: string; roomNumber: string } | null>(null)
  const [auditDialog, setAuditDialog] = useState<{ roomId: string; roomNumber: string } | null>(null)
  const [quickRoom, setQuickRoom] = useState<FloorPlanRoom | null>(null)
  const [typeFilter, setTypeFilter] = useState<string[]>([])
  const [bucketFilter, setBucketFilter] = useState<ReceptionBucket | 'all'>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const transitionRoom = useRoomTransition()

  const handleLiftStatus = (e: React.MouseEvent, room: FloorPlanRoom) => {
    e.stopPropagation()
    if (!confirm(`Gỡ trạng thái "${room.status.toUpperCase()}" của phòng ${room.room_number}?\nPhòng sẽ chuyển về "Trống – đã dọn".`)) return
    transitionRoom.mutate({
      roomId: room.id,
      toStatus: 'vacant_clean',
      reason: `Gỡ thủ công từ sơ đồ phòng (was ${room.status})`,
    })
  }

  const handleShowHistory = (e: React.MouseEvent, room: FloorPlanRoom) => {
    e.stopPropagation()
    setAuditDialog({ roomId: room.id, roomNumber: room.room_number })
  }

  const { floors, bucketCounts, types, groupCounts } = useMemo(() => {
    const _floors = data ? Object.keys(data).sort((a, b) => parseInt(b) - parseInt(a)) : []
    const _bucketCounts: Record<ReceptionBucket, number> = { sellable: 0, due_out: 0, dirty: 0, occupied: 0, blocked: 0 }
    const _types = new Set<string>()
    const _groupCounts: Record<string, number> = {}
    if (data) {
      for (const f of _floors) {
        for (const r of data[f]) {
          _bucketCounts[getBucket(r)] += 1
          if (r.room_type) _types.add(r.room_type)
          const gid = r.current_booking?.booking_group_id || r.next_booking?.booking_group_id
          if (gid) _groupCounts[gid] = (_groupCounts[gid] || 0) + 1
        }
      }
    }
    return {
      floors: _floors,
      bucketCounts: _bucketCounts,
      types: Array.from(_types).sort(),
      groupCounts: _groupCounts,
    }
  }, [data])

  const canBook = hasPermission(role, 'manage_rooms')

  // Click phòng → mở Reception Quick Dialog cho mọi trạng thái.
  // Dialog sẽ render khác nhau dựa trên có booking hay không.
  const handleRoomClick = (room: FloorPlanRoom) => {
    setQuickRoom(room)
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
      <div className="border rounded-lg p-8 text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Chưa có phòng nào để hiển thị sơ đồ. Hãy thêm phòng để bắt đầu.
        </p>
        <div className="flex items-center justify-center gap-2">
          {onAddRoom && (
            <Button size="sm" onClick={onAddRoom}>
              <Plus className="mr-2 h-4 w-4" />
              Thêm phòng
            </Button>
          )}
          {onBulkImport && (
            <Button size="sm" variant="outline" onClick={onBulkImport}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Import từ Excel
            </Button>
          )}
        </div>
      </div>
    )
  }

  const statusKeys = Object.keys(totals).sort()
  const allFloorNums = floors.slice()

  // Áp filter floor + search + status
  const visibleFloors = floors
    .filter((f) => floorFilter === 'all' || f === floorFilter)
    .map((f) => ({
      floor: f,
      rooms: data![f].filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false
        if (search.trim() && !r.room_number.toLowerCase().includes(search.trim().toLowerCase())) return false
        return true
      }),
    }))
    .filter((g) => g.rooms.length > 0)

  return (
    <div className="space-y-3">
      {/* Toolbar: search + filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm số phòng..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {statusKeys.map((s) => (
              <SelectItem key={s} value={s}>
                {getStatusStyle(s).label} ({totals[s]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={floorFilter} onValueChange={setFloorFilter}>
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi tầng</SelectItem>
            {allFloorNums.map((f) => (
              <SelectItem key={f} value={f}>Tầng {f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== 'all' || floorFilter !== 'all' || typeFilter.length) ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => {
              setSearch('')
              setStatusFilter('all')
              setFloorFilter('all')
              setTypeFilter([])
            }}
          >
            Xoá lọc
          </Button>
        ) : null}
      </div>

      {/* Legend + type filter */}
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
          <div className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Có việc cần làm</span>
          </div>
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
          </div>
        )}
      </div>

      {/* Floor panels */}
      {visibleFloors.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm text-muted-foreground">
          Không có phòng nào khớp với bộ lọc hiện tại.
        </div>
      ) : (
        <TooltipProvider delayDuration={300}>
          {visibleFloors.map(({ floor, rooms }) => (
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
                  const gid = bk?.booking_group_id || next?.booking_group_id
                  const showGroupRing = gid && (groupCounts[gid] || 0) > 1
                  const openTasks = room.open_tasks || 0
                  const canLift = LIFTABLE_STATUSES.has(room.status)

                  return (
                    <Tooltip key={room.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleRoomClick(room)}
                          className={cn(
                            'group relative flex h-20 flex-col items-stretch justify-between rounded-md border-l-[3px] p-1.5 text-left text-white shadow-sm transition-all hover:brightness-110 active:scale-95',
                            bgClass,
                            TYPE_BORDER[room.room_type] || 'border-l-white/40',
                            showGroupRing && cn('ring-2 ring-offset-1', ringForGroup(gid!)),
                            dim && 'opacity-30',
                          )}
                        >
                          {/* Service request dot */}
                          {openTasks > 0 && (
                            <span
                              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white shadow ring-1 ring-white"
                              title={`${openTasks} việc cần làm`}
                            >
                              {openTasks}
                            </span>
                          )}
                          {/* Quick actions (hover) */}
                          <span className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1 rounded-b-md bg-black/45 py-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                            {canLift && (
                              <button
                                type="button"
                                onClick={(e) => handleLiftStatus(e, room)}
                                disabled={transitionRoom.isPending}
                                className="rounded bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                                title="Gỡ DND/OOS · về Trống sạch"
                              >
                                <Unlock className="inline h-2.5 w-2.5 mr-0.5" />Gỡ
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleShowHistory(e, room)}
                              className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold text-white hover:bg-white/30"
                              title="Lịch sử trạng thái"
                            >
                              <History className="inline h-2.5 w-2.5 mr-0.5" />Sử
                            </button>
                          </span>
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
                        <RoomTooltip
                          room={room}
                          bk={bk || next}
                          isArriving={!!showAsArriving}
                          isGroup={!!showGroupRing}
                        />
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          ))}
        </TooltipProvider>
      )}


      {/* Booking detail popup */}
      <BookingDetailDialog
        bookingId={detailBookingId}
        open={!!detailBookingId}
        onOpenChange={(v) => !v && setDetailBookingId(null)}
      />
      {/* Quick new booking */}
      {bookingDialog && selectedHotel && tenantId && (
        <RoomBookingDialog
          open={!!bookingDialog}
          onOpenChange={(v) => !v && setBookingDialog(null)}
          roomId={bookingDialog.roomId}
          roomNumber={bookingDialog.roomNumber}
          hotelId={selectedHotel.id}
          tenantId={tenantId}
        />
      )}

      {/* Room audit log */}
      {auditDialog && (
        <RoomAuditLogDialog
          open={!!auditDialog}
          onOpenChange={(v) => !v && setAuditDialog(null)}
          roomId={auditDialog.roomId}
          roomNumber={auditDialog.roomNumber}
        />
      )}


    </div>
  )
}

function RoomTooltip({
  room,
  bk,
  isArriving,
  isGroup,
}: {
  room: FloorPlanRoom
  bk: FloorPlanBooking | null
  isArriving: boolean
  isGroup: boolean
}) {
  const st = getStatusStyle(room.status)
  return (
    <div className="space-y-1 text-xs">
      <div className="font-semibold">
        Phòng {room.room_number} · {room.room_type}
      </div>
      <div className={cn('font-medium', st.textCls)}>{st.label}</div>
      {(room.open_hk_tasks || room.open_maintenance) ? (
        <div className="text-red-600">
          {room.open_hk_tasks ? `${room.open_hk_tasks} buồng phòng` : ''}
          {room.open_hk_tasks && room.open_maintenance ? ' · ' : ''}
          {room.open_maintenance ? `${room.open_maintenance} bảo trì` : ''}
        </div>
      ) : null}
      {bk && (
        <>
          <div className="border-t pt-1 font-medium">
            {isArriving ? 'Sắp đến: ' : 'Khách: '}
            {bk.guest_name}
            {bk.guest_count ? ` (${bk.guest_count})` : ''}
            {isGroup && <span className="ml-1 text-fuchsia-600">· Nhóm</span>}
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
