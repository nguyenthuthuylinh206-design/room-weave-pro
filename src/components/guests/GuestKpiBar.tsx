import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { GuestStats } from '@/hooks/useGuestsV2'
import type { GuestSegment } from '@/hooks/useGuestsV2'

interface Props {
  stats?: GuestStats
  isLoading?: boolean
  active: GuestSegment
  onSelect: (s: GuestSegment) => void
}

interface Tile {
  key: GuestSegment | 'revenue'
  label: string
  value: number | string
  segment?: GuestSegment
  tone?: 'default' | 'amber' | 'red' | 'green'
}

export function GuestKpiBar({ stats, isLoading, active, onSelect }: Props) {
  const tiles: Tile[] = [
    { key: 'all', label: 'Tổng khách', value: stats?.total ?? 0, segment: 'all' },
    { key: 'vip', label: 'VIP / Vàng', value: stats?.vip ?? 0, segment: 'vip', tone: 'amber' },
    { key: 'new', label: 'Mới (30 ngày)', value: stats?.newCount ?? 0, segment: 'new', tone: 'green' },
    { key: 'returning', label: 'Quay lại', value: stats?.returning ?? 0, segment: 'returning' },
    { key: 'birthday', label: 'Sinh nhật tháng', value: stats?.birthday ?? 0, segment: 'birthday', tone: 'amber' },
    { key: 'revenue', label: 'Tổng chi tiêu', value: formatCurrency(stats?.totalRevenue ?? 0) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {tiles.map((t) => {
        const isActive = t.segment && t.segment === active
        const clickable = !!t.segment
        return (
          <button
            key={t.key}
            type="button"
            disabled={!clickable}
            onClick={() => t.segment && onSelect(t.segment)}
            className={cn(
              'text-left border rounded-lg p-3 transition-colors',
              clickable && 'hover:bg-accent/50 cursor-pointer',
              !clickable && 'cursor-default',
              isActive && 'border-foreground ring-1 ring-foreground/20',
            )}
          >
            <div className="text-xs text-muted-foreground truncate">{t.label}</div>
            <div className={cn(
              'mt-1 text-lg font-semibold tabular-nums',
              t.tone === 'amber' && 'text-amber-600',
              t.tone === 'red' && 'text-red-600',
              t.tone === 'green' && 'text-green-600',
            )}>
              {isLoading ? <span className="inline-block w-12 h-5 bg-muted rounded animate-pulse" /> : t.value}
            </div>
          </button>
        )
      })}
    </div>
  )
}
