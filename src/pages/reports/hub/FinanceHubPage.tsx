import { useState } from 'react'
import { ReportHubShell } from './ReportHubShell'
import { RoomRevenueReportPage } from '../RoomRevenueReportPage'
import { CashFlowReportPage } from '../CashFlowReportPage'
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
      question="Hôm nay thu bao nhiêu? Tháng này lời hay lỗ? Tiền đi đâu?"
      tabs={[
        {
          id: 'room-revenue',
          label: 'Doanh thu phòng',
          render: () => <RoomRevenueReportPage period={period} embedded />,
        },
        {
          id: 'cash-flow',
          label: 'Dòng tiền',
          render: () => <CashFlowReportPage period={period} embedded />,
        },
        {
          id: 'costs',
          label: 'Chi phí & Lợi nhuận',
          render: () => <FinancialReportPage period={period} embedded />,
        },
      ]}
      defaultTab="room-revenue"
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
