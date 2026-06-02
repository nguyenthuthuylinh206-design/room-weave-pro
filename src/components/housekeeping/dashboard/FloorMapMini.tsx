import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useRooms } from '@/hooks/useRooms'
import { cn } from '@/lib/utils'

// Mapping trạng thái → màu (bg dot) + label tooltip
const STATUS_STYLE: Record<string, { dot: string; label: string }> = {
  vacant_clean:     { dot: 'bg-green-500',   label: 'Trống sạch' },
  vacant_inspected: { dot: 'bg-green-600',   label: 'Đã kiểm tra' },
  vacant_dirty:     { dot: 'bg-red-500',     label: 'Cần dọn' },
  cleaning:         { dot: 'bg-blue-500',    label: 'Đang dọn' },
  occupied:         { dot: 'bg-amber-500',   label: 'Có khách' },
  occupied_clean:   { dot: 'bg-amber-500',   label: 'Có khách - sạch' },
  occupied_dirty:   { dot: 'bg-orange-600',  label: 'Có khách - bẩn' },
  dnd:              { dot: 'bg-purple-500',  label: 'Không làm phiền' },
  sleep_out:        { dot: 'bg-indigo-500',  label: 'Vắng đêm' },
  service_refused:  { dot: 'bg-pink-500',    label: 'Từ chối dọn' },
  skipper:          { dot: 'bg-rose-700',    label: 'Khách bỏ trốn' },
  out_of_order:     { dot: 'bg-red-700',     label: 'Hỏng' },
  out_of_service:   { dot: 'bg-zinc-600',    label: 'Tạm khóa' },
  maintenance:      { dot: 'bg-zinc-500',    label: 'Bảo trì' },
  check_in:         { dot: 'bg-emerald-500', label: 'Đang nhận' },
  check_out:        { dot: 'bg-orange-500',  label: 'Đang trả' },
  vacant:           { dot: 'bg-green-500',   label: 'Trống' },
}

function styleFor(status?: string | null) {
  return STATUS_STYLE[status || ''] || { dot: 'bg-zinc-300', label: status || '—' }
}

const LEGEND_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'vacant_clean',  label: 'Trống sạch' },
  { key: 'vacant_dirty',  label: 'Cần dọn' },
  { key: 'cleaning',      label: 'Đang dọn' },
  { key: 'occupied',      label: 'Có khách' },
  { key: 'dnd',           label: 'DND' },
  { key: 'out_of_order',  label: 'Hỏng' },
  { key: 'out_of_service',label: 'Tạm khóa' },
]

export function FloorMapMini() {
  const { data: rooms, isLoading } = useRooms()

  const byFloor = useMemo(() => {
    const groups = new Map<number, Array<{ id: string; room_number: string; status?: string | null }>>()
    for (const r of rooms || []) {
      const f = (r.floor ?? 0) as number
      if (!groups.has(f)) groups.set(f, [])
      groups.get(f)!.push({ id: r.id, room_number: r.room_number, status: r.status as string | undefined })
    }
    for (const list of groups.values()) {
      list.sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0])
  }, [rooms])

  if (isLoading) {
    return <div className="border rounded-lg h-32 animate-pulse bg-muted/30" />
  }

  if (!byFloor.length) {
    return (
      <div className="border rounded-lg p-4 text-sm text-muted-foreground text-center">
        Chưa có phòng nào.
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Sơ đồ phòng</h3>
        <Link to="/rooms?view=floor" className="text-xs text-muted-foreground hover:text-foreground">
          Xem đầy đủ →
        </Link>
      </div>

      <div className="p-3 flex flex-col gap-3">
        {byFloor.map(([floor, list]) => (
          <div key={floor} className="flex items-start gap-3">
            <div className="text-xs text-muted-foreground w-12 shrink-0 pt-1.5 tabular-nums">
              Tầng {floor || '—'}
            </div>
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {list.map((r) => {
                const s = styleFor(r.status)
                return (
                  <Link
                    key={r.id}
                    to={`/rooms/${r.id}`}
                    title={`P${r.room_number} · ${s.label}`}
                    className="inline-flex items-center gap-1 border rounded px-1.5 py-0.5 hover:bg-muted/60 transition-colors"
                  >
                    <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                    <span className="text-xs font-medium tabular-nums">{r.room_number}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t px-3 py-2 flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND_ITEMS.map((it) => (
          <span key={it.key} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={cn('h-2 w-2 rounded-full', styleFor(it.key).dot)} />
            {it.label}
          </span>
        ))}
      </div>
    </div>
  )
}
