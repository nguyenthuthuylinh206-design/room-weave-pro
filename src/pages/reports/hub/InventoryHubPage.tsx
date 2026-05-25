import { ReportHubShell } from './ReportHubShell'
import { InventoryReportPage } from '../InventoryReportPage'
import { OutboundReportPage } from '../OutboundReportPage'
import { StockAuditReportPage } from '../StockAuditReportPage'
import { MaintenanceReportPage } from '../MaintenanceReportPage'

export function InventoryHubPage() {
  return (
    <ReportHubShell
      title="Kho & Bảo trì"
      question="Kho có đủ không? Tài sản có được bảo trì không?"
      tabs={[
        { id: 'stock', label: 'Tồn kho', Component: InventoryReportPage },
        { id: 'outbound', label: 'Xuất kho', Component: OutboundReportPage },
        { id: 'audit', label: 'Kiểm kê', Component: StockAuditReportPage },
        { id: 'maintenance', label: 'Bảo trì', Component: MaintenanceReportPage },
      ]}
      defaultTab="stock"
    />
  )
}

export default InventoryHubPage
