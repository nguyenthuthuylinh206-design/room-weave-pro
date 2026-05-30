import { useMemo } from 'react'
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

type Kpi = {
  label: string
  value: string
  hint?: string
  tone?: 'default' | 'warning' | 'danger' | 'success'
  onClick?: () => void
}

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

  const kpis: Kpi[] = [
    {
      label: 'Tổng giá trị kho',
      value: stats ? formatVnd(stats.total_stock_value) : '—',
      hint: stats?.stock_value_change_percent
        ? `${stats.stock_value_change_percent > 0 ? '+' : ''}${stats.stock_value_change_percent.toFixed(1)}% so tháng trước`
        : 'Tồn cuối kỳ',
      onClick: () => onNavigate('analytics', 'consumption'),
    },
    {
      label: 'Số SKU',
      value: stats ? new Intl.NumberFormat('vi-VN').format(stats.total_product_types) : '—',
      hint: stats ? `${new Intl.NumberFormat('vi-VN').format(stats.total_items_count)} items` : undefined,
      onClick: () => onNavigate('assets', 'items'),
    },
    {
      label: 'Sắp hết (<7 ngày)',
      value: String(forecastSoonOut),
      hint: 'Dự báo từ tiêu hao 30 ngày',
      tone: forecastSoonOut > 0 ? 'danger' : 'success',
      onClick: () => onNavigate('analytics', 'consumption'),
    },
    {
      label: 'Cần đặt lại',
      value: String(badges?.reorderPending ?? stats?.reorder_needed_count ?? 0),
      hint: 'Items dưới điểm đặt hàng',
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
    {
      label: 'Giao dịch hôm nay',
      value: stats ? String(stats.today_transactions.total) : '—',
      hint: stats
        ? `${stats.today_transactions.in} nhập · ${stats.today_transactions.out} xuất`
        : undefined,
      onClick: () => onNavigate('operations', 'transactions'),
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {kpis.map((k) => (
        <button
          key={k.label}
          type="button"
          onClick={k.onClick}
          className={cn(
            'group text-left rounded-lg border bg-card p-3 transition-colors',
            'hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {k.label}
          </div>
          <div
            className={cn(
              'mt-1 text-xl font-semibold tabular-nums leading-tight',
              k.tone === 'danger' && 'text-red-600',
              k.tone === 'warning' && 'text-amber-600',
              k.tone === 'success' && 'text-green-600',
            )}
          >
            {k.value}
          </div>
          {k.hint && (
            <div className="mt-1 text-[11px] text-muted-foreground line-clamp-1">{k.hint}</div>
          )}
        </button>
      ))}
    </div>
  )
}
