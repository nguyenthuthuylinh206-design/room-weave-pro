import { useMemo } from 'react'
import { ArrowUpRight, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useInventoryDashboard } from '@/hooks/useInventoryDashboard'
import { useLatestConsumptionSnapshots } from '@/hooks/useConsumptionAnalytics'
import { useDeadStockReport } from '@/hooks/useDeadStockReport'
import { useInventoryHubBadges } from '@/hooks/useInventoryHubBadges'
import { Skeleton } from '@/components/ui/skeleton'

function formatVnd(value: number) {
  if (!value) return '0 ₫'
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} tỷ ₫`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} tr ₫`
  return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
}

type Tone = 'default' | 'warning' | 'danger' | 'success'

interface Props {
  onNavigate: (tab: string, sub?: string) => void
}

export function InventoryKpiGrid({ onNavigate }: Props) {
  const { data: stats, isLoading } = useInventoryDashboard()
  const { data: snapshots } = useLatestConsumptionSnapshots(500)
  const { data: deadStock } = useDeadStockReport(90)
  const { data: badges } = useInventoryHubBadges()

  const forecastSoonOut = useMemo(() => {
    if (!snapshots) return 0
    return snapshots.filter(
      (s) =>
        s.stock_days_remaining !== null &&
        s.stock_days_remaining >= 0 &&
        s.stock_days_remaining < 7,
    ).length
  }, [snapshots])

  const deadStockValue = useMemo(
    () => (deadStock ?? []).reduce((acc, r) => acc + (r.total_value || 0), 0),
    [deadStock],
  )
  const deadStockCount = (deadStock ?? []).length

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-12 lg:auto-rows-[112px]">
        <Skeleton className="lg:col-span-6 lg:row-span-2 h-[232px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[112px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[112px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[112px] rounded-xl" />
        <Skeleton className="lg:col-span-3 h-[112px] rounded-xl" />
      </div>
    )
  }

  const deltaPct = stats?.stock_value_change_percent ?? 0
  const deltaPositive = deltaPct >= 0

  const small: Array<{
    label: string
    value: string
    hint?: string
    tone?: Tone
    onClick: () => void
  }> = [
    {
      label: 'Số SKU',
      value: stats ? new Intl.NumberFormat('vi-VN').format(stats.total_product_types) : '—',
      hint: stats ? `${new Intl.NumberFormat('vi-VN').format(stats.total_items_count)} items` : undefined,
      onClick: () => onNavigate('assets', 'items'),
    },
    {
      label: 'Sắp hết · <7 ngày',
      value: String(forecastSoonOut),
      hint: 'Dự báo tiêu hao 30 ngày',
      tone: forecastSoonOut > 0 ? 'danger' : 'success',
      onClick: () => onNavigate('analytics', 'consumption'),
    },
    {
      label: 'Cần đặt lại',
      value: String(badges?.reorderPending ?? stats?.reorder_needed_count ?? 0),
      hint: 'Dưới điểm đặt hàng',
      tone: (badges?.reorderPending ?? 0) > 0 ? 'warning' : 'default',
      onClick: () => onNavigate('operations', 'reorder'),
    },
    {
      label: 'Tồn ứ đọng ≥90d',
      value: deadStockCount ? `${deadStockCount}` : '0',
      hint: deadStockCount ? formatVnd(deadStockValue) : 'Không có',
      tone: deadStockCount > 0 ? 'warning' : 'default',
      onClick: () => onNavigate('analytics', 'dead-stock'),
    },
  ]

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-12 lg:auto-rows-[112px]">
      {/* HERO TILE — Tổng giá trị kho */}
      <button
        type="button"
        onClick={() => onNavigate('analytics', 'consumption')}
        className={cn(
          'group relative overflow-hidden text-left rounded-xl col-span-2 lg:col-span-6 lg:row-span-2',
          'border border-ink/15 dark:border-border',
          'bg-gradient-to-br from-ink via-ink-2 to-steel text-paper',
          'shadow-tile transition-all hover:shadow-lg hover:-translate-y-px',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel focus-visible:ring-offset-2',
          'p-5 flex flex-col justify-between min-h-[200px]',
        )}
      >
        {/* decorative grid lines */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative flex items-start justify-between">
          <div>
            <div className="font-body text-[11px] font-medium uppercase tracking-[0.14em] text-paper/70">
              Tổng giá trị tồn kho
            </div>
            <div className="mt-2 font-display text-3xl lg:text-[44px] font-semibold leading-none tracking-tight tabular-nums">
              {stats ? formatVnd(stats.total_stock_value) : '—'}
            </div>
            {stats && (
              <div
                className={cn(
                  'mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium font-body',
                  deltaPositive ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200',
                )}
              >
                {deltaPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {deltaPositive ? '+' : ''}{deltaPct.toFixed(1)}% so tháng trước
              </div>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 text-paper/60 group-hover:text-paper transition-colors" />
        </div>

        <div className="relative grid grid-cols-3 gap-3 pt-4 border-t border-paper/15">
          <HeroStat label="Hôm nay" value={stats ? String(stats.today_transactions.total) : '—'} sub={stats ? `${stats.today_transactions.in} nhập · ${stats.today_transactions.out} xuất` : ''} />
          <HeroStat label="Sắp hết" value={String(forecastSoonOut)} sub="<7 ngày" />
          <HeroStat label="Ứ đọng" value={String(deadStockCount)} sub="≥90 ngày" />
        </div>
      </button>

      {/* 4 KPI tiles */}
      {small.map((k) => (
        <button
          key={k.label}
          type="button"
          onClick={k.onClick}
          className={cn(
            'group relative text-left rounded-xl border border-border/70 bg-card p-4 transition-all',
            'col-span-1 lg:col-span-3',
            'hover:border-steel/50 hover:shadow-tile focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel',
          )}
        >
          <div className="font-body text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {k.label}
          </div>
          <div
            className={cn(
              'mt-1.5 font-display text-2xl lg:text-[26px] font-semibold tabular-nums leading-none tracking-tight',
              k.tone === 'danger' && 'text-rose-600',
              k.tone === 'warning' && 'text-amber-600',
              k.tone === 'success' && 'text-emerald-600',
            )}
          >
            {k.value}
          </div>
          {k.hint && (
            <div className="mt-2 font-body text-[11px] text-muted-foreground line-clamp-1">{k.hint}</div>
          )}
          <ArrowUpRight className="absolute top-3 right-3 h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-steel transition-colors" />
        </button>
      ))}
    </div>
  )
}

function HeroStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="font-body text-[10px] uppercase tracking-[0.12em] text-paper/55">{label}</div>
      <div className="font-display text-lg font-semibold tabular-nums leading-tight">{value}</div>
      <div className="font-body text-[10px] text-paper/55 line-clamp-1">{sub}</div>
    </div>
  )
}
