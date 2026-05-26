import { useState } from 'react'
import { ReportHubShell } from './ReportHubShell'
import { RevenueReportPage } from '../RevenueReportPage'
import { FinancialReportPage } from '../FinancialReportPage'
import { FinanceKpiStrip } from '@/components/reports/FinanceKpiStrip'
import { PeriodPresetChips } from '@/components/reports/PeriodPresetChips'
import { resolvePeriod, type PeriodPresetId } from '@/lib/reportPeriods'

export function FinanceHubPage() {
  const [periodId, setPeriodId] = useState<PeriodPresetId>('this_month')
  const period = resolvePeriod(periodId)

  return (
    <ReportHubShell
      title="Báo cáo Tài chính"
      question="Tháng này lời hay lỗ? Tiền đi đâu?"
      tabs={[
        { id: 'revenue', label: 'Doanh thu', Component: RevenueReportPage },
        { id: 'costs', label: 'Chi phí & Lợi nhuận', Component: FinancialReportPage },
      ]}
      defaultTab="revenue"
      scorecard={
        <div className="space-y-3">
          <PeriodPresetChips value={periodId} onChange={setPeriodId} />
          <FinanceKpiStrip period={period} />
        </div>
      }
    />
  )
}

export default FinanceHubPage
