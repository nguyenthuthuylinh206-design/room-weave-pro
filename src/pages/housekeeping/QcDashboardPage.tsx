import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQcStaffStats, useQcFloorStats } from '@/hooks/useQcStats'
import { usePendingReviewCount } from '@/hooks/usePendingReviewCount'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'

/**
 * Dashboard QC — tổng quan chất lượng buồng phòng 30 ngày gần nhất.
 * Dành cho Manager / Owner có quyền manage_housekeeping.
 */
export default function QcDashboardPage() {
  const { data: staffStats, isLoading: loadingStaff } = useQcStaffStats()
  const { data: floorStats, isLoading: loadingFloor } = useQcFloorStats()
  const { data: pendingCount = 0 } = usePendingReviewCount()

  const totals = useMemo(() => {
    const s = staffStats ?? []
    const totalCompleted = s.reduce((a, x) => a + (x.total_completed ?? 0), 0)
    const totalRework = s.reduce((a, x) => a + (x.rework_count ?? 0), 0)
    const reworkRate = totalCompleted > 0 ? (totalRework / totalCompleted) * 100 : 0
    return { totalCompleted, totalRework, reworkRate }
  }, [staffStats])

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Dashboard QC</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Chất lượng dọn phòng 30 ngày gần nhất
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/housekeeping/review">
            Chờ duyệt {pendingCount > 0 && `(${pendingCount})`}
          </Link>
        </Button>
      </header>

      {/* KPI tổng */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiBox label="Đã hoàn thành" value={totals.totalCompleted} />
        <KpiBox label="Đang chờ duyệt" value={pendingCount} tone={pendingCount > 0 ? 'warn' : undefined} />
        <KpiBox label="Phải làm lại" value={totals.totalRework} tone={totals.totalRework > 0 ? 'bad' : undefined} />
        <KpiBox
          label="Tỉ lệ rework"
          value={`${totals.reworkRate.toFixed(1)}%`}
          tone={totals.reworkRate > 10 ? 'bad' : totals.reworkRate > 5 ? 'warn' : 'good'}
        />
      </div>

      {/* Theo nhân viên */}
      <section className="border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Theo nhân viên</h2>
        </div>
        {loadingStaff ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (staffStats?.length ?? 0) === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/20">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nhân viên</th>
                  <th className="text-right px-3 py-2 font-medium">Hoàn thành</th>
                  <th className="text-right px-3 py-2 font-medium">Chờ duyệt</th>
                  <th className="text-right px-3 py-2 font-medium">Làm lại</th>
                  <th className="text-right px-3 py-2 font-medium">Tỉ lệ rework</th>
                </tr>
              </thead>
              <tbody>
                {staffStats!.map((s) => {
                  const rate = s.rework_rate_pct ?? 0
                  const tone = rate > 10 ? 'text-red-600' : rate > 5 ? 'text-amber-600' : 'text-green-600'
                  return (
                    <tr key={s.user_id} className="border-t">
                      <td className="px-3 py-2">{s.full_name || '—'}</td>
                      <td className="px-3 py-2 text-right">{s.total_completed}</td>
                      <td className="px-3 py-2 text-right">{s.pending_count}</td>
                      <td className="px-3 py-2 text-right">{s.rework_count}</td>
                      <td className={`px-3 py-2 text-right font-medium ${tone}`}>
                        {s.rework_rate_pct == null ? '—' : `${s.rework_rate_pct}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Theo tầng */}
      <section className="border rounded-lg overflow-hidden">
        <div className="px-4 py-2 border-b bg-muted/30">
          <h2 className="text-sm font-medium">Theo tầng</h2>
        </div>
        {loadingFloor ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-8" />
            <Skeleton className="h-8" />
          </div>
        ) : (floorStats?.length ?? 0) === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">Chưa có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/20">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Tầng</th>
                  <th className="text-right px-3 py-2 font-medium">Tổng task</th>
                  <th className="text-right px-3 py-2 font-medium">Chờ duyệt</th>
                  <th className="text-right px-3 py-2 font-medium">Làm lại</th>
                  <th className="text-right px-3 py-2 font-medium">Tỉ lệ rework</th>
                </tr>
              </thead>
              <tbody>
                {floorStats!.map((f, idx) => {
                  const rate = f.rework_rate_pct ?? 0
                  const tone = rate > 10 ? 'text-red-600' : rate > 5 ? 'text-amber-600' : 'text-green-600'
                  return (
                    <tr key={`${f.floor}-${idx}`} className="border-t">
                      <td className="px-3 py-2">Tầng {f.floor ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{f.total_tasks}</td>
                      <td className="px-3 py-2 text-right">{f.pending_tasks}</td>
                      <td className="px-3 py-2 text-right">{f.rework_tasks}</td>
                      <td className={`px-3 py-2 text-right font-medium ${tone}`}>
                        {f.rework_rate_pct == null ? '—' : `${f.rework_rate_pct}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function KpiBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string | number
  tone?: 'good' | 'warn' | 'bad'
}) {
  const colorClass =
    tone === 'bad'
      ? 'text-red-600'
      : tone === 'warn'
      ? 'text-amber-600'
      : tone === 'good'
      ? 'text-green-600'
      : ''
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${colorClass}`}>{value}</div>
    </div>
  )
}
