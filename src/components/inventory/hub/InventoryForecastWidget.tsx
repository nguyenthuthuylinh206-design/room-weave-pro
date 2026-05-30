import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLatestConsumptionSnapshots } from '@/hooks/useConsumptionAnalytics'
import { cn } from '@/lib/utils'

export function InventoryForecastWidget() {
  const navigate = useNavigate()
  const { data: snapshots, isLoading } = useLatestConsumptionSnapshots(500)

  const rows = useMemo(() => {
    if (!snapshots) return []
    return snapshots
      .filter(
        (s) =>
          s.stock_days_remaining !== null &&
          s.stock_days_remaining >= 0 &&
          s.stock_days_remaining < 14,
      )
      .sort((a, b) => (a.stock_days_remaining ?? 99) - (b.stock_days_remaining ?? 99))
      .slice(0, 8)
  }, [snapshots])

  return (
    <div className="border rounded-lg bg-card">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="text-sm font-semibold">Dự báo hết hàng</div>
        <div className="text-[11px] text-muted-foreground">≤ 14 ngày</div>
      </div>
      {isLoading ? (
        <div className="p-4 text-xs text-muted-foreground">Đang tải…</div>
      ) : rows.length === 0 ? (
        <div className="p-4 text-xs text-muted-foreground">
          Không có item nào sắp hết trong 14 ngày tới.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.map((r) => {
            const days = r.stock_days_remaining ?? 0
            const tone =
              days < 3 ? 'text-red-600' : days < 7 ? 'text-amber-600' : 'text-foreground'
            return (
              <li
                key={r.id}
                className="flex items-center justify-between px-3 py-2 hover:bg-muted/40 cursor-pointer"
                onClick={() =>
                  navigate(`/inventory?tab=operations&sub=reorder&item=${r.item_id}`)
                }
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {r.item?.name ?? r.item_id}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">
                    {r.item?.item_code} · tồn {r.stock_on_date} · TB {r.avg_daily_consumption.toFixed(1)}/ngày
                  </div>
                </div>
                <div className={cn('text-xs font-semibold tabular-nums', tone)}>
                  còn {days} ngày
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
