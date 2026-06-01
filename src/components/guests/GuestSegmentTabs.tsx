import { cn } from '@/lib/utils'
import type { GuestSegment } from '@/hooks/useGuestsV2'

const SEGMENTS: { value: GuestSegment; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'vip', label: 'VIP' },
  { value: 'new', label: 'Mới' },
  { value: 'returning', label: 'Quay lại' },
  { value: 'birthday', label: 'Sinh nhật' },
  { value: 'blacklist', label: 'Blacklist' },
]

interface Props {
  value: GuestSegment
  onChange: (v: GuestSegment) => void
  counts?: Partial<Record<GuestSegment, number>>
}

export function GuestSegmentTabs({ value, onChange, counts }: Props) {
  return (
    <div className="border-b flex items-center gap-1 overflow-x-auto">
      {SEGMENTS.map((s) => {
        const active = s.value === value
        const count = counts?.[s.value]
        return (
          <button
            key={s.value}
            type="button"
            onClick={() => onChange(s.value)}
            className={cn(
              'px-3 h-9 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
              active ? 'border-foreground text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {s.label}
            {typeof count === 'number' && (
              <span className="ml-1 text-xs text-muted-foreground tabular-nums">({count})</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
