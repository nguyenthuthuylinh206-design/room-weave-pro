import { ReportHubShell } from './ReportHubShell'
import { LaundryReportPage } from '../LaundryReportPage'

export function HousekeepingHubPage() {
  return (
    <ReportHubShell
      title="Buồng phòng & Giặt là"
      question="Đội buồng phòng & giặt là chạy có hiệu quả không?"
      tabs={[
        // Sprint 1: chỉ gom Giặt là. Tab "Buồng phòng" (QC/throughput) bổ sung sau.
        { id: 'laundry', label: 'Giặt là', Component: LaundryReportPage },
      ]}
      defaultTab="laundry"
    />
  )
}

export default HousekeepingHubPage
