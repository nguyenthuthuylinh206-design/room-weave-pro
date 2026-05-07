import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Link } from 'react-router-dom'
import { AlertTriangle, PackageSearch, Clock } from 'lucide-react'
import { useDeadStockReport } from '@/hooks/useDeadStockReport'
import { useLatestConsumptionSnapshots } from '@/hooks/useConsumptionAnalytics'

function formatCompact(amount: number) {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(0)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`
  return amount.toString()
}

export function InventoryAlertsWidget() {
  const { data: deadRows, isLoading: loadingDead } = useDeadStockReport(90)
  const { data: snapshots, isLoading: loadingSnap } = useLatestConsumptionSnapshots(500)

  const summary = useMemo(() => {
    const dead_count = deadRows?.length ?? 0
    const dead_value = (deadRows ?? []).reduce(
      (s, r) => s + Number(r.total_value || 0),
      0,
    )
    // latest per item
    const latest = new Map<string, typeof snapshots[number]>()
    ;(snapshots ?? []).forEach((s) => {
      const cur = latest.get(s.item_id)
      if (!cur || cur.snapshot_date < s.snapshot_date) latest.set(s.item_id, s)
    })
    const critical = Array.from(latest.values()).filter(
      (s) => s.stock_days_remaining != null && s.stock_days_remaining < 7,
    ).length
    return { dead_count, dead_value, critical }
  }, [deadRows, snapshots])

  const isLoading = loadingDead || loadingSnap

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          Cảnh báo kho
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : (
          <>
            <Link
              to="/inventory/analytics"
              className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-xs">Sắp hết hàng (&lt; 7 ngày)</span>
              </div>
              <span className={`text-lg font-semibold ${summary.critical > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                {summary.critical}
              </span>
            </Link>
            <Link
              to="/inventory/dead-stock"
              className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <PackageSearch className="h-4 w-4 text-amber-600" />
                <div className="flex flex-col">
                  <span className="text-xs">Tồn ứ đọng (≥ 90 ngày)</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatCompact(summary.dead_value)} ₫
                  </span>
                </div>
              </div>
              <span className={`text-lg font-semibold ${summary.dead_count > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {summary.dead_count}
              </span>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  )
}
