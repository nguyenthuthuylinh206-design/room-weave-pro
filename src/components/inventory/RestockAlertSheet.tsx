import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, PackageSearch, Clock, ChevronRight } from 'lucide-react'
import { useDeadStockReport } from '@/hooks/useDeadStockReport'
import { useLatestConsumptionSnapshots } from '@/hooks/useConsumptionAnalytics'
import { useReorderPendingCount } from '@/hooks/useReorderSuggestions'
import { cn } from '@/lib/utils'

interface RestockAlertSheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

function fmtCompactVnd(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B ₫`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M ₫`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K ₫`
  return `${n} ₫`
}

export function RestockAlertSheet({ open, onOpenChange }: RestockAlertSheetProps) {
  const navigate = useNavigate()
  const { data: dead = [], isLoading: lDead } = useDeadStockReport(90)
  const { data: snaps = [], isLoading: lSnaps } = useLatestConsumptionSnapshots(500)
  const { data: pendingCount = 0 } = useReorderPendingCount()

  const critical = useMemo(() => {
    const latest = new Map<string, any>()
    snaps.forEach((s: any) => {
      const cur = latest.get(s.item_id)
      if (!cur || cur.snapshot_date < s.snapshot_date) latest.set(s.item_id, s)
    })
    return Array.from(latest.values())
      .filter((s) => s.stock_days_remaining != null && s.stock_days_remaining < 7)
      .sort((a, b) => (a.stock_days_remaining ?? 0) - (b.stock_days_remaining ?? 0))
      .slice(0, 20)
  }, [snaps])

  const deadValue = dead.reduce((s, r) => s + Number(r.total_value || 0), 0)
  const isLoading = lDead || lSnaps

  const go = (path: string) => {
    onOpenChange(false)
    navigate(path)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Cảnh báo tồn kho
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Summary tiles */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => go('/inventory/reorder')}
                className="border rounded-lg p-3 text-left active:bg-muted/50"
              >
                <div className="text-[11px] text-muted-foreground">Gợi ý đặt</div>
                <div className={cn('text-lg font-semibold', pendingCount > 0 && 'text-amber-600')}>
                  {pendingCount}
                </div>
              </button>
              <button
                onClick={() => go('/inventory/analytics')}
                className="border rounded-lg p-3 text-left active:bg-muted/50"
              >
                <div className="text-[11px] text-muted-foreground">Sắp hết</div>
                <div className={cn('text-lg font-semibold', critical.length > 0 && 'text-red-600')}>
                  {critical.length}
                </div>
              </button>
              <button
                onClick={() => go('/inventory/dead-stock')}
                className="border rounded-lg p-3 text-left active:bg-muted/50"
              >
                <div className="text-[11px] text-muted-foreground">Ứ đọng</div>
                <div className={cn('text-lg font-semibold', dead.length > 0 && 'text-amber-600')}>
                  {dead.length}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {fmtCompactVnd(deadValue)}
                </div>
              </button>
            </div>

            {/* Critical (low days remaining) */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-red-600" />
                  Sắp hết hàng
                </h3>
                {critical.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {critical.length}
                  </Badge>
                )}
              </div>
              {isLoading ? (
                <div className="text-xs text-muted-foreground">Đang tải…</div>
              ) : critical.length === 0 ? (
                <div className="text-xs text-muted-foreground border rounded-md p-3 text-center">
                  Không có mặt hàng sắp hết
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {critical.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => go(`/items/${s.item_id}`)}
                      className="w-full flex items-center gap-2 p-3 text-left active:bg-muted/40"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{s.items?.name ?? s.item_id}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {s.items?.code ?? ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-red-600">
                          {Math.round(Number(s.stock_days_remaining ?? 0))} ngày
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          tồn {Number(s.current_stock ?? 0)}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Dead stock */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <PackageSearch className="h-4 w-4 text-amber-600" />
                  Tồn ứ đọng (≥ 90 ngày)
                </h3>
                {dead.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {fmtCompactVnd(deadValue)}
                  </Badge>
                )}
              </div>
              {isLoading ? (
                <div className="text-xs text-muted-foreground">Đang tải…</div>
              ) : dead.length === 0 ? (
                <div className="text-xs text-muted-foreground border rounded-md p-3 text-center">
                  Không có hàng ứ đọng
                </div>
              ) : (
                <div className="border rounded-lg divide-y">
                  {dead.slice(0, 10).map((r: any) => (
                    <button
                      key={r.item_id}
                      onClick={() => go(`/items/${r.item_id}`)}
                      className="w-full flex items-center gap-2 p-3 text-left active:bg-muted/40"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{r.item_name}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {r.item_code}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">{Number(r.quantity_in_stock)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {fmtCompactVnd(Number(r.total_value || 0))}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                  {dead.length > 10 && (
                    <button
                      onClick={() => go('/inventory/dead-stock')}
                      className="w-full text-xs p-2.5 text-center text-muted-foreground active:bg-muted/40"
                    >
                      Xem tất cả {dead.length} mặt hàng →
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <div className="border-t p-3 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button className="flex-1" onClick={() => go('/inventory/reorder')}>
            Xem gợi ý đặt hàng
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
