import { ReportHubShell } from './ReportHubShell'
import { OperationsReportPage } from '../OperationsReportPage'
import { RoomsReportPage } from '../RoomsReportPage'
import { DamagesReportPage } from '../DamagesReportPage'

export function OperationsHubPage() {
  return (
    <ReportHubShell
      title="Vận hành Phòng"
      question="Phòng đang chạy ổn không? Có hỏng/mất gì không?"
      tabs={[
        { id: 'kpi', label: 'KPI vận hành', Component: OperationsReportPage },
        { id: 'rooms', label: 'Hiệu năng phòng', Component: RoomsReportPage },
        { id: 'damages', label: 'Hỏng / Mất', Component: DamagesReportPage },
      ]}
      defaultTab="kpi"
    />
  )
}

export default OperationsHubPage
