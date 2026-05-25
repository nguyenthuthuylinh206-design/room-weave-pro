import { ReportHubShell } from './ReportHubShell'
import { RevenueReportPage } from '../RevenueReportPage'
import { FinancialReportPage } from '../FinancialReportPage'

export function FinanceHubPage() {
  return (
    <ReportHubShell
      title="Báo cáo Tài chính"
      question="Tháng này lời hay lỗ? Tiền đi đâu?"
      tabs={[
        { id: 'revenue', label: 'Doanh thu', Component: RevenueReportPage },
        { id: 'costs', label: 'Chi phí & Lợi nhuận', Component: FinancialReportPage },
      ]}
      defaultTab="revenue"
    />
  )
}

export default FinanceHubPage
