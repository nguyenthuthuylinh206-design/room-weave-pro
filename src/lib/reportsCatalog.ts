/**
 * Reports Catalog — Single source of truth cho toàn bộ báo cáo
 * Sprint A: Reports Hub role-based foundation.
 *
 * Quy tắc lọc:
 * - super_admin / owner: thấy mọi section.
 * - hotel_manager: thấy mọi section (giới hạn theo hotel được gán — đã xử lý ở HotelContext).
 * - department_manager: chỉ thấy section trùng `departments` của họ (positions.department).
 * - staff: không vào /reports (đã chặn ở route).
 *
 * Export quyền:
 * - owner / hotel_manager: export mọi báo cáo trong scope.
 * - department_manager: export báo cáo bộ phận của mình.
 */

import type { AppRole } from '@/types/database.types'

export type ReportSectionId =
  | 'finance'
  | 'operations'
  | 'housekeeping'
  | 'inventory'
  | 'laundry'
  | 'maintenance'

export type DepartmentCode =
  | 'housekeeping'
  | 'laundry'
  | 'inventory'
  | 'maintenance'

export interface ReportDefinition {
  id: string
  /** i18n-friendly title (đã Việt hoá; không cần t() vì hub Việt-first). */
  title: string
  description: string
  path: string
  section: ReportSectionId
  /** Các role legacy được phép xem. */
  roles: AppRole[]
  /**
   * Nếu set, department_manager phải thuộc 1 trong các department này mới thấy.
   * Bỏ qua khi role là owner/super_admin/hotel_manager.
   */
  departments?: DepartmentCode[]
  /** Hiển thị nhãn "Mới" trên card. */
  isNew?: boolean
}

export interface ReportSection {
  id: ReportSectionId
  title: string
  description: string
}

export const REPORT_SECTIONS: ReportSection[] = [
  { id: 'finance', title: 'Tài chính', description: 'Doanh thu, chi phí, lợi nhuận' },
  { id: 'operations', title: 'Vận hành phòng', description: 'Hiệu năng, tổn thất, KPI' },
  { id: 'housekeeping', title: 'Buồng phòng & Giặt là', description: 'QC, giặt là, hiệu suất bộ phận' },
  { id: 'inventory', title: 'Kho & Bảo trì', description: 'Tồn kho, xuất kho, kiểm kê, bảo trì' },
]

const ALL_PRIVILEGED: AppRole[] = ['super_admin', 'owner', 'hotel_manager']

export const REPORTS_CATALOG: ReportDefinition[] = [
  {
    id: 'room-revenue',
    title: 'Doanh thu phòng',
    description: 'Hôm nay thu bao nhiêu? Công suất, ADR, RevPAR.',
    path: '/reports/room-revenue',
    section: 'finance',
    roles: ALL_PRIVILEGED,
  },
  {
    id: 'cash-flow',
    title: 'Dòng tiền',
    description: 'Tiền vào, tiền ra, công nợ, OTA giữ và khoản sắp phải trả.',
    path: '/reports/cash-flow',
    section: 'finance',
    roles: ALL_PRIVILEGED,
    isNew: true,
  },
  {
    id: 'finance',
    title: 'Tài chính',
    description: 'Tháng này lời/lỗ bao nhiêu? Tiền đi đâu?',
    path: '/reports/finance',
    section: 'finance',
    roles: ALL_PRIVILEGED,
  },
  {
    id: 'operations',
    title: 'Vận hành phòng',
    description: 'Phòng đang chạy ổn không? Có hỏng/mất gì không?',
    path: '/reports/operations',
    section: 'operations',
    roles: ALL_PRIVILEGED,
  },
  {
    id: 'housekeeping',
    title: 'Buồng phòng & Giặt là',
    description: 'Đội buồng phòng & giặt là chạy hiệu quả không?',
    path: '/reports/housekeeping',
    section: 'housekeeping',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['housekeeping', 'laundry'],
  },
  {
    id: 'inventory',
    title: 'Kho & Bảo trì',
    description: 'Kho có đủ không? Tài sản có được bảo trì không?',
    path: '/reports/inventory',
    section: 'inventory',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['inventory', 'maintenance'],
  },
]

export interface ReportAccessContext {
  role?: AppRole | null
  department?: DepartmentCode | string | null
}

/**
 * Lọc catalog theo role + department hiện tại.
 * Trả về danh sách báo cáo user được phép xem.
 */
export function filterReportsForUser(
  catalog: ReportDefinition[],
  ctx: ReportAccessContext,
): ReportDefinition[] {
  const { role, department } = ctx
  if (!role) return []

  return catalog.filter((r) => {
    if (!r.roles.includes(role)) return false

    // department_manager phải khớp department
    if (role === 'department_manager') {
      if (!r.departments || r.departments.length === 0) return false
      if (!department) return false
      return r.departments.includes(department as DepartmentCode)
    }

    return true
  })
}

/**
 * Trả về các section còn báo cáo sau khi lọc, theo đúng thứ tự REPORT_SECTIONS.
 */
export function groupReportsBySection(reports: ReportDefinition[]): Array<{
  section: ReportSection
  reports: ReportDefinition[]
}> {
  return REPORT_SECTIONS
    .map((section) => ({
      section,
      reports: reports.filter((r) => r.section === section.id),
    }))
    .filter((g) => g.reports.length > 0)
}

/**
 * Quyền export: owner / hotel_manager export mọi báo cáo trong scope;
 * department_manager export báo cáo thuộc bộ phận mình.
 */
export function canExportReport(
  report: ReportDefinition,
  ctx: ReportAccessContext,
): boolean {
  const { role, department } = ctx
  if (!role) return false
  if (role === 'super_admin' || role === 'owner' || role === 'hotel_manager') return true
  if (role === 'department_manager') {
    if (!report.departments || !department) return false
    return report.departments.includes(department as DepartmentCode)
  }
  return false
}
