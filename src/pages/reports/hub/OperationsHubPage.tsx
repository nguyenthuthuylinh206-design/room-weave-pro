import { ReportHubShell } from './ReportHubShell'
import { OperationsReportPage } from '../OperationsReportPage'
import { RoomsReportPage } from '../RoomsReportPage'

export function OperationsHubPage() {
  return (
    <ReportHubShell
      title="Vận hành Phòng"
      question="Phòng đang chạy ổn không?"
      tabs={[
        { id: 'kpi', label: 'KPI vận hành', Component: OperationsReportPage },
        { id: 'rooms', label: 'Hiệu năng phòng', Component: RoomsReportPage },
      ]}
      defaultTab="kpi"
    />
  )
}

export default OperationsHubPage
