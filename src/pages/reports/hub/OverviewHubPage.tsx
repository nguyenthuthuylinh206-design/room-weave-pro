import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PeriodPresetChips } from '@/components/reports/PeriodPresetChips'
import { OverviewKpiStrip } from '@/components/reports/OverviewKpiStrip'
import { RevenueVsCostChart } from '@/components/reports/RevenueVsCostChart'
import { AlertList } from '@/components/reports/AlertList'
import { useOverviewChart, useOverviewKpiStrip } from '@/hooks/useOverviewKpiStrip'
import { useOverviewAlerts } from '@/hooks/useOverviewAlerts'
import { useAccessibleReports } from '@/hooks/useAccessibleReports'
import { useMonthlyTarget } from '@/hooks/useFixedExpenses'
import { TargetProgressBar } from '@/components/reports/TargetProgressBar'
import { resolvePeriod, type PeriodPresetId } from '@/lib/reportPeriods'
import { useBreakpoint } from '@/lib/breakpoints'

export function OverviewHubPage() {
  const [periodId, setPeriodId] = useState<PeriodPresetId>('this_month')
  const period = resolvePeriod(periodId)
  const chartQ = useOverviewChart(30)
  const alertsQ = useOverviewAlerts()
  const { reports } = useAccessibleReports()
  const { isMobile } = useBreakpoint()

  return (
    <div className="space-y-4">
      {!isMobile && (
        <PageHeader
          title="Tổng quan điều hành"
          description="Tình hình khách sạn trong 10 giây"
        />
      )}

      <Link
        to="/reports/daily"
        className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 hover:bg-primary/10 transition-colors"
      >
        <div>
          <div className="text-sm font-semibold">Báo cáo ngày</div>
          <div className="text-xs text-muted-foreground">
            Tình hình hôm qua & hôm nay trong 10 giây
          </div>
        </div>
        <span className="text-xs text-primary inline-flex items-center gap-1">
          Xem báo cáo ngày <ArrowRight className="h-3 w-3" />
        </span>
      </Link>

      <PeriodPresetChips value={periodId} onChange={setPeriodId} />

      <OverviewKpiStrip period={period} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueVsCostChart data={chartQ.data} loading={chartQ.isLoading} days={30} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-semibold px-1">Cần chú ý</h3>
          <AlertList alerts={alertsQ.data} loading={alertsQ.isLoading} />
        </div>
      </div>

      {/* Section grid phụ — navigate tới hub chi tiết */}
      {reports.length > 0 && (
        <div className="pt-2">
          <h3 className="text-sm font-semibold px-1 mb-2 text-muted-foreground uppercase tracking-wide">
            Báo cáo chi tiết
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {reports.map((r) => (
              <Link
                key={r.id}
                to={r.path}
                className="rounded-lg border border-border p-3 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{r.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {r.description}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default OverviewHubPage
