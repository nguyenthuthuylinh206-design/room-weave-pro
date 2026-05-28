import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { addDays, differenceInCalendarDays, format, isToday, parseISO } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  AlertTriangle,
  Lock,
  X,
  Printer,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn, formatCurrency } from '@/lib/utils'
import {
  useTapeChart,
  type TapeChartBooking,
  type TapeChartRoom,
  type RoomBlock,
} from '@/hooks/useTapeChart'
import { useTapeChartMutations } from '@/hooks/useTapeChartMutations'
import { getRoomStatusMeta, normalizeRoomStatus } from '@/lib/roomStatus'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  buildRoomLane,
  bookingMatchesQuery,
  getBarColor,
  getSourceBadge,
  MINUTES_PER_DAY,
  type BookingLayout,
} from '@/lib/tape-chart'
import { TapeChartBookingSheet } from './TapeChartBookingSheet'
import { TapeChartTodoPanel } from './TapeChartTodoPanel'
import { TapeChartBlockDialog } from './TapeChartBlockDialog'
import { useTapeChartPrefs } from '@/hooks/useTapeChartPrefs'
import { getHoliday } from '@/lib/vn-holidays'


const DESKTOP_DAYS = 14
const MOBILE_DAYS = 3
const ROOM_COL_W = 132
const CELL_W_DESKTOP = 96
const CELL_W_MOBILE = 108
const LANE_H = 28
const ROW_PADDING = 8
const GROUP_HEADER_H = 28

type StatusFilter = 'all' | 'confirmed' | 'checked_in' | 'checked_out' | 'debt' | 'conflict'

interface FlatRow {
  type: 'group' | 'room'
  key: string
  height: number
  group?: { floor: number; count: number }
  room?: TapeChartRoom
  layouts?: BookingLayout[]
  blocks?: RoomBlock[]
  laneCount?: number
}

interface DragData {
  bookingId: string
  durationDays: number
  fromRoomId: string
  fromCheckIn: string
}

const BLOCK_TYPE_LABEL: Record<string, string> = {
  ooo: 'OOO – Hỏng',
  oos: 'OOS – Tạm ngừng',
  vip_hold: 'Giữ VIP',
  maintenance: 'Bảo trì',
  other: 'Khác',
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [floorFilter, setFloorFilter] = useState<string>('all')
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null)
  const [sheetBooking, setSheetBooking] = useState<TapeChartBooking | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [blockDialog, setBlockDialog] = useState<{ room: TapeChartRoom | null; date: Date | null }>({
    room: null,
    date: null,
  })
  const dragRef = useRef<DragData | null>(null)

  const startStr = format(startDate, 'yyyy-MM-dd')
  const { data, isLoading } = useTapeChart(startStr, days)
  const { moveBooking, deleteBlock } = useTapeChartMutations()

  const [nowMin, setNowMin] = useState(() => {
    const n = new Date()
    return n.getHours() * 60 + n.getMinutes()
  })
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date()
      setNowMin(n.getHours() * 60 + n.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const filteredBookings = useMemo(() => {
    const all = data?.bookings || []
    return all.filter((b) => {
      if (!bookingMatchesQuery(b, search)) return false
      if (statusFilter === 'all') return true
      if (statusFilter === 'debt') {
        const r = (Number(b.total_amount) || 0) - (Number(b.amount_paid) || 0) - (Number(b.deposit_amount) || 0)
        return r > 1000
      }
      if (statusFilter === 'conflict') return true
      return b.status === statusFilter
    })
  }, [data?.bookings, search, statusFilter])

  const roomLayouts = useMemo(() => {
    const map = new Map<string, { layouts: BookingLayout[]; laneCount: number }>()
    const grouped = new Map<string, TapeChartBooking[]>()
    filteredBookings.forEach((b) => {
      const arr = grouped.get(b.room_id) || []
      arr.push(b)
      grouped.set(b.room_id, arr)
    })
    grouped.forEach((bs, roomId) => {
      const result = buildRoomLane(bs, startDate, days)
      if (statusFilter === 'conflict') {
        const conflictOnly = result.layouts.filter((l) => l.conflict)
        if (conflictOnly.length === 0) return
        map.set(roomId, { layouts: conflictOnly, laneCount: result.laneCount })
      } else {
        map.set(roomId, result)
      }
    })
    return map
  }, [filteredBookings, startDate, days, statusFilter])

  const blocksByRoom = useMemo(() => {
    const map = new Map<string, RoomBlock[]>()
    ;(data?.room_blocks || []).forEach((b) => {
      const arr = map.get(b.room_id) || []
      arr.push(b)
      map.set(b.room_id, arr)
    })
    return map
  }, [data?.room_blocks])

  const floors = useMemo(() => {
    const rooms = data?.rooms || []
    const grouped = new Map<number, TapeChartRoom[]>()
    rooms.forEach((r) => {
      if (floorFilter !== 'all' && String(r.floor) !== floorFilter) return
      const arr = grouped.get(r.floor) || []
      arr.push(r)
      grouped.set(r.floor, arr)
    })
    return Array.from(grouped.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([floor, rooms]) => ({
        floor,
        rooms: rooms.sort((a, b) =>
          a.room_number.localeCompare(b.room_number, undefined, { numeric: true }),
        ),
      }))
  }, [data?.rooms, floorFilter])

  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = []
    floors.forEach(({ floor, rooms }) => {
      rows.push({
        type: 'group',
        key: `g-${floor}`,
        height: GROUP_HEADER_H,
        group: { floor, count: rooms.length },
      })
      rooms.forEach((room) => {
        const result = roomLayouts.get(room.id)
        const laneCount = result?.laneCount || 1
        rows.push({
          type: 'room',
          key: `r-${room.id}`,
          room,
          layouts: result?.layouts || [],
          blocks: blocksByRoom.get(room.id) || [],
          laneCount,
          height: laneCount * LANE_H + ROW_PADDING * 2,
        })
      })
    })
    return rows
  }, [floors, roomLayouts, blocksByRoom])

  const allFloorOptions = useMemo(() => {
    const s = new Set<number>()
    ;(data?.rooms || []).forEach((r) => s.add(r.floor))
    return Array.from(s).sort((a, b) => b - a)
  }, [data?.rooms])

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
    const conflicts = Array.from(roomLayouts.values()).reduce(
      (acc, r) => acc + r.layouts.filter((l) => l.conflict).length,
      0,
    )
    const blockedRooms = (data?.room_blocks || []).length
    return { arrivals, departures, inHouse, totalRooms, occupancy, conflicts, blockedRooms }
  }, [data, roomLayouts])

  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => flatRows[i]?.height || 56,
    overscan: 8,
    getItemKey: (i) => flatRows[i]?.key || i,
  })

  const shiftDate = (n: number) => setStartDate((d) => addDays(d, n))

  const onBookingClick = (b: TapeChartBooking) => setSheetBooking(b)

  const onEmptyCellClick = (room: TapeChartRoom, date: Date) => {
    const d = format(date, 'yyyy-MM-dd')
    navigate(`/bookings?action=create&room_id=${room.id}&check_in_date=${d}`)
  }

  const onEmptyCellContextMenuBlock = (room: TapeChartRoom, date: Date) => {
    setBlockDialog({ room, date })
  }

  const onBookingDragStart = (b: TapeChartBooking) => {
    const ci = parseISO(b.check_in_date)
    const co = parseISO(b.check_out_date)
    dragRef.current = {
      bookingId: b.id,
      durationDays: Math.max(1, differenceInCalendarDays(co, ci)),
      fromRoomId: b.room_id,
      fromCheckIn: b.check_in_date,
    }
  }

  const onCellDrop = (room: TapeChartRoom, date: Date) => {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    const newCheckIn = format(date, 'yyyy-MM-dd')
    const newCheckOut = format(addDays(date, drag.durationDays), 'yyyy-MM-dd')
    if (room.id === drag.fromRoomId && newCheckIn === drag.fromCheckIn) return
    moveBooking.mutate({
      booking_id: drag.bookingId,
      new_room_id: room.id,
      new_check_in: newCheckIn,
      new_check_out: newCheckOut,
    })
  }

  const groupBookings = useMemo(() => {
    if (!sheetBooking?.booking_group_id) return undefined
    return (data?.bookings || []).filter((b) => b.booking_group_id === sheetBooking.booking_group_id)
  }, [sheetBooking, data?.bookings])

  const sheetRoom = useMemo(() => {
    if (!sheetBooking) return null
    return (data?.rooms || []).find((r) => r.id === sheetBooking.room_id) || null
  }, [sheetBooking, data?.rooms])

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

  const totalChartWidth = days * cellW

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-1">
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

          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="ml-1 h-8 gap-1.5 px-2 text-xs">
                <CalendarDays className="h-3.5 w-3.5" />
                {format(startDate, 'dd/MM', { locale: vi })} – {format(addDays(startDate, days - 1), 'dd/MM/yyyy', { locale: vi })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(d) => {
                  if (d) {
                    const x = new Date(d)
                    x.setHours(0, 0, 0, 0)
                    setStartDate(x)
                    setShowCalendar(false)
                  }
                }}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Tìm khách / SĐT…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-44 pl-7 text-xs"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả booking</SelectItem>
              <SelectItem value="confirmed">Đã xác nhận</SelectItem>
              <SelectItem value="checked_in">Đang lưu trú</SelectItem>
              <SelectItem value="checked_out">Đã trả phòng</SelectItem>
              <SelectItem value="debt">Còn nợ</SelectItem>
              <SelectItem value="conflict">Trùng giờ</SelectItem>
            </SelectContent>
          </Select>

          {allFloorOptions.length > 1 && (
            <Select value={floorFilter} onValueChange={setFloorFilter}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi tầng</SelectItem>
                {allFloorOptions.map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    Tầng {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-0.5 rounded-md border p-0.5">
            {[3, 7, 14, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={cn(
                  'rounded px-2 py-1 text-xs font-medium transition-colors',
                  days === d ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs">
        <span>
          <span className="text-muted-foreground">Đang ở </span>
          <span className="font-semibold">{kpis.inHouse}/{kpis.totalRooms}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Đến hôm nay </span>
          <span className="font-semibold text-emerald-600">{kpis.arrivals}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Đi hôm nay </span>
          <span className="font-semibold text-blue-600">{kpis.departures}</span>
        </span>
        <span>
          <span className="text-muted-foreground">Lấp đầy </span>
          <span className="font-semibold">{kpis.occupancy}%</span>
        </span>
        {kpis.blockedRooms > 0 && (
          <span className="flex items-center gap-1 text-slate-600">
            <Lock className="h-3 w-3" />
            {kpis.blockedRooms} block
          </span>
        )}
        {kpis.conflicts > 0 && (
          <button
            type="button"
            onClick={() => setStatusFilter('conflict')}
            className="flex items-center gap-1 font-semibold text-red-600 hover:underline"
          >
            <AlertTriangle className="h-3 w-3" />
            {kpis.conflicts} trùng giờ
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
        <LegendDot className="border-l-emerald-500 bg-emerald-50" label="Đã cọc đủ" />
        <LegendDot className="border-l-amber-500 bg-amber-50" label="Cọc một phần" />
        <LegendDot className="border-l-orange-500 bg-orange-50" label="Chưa cọc" />
        <LegendDot className="border-l-blue-500 bg-blue-100" label="Đang lưu trú" />
        <LegendDot className="border-l-slate-400 bg-slate-100" label="Đã trả phòng" />
        <LegendDot className="border-l-red-500 bg-red-50" label="Còn nợ" />
        <LegendDot className="border-l-slate-500 bg-[repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0_4px,#cbd5e1_4px,#cbd5e1_6px)]" label="Phòng bị block" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-lg border bg-card">
          {/* Sticky date header */}
          <div className="flex border-b bg-muted/40" style={{ width: totalChartWidth + ROOM_COL_W }}>
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

          <div
            ref={parentRef}
            className="relative overflow-auto"
            style={{ height: Math.min(640, flatRows.reduce((a, r) => a + r.height, 0) + 16) }}
          >
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: totalChartWidth + ROOM_COL_W,
                position: 'relative',
              }}
            >
              {virtualizer.getVirtualItems().map((vi) => {
                const row = flatRows[vi.index]
                if (!row) return null
                if (row.type === 'group') {
                  return (
                    <div
                      key={vi.key}
                      className="sticky left-0 z-10 flex items-center border-b border-t bg-muted/30 px-3 text-[11px] font-medium text-muted-foreground"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        height: row.height,
                        width: totalChartWidth + ROOM_COL_W,
                        transform: `translateY(${vi.start}px)`,
                      }}
                    >
                      Tầng {row.group!.floor}{' '}
                      <span className="ml-1 text-muted-foreground/70">
                        ({row.group!.count} phòng)
                      </span>
                    </div>
                  )
                }
                return (
                  <Row
                    key={vi.key}
                    room={row.room!}
                    layouts={row.layouts!}
                    blocks={row.blocks || []}
                    days={days}
                    cellW={cellW}
                    height={row.height}
                    startDate={startDate}
                    top={vi.start}
                    highlightGroupId={highlightGroupId}
                    onHoverGroup={setHighlightGroupId}
                    onBookingClick={onBookingClick}
                    onEmptyCellClick={onEmptyCellClick}
                    onEmptyCellBlock={onEmptyCellContextMenuBlock}
                    onBookingDragStart={onBookingDragStart}
                    onCellDrop={onCellDrop}
                    onDeleteBlock={(id) => deleteBlock.mutate(id)}
                  />
                )
              })}

              {/* Now line */}
              {(() => {
                const todayIdx = Array.from({ length: days }).findIndex((_, i) =>
                  isToday(addDays(startDate, i)),
                )
                if (todayIdx < 0) return null
                const x = ROOM_COL_W + todayIdx * cellW + (nowMin / MINUTES_PER_DAY) * cellW
                return (
                  <div
                    className="pointer-events-none absolute top-0 z-[5] w-px bg-red-500/70"
                    style={{ left: x, height: virtualizer.getTotalSize() }}
                  >
                    <div className="absolute -left-1 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <TapeChartTodoPanel
            rooms={data.rooms}
            bookings={data.bookings}
            onBookingClick={onBookingClick}
          />
        </div>
      </div>

      <p className="px-1 text-[11px] text-muted-foreground">
        Kéo–thả bar booking sang phòng/ngày khác để chuyển phòng. Chuột phải vào bar để xem menu (Chi tiết / Block phòng). Chuột phải ô trống để chặn phòng theo khoảng ngày.
      </p>

      <TapeChartBookingSheet
        booking={sheetBooking}
        room={sheetRoom}
        groupBookings={groupBookings}
        open={!!sheetBooking}
        onOpenChange={(v) => !v && setSheetBooking(null)}
      />

      <TapeChartBlockDialog
        open={!!blockDialog.room}
        onOpenChange={(v) => !v && setBlockDialog({ room: null, date: null })}
        room={blockDialog.room}
        defaultStart={blockDialog.date}
      />
    </div>
  )
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('h-2.5 w-4 rounded border-l-4', className)} />
      {label}
    </span>
  )
}

interface RowProps {
  room: TapeChartRoom
  layouts: BookingLayout[]
  blocks: RoomBlock[]
  days: number
  cellW: number
  height: number
  startDate: Date
  top: number
  highlightGroupId: string | null
  onHoverGroup: (id: string | null) => void
  onBookingClick: (b: TapeChartBooking) => void
  onEmptyCellClick: (room: TapeChartRoom, date: Date) => void
  onEmptyCellBlock: (room: TapeChartRoom, date: Date) => void
  onBookingDragStart: (b: TapeChartBooking) => void
  onCellDrop: (room: TapeChartRoom, date: Date) => void
  onDeleteBlock: (id: string) => void
}

function Row({
  room,
  layouts,
  blocks,
  days,
  cellW,
  height,
  startDate,
  top,
  highlightGroupId,
  onHoverGroup,
  onBookingClick,
  onEmptyCellClick,
  onEmptyCellBlock,
  onBookingDragStart,
  onCellDrop,
  onDeleteBlock,
}: RowProps) {
  const meta = getRoomStatusMeta(room.status)
  const v2 = normalizeRoomStatus(room.status)
  const blockedByStatus = v2 === 'out_of_order' || v2 === 'out_of_service'

  // Mảng cell bị chiếm (booking hoặc block)
  const occupied = new Array(days).fill(false)
  layouts.forEach((l) => {
    const sIdx = Math.floor(l.offsetMin / MINUTES_PER_DAY)
    const eIdx = Math.ceil((l.offsetMin + l.durationMin) / MINUTES_PER_DAY)
    for (let i = sIdx; i < eIdx; i++) if (i >= 0 && i < days) occupied[i] = true
  })
  blocks.forEach((b) => {
    const s = parseISO(b.start_date)
    const e = parseISO(b.end_date)
    const sIdx = Math.max(0, differenceInCalendarDays(s, startDate))
    const eIdx = Math.min(days, differenceInCalendarDays(e, startDate))
    for (let i = sIdx; i < eIdx; i++) occupied[i] = true
  })

  return (
    <div
      className="flex border-b last:border-b-0"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        height,
        width: ROOM_COL_W + days * cellW,
        transform: `translateY(${top}px)`,
      }}
    >
      <div
        className="sticky left-0 z-[2] flex items-center gap-2 border-r bg-background px-3"
        style={{ width: ROOM_COL_W, minWidth: ROOM_COL_W, height }}
      >
        <span
          className={cn('h-2 w-2 shrink-0 rounded-full border', meta.bg, meta.border)}
          title={meta.label}
        />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold">{room.room_number}</div>
          <div className="truncate text-[10px] text-muted-foreground">
            <span className="capitalize">{room.room_type}</span>
            <span className={cn('ml-1', meta.text)}>· {meta.short}</span>
          </div>
        </div>
      </div>

      <div className="relative flex" style={{ width: days * cellW, height }}>
        {/* Background cells với drop target */}
        {Array.from({ length: days }).map((_, i) => {
          const date = addDays(startDate, i)
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const today = isToday(date)
          const cellOccupied = occupied[i]
          return (
            <ContextMenu key={i}>
              <ContextMenuTrigger asChild>
                <button
                  type="button"
                  disabled={cellOccupied || blockedByStatus}
                  onClick={() => onEmptyCellClick(room, date)}
                  onDragOver={(e) => {
                    if (!cellOccupied && !blockedByStatus) e.preventDefault()
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (!cellOccupied && !blockedByStatus) onCellDrop(room, date)
                  }}
                  className={cn(
                    'border-r last:border-r-0 transition-colors',
                    isWeekend && 'bg-muted/30',
                    today && 'bg-primary/5',
                    blockedByStatus && 'cursor-not-allowed bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,hsl(var(--muted))_6px,hsl(var(--muted))_8px)]',
                    !cellOccupied && !blockedByStatus && 'cursor-pointer hover:bg-accent/40',
                    cellOccupied && !blockedByStatus && 'cursor-default',
                  )}
                  style={{ width: cellW, height }}
                  aria-label={`${room.room_number} ${format(date, 'dd/MM')}`}
                />
              </ContextMenuTrigger>
              {!cellOccupied && !blockedByStatus && (
                <ContextMenuContent className="w-52">
                  <ContextMenuItem onClick={() => onEmptyCellClick(room, date)}>
                    Tạo booking mới
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onEmptyCellBlock(room, date)}>
                    <Lock className="mr-2 h-3.5 w-3.5" />
                    Chặn phòng từ ngày này
                  </ContextMenuItem>
                </ContextMenuContent>
              )}
            </ContextMenu>
          )
        })}

        {/* Room blocks — render trước (z dưới) bookings */}
        {blocks.map((b) => {
          const s = parseISO(b.start_date)
          const e = parseISO(b.end_date)
          const sIdx = Math.max(0, differenceInCalendarDays(s, startDate))
          const eIdx = Math.min(days, differenceInCalendarDays(e, startDate))
          if (eIdx <= sIdx) return null
          const left = sIdx * cellW
          const width = (eIdx - sIdx) * cellW
          return (
            <ContextMenu key={b.id}>
              <ContextMenuTrigger asChild>
                <div
                  className="absolute z-[1] flex items-center justify-center gap-1 rounded-sm border border-slate-400/70 bg-[repeating-linear-gradient(45deg,#e2e8f0,#e2e8f0_4px,#cbd5e1_4px,#cbd5e1_6px)] text-[10px] font-medium text-slate-700"
                  style={{
                    left: left + 1,
                    width: width - 2,
                    top: ROW_PADDING / 2,
                    height: height - ROW_PADDING,
                  }}
                  title={`${BLOCK_TYPE_LABEL[b.block_type] || b.block_type}${b.reason ? ' — ' + b.reason : ''}`}
                >
                  <Lock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{BLOCK_TYPE_LABEL[b.block_type] || 'Block'}</span>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuItem disabled className="text-xs">
                  {BLOCK_TYPE_LABEL[b.block_type] || b.block_type}
                  {b.reason ? ` — ${b.reason}` : ''}
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  className="text-red-600 focus:text-red-600"
                  onClick={() => onDeleteBlock(b.id)}
                >
                  <X className="mr-2 h-3.5 w-3.5" />
                  Gỡ block
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}

        {/* Booking bars */}
        {layouts.map((l) => {
          const left = (l.offsetMin / MINUTES_PER_DAY) * cellW
          const width = Math.max(40, (l.durationMin / MINUTES_PER_DAY) * cellW)
          const barTop = ROW_PADDING + l.lane * LANE_H
          const color = getBarColor(l.booking)
          const isHighlighted =
            highlightGroupId && l.booking.booking_group_id === highlightGroupId
          const isDimmed = highlightGroupId && !isHighlighted
          const sourceBadge = getSourceBadge(l.booking.booking_source)
          const debt =
            (Number(l.booking.total_amount) || 0) -
            (Number(l.booking.amount_paid) || 0) -
            (Number(l.booking.deposit_amount) || 0)
          const draggable = l.booking.status !== 'checked_out'

          return (
            <ContextMenu key={l.booking.id}>
              <ContextMenuTrigger asChild>
                <TooltipProvider delayDuration={250}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        draggable={draggable}
                        onDragStart={() => onBookingDragStart(l.booking)}
                        onMouseEnter={() => l.booking.booking_group_id && onHoverGroup(l.booking.booking_group_id)}
                        onMouseLeave={() => onHoverGroup(null)}
                        onClick={(e) => {
                          e.stopPropagation()
                          onBookingClick(l.booking)
                        }}
                        className={cn(
                          'absolute z-[3] flex items-center gap-1 overflow-hidden rounded-r-md pl-1.5 pr-1.5 text-left text-[11px] font-medium shadow-sm transition-all',
                          color.bg,
                          color.border,
                          color.text,
                          color.hover,
                          l.conflict && 'ring-2 ring-red-500',
                          isHighlighted && cn('ring-2', color.ring),
                          isDimmed && 'opacity-40',
                          draggable && 'cursor-grab active:cursor-grabbing',
                        )}
                        style={{
                          left: left + 2,
                          width: width - 4,
                          top: barTop,
                          height: LANE_H - 4,
                        }}
                      >
                        {sourceBadge && (
                          <span className="shrink-0 rounded bg-background/60 px-1 font-mono text-[9px] opacity-80">
                            {sourceBadge}
                          </span>
                        )}
                        <span className="truncate">{l.booking.guest_name}</span>
                        {l.booking.guest_count ? (
                          <span className="shrink-0 opacity-70">·{l.booking.guest_count}</span>
                        ) : null}
                        {l.conflict && (
                          <AlertTriangle className="ml-auto h-3 w-3 shrink-0 text-red-600" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold">{l.booking.guest_name}</div>
                        <div className="text-muted-foreground">
                          {format(parseISO(l.booking.check_in_date), 'dd/MM')}{' '}
                          {l.booking.expected_check_in_time?.slice(0, 5) || '14:00'}
                          {' → '}
                          {format(parseISO(l.booking.check_out_date), 'dd/MM')}{' '}
                          {l.booking.expected_check_out_time?.slice(0, 5) || '12:00'}
                        </div>
                        {l.booking.guest_phone && <div>SĐT: {l.booking.guest_phone}</div>}
                        <div>Tổng: {formatCurrency(Number(l.booking.total_amount) || 0)}</div>
                        {debt > 0 && (
                          <div className="text-red-600">Còn nợ: {formatCurrency(debt)}</div>
                        )}
                        {l.conflict && (
                          <div className="font-semibold text-red-600">⚠ Trùng giờ với booking khác</div>
                        )}
                        {draggable && (
                          <div className="text-[10px] text-muted-foreground/80">Kéo–thả để chuyển phòng/ngày</div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-52">
                <ContextMenuItem onClick={() => onBookingClick(l.booking)}>
                  Xem chi tiết booking
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem disabled className="text-[11px] text-muted-foreground">
                  {draggable
                    ? 'Kéo–thả để chuyển phòng/ngày'
                    : 'Đã trả phòng — không di chuyển'}
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        })}
      </div>
    </div>
  )
}
