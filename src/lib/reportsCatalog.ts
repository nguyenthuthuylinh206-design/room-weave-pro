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
  { id: 'finance', title: 'Tài chính', description: 'Doanh thu, chi phí, P&L' },
  { id: 'operations', title: 'Vận hành', description: 'Phòng, KPI tổng hợp, tổn thất' },
  { id: 'housekeeping', title: 'Buồng phòng', description: 'Hiệu năng buồng phòng và chất lượng' },
  { id: 'inventory', title: 'Kho & Mua hàng', description: 'Tồn kho, xuất kho, kiểm kê' },
  { id: 'laundry', title: 'Giặt là', description: 'Batch giặt, vendor, chi phí' },
  { id: 'maintenance', title: 'Bảo trì', description: 'Ticket, chi phí, thời gian xử lý' },
]

const ALL_PRIVILEGED: AppRole[] = ['super_admin', 'owner', 'hotel_manager']

export const REPORTS_CATALOG: ReportDefinition[] = [
  // --- Tài chính ---
  {
    id: 'revenue',
    title: 'Doanh thu',
    description: 'Phân tích doanh thu theo thời gian, kênh và loại phòng',
    path: '/reports/revenue',
    section: 'finance',
    roles: ['super_admin', 'owner', 'hotel_manager'],
  },
  {
    id: 'financial',
    title: 'Tài chính',
    description: 'Chi phí vận hành, giá trị tài sản, ROI',
    path: '/reports/financial',
    section: 'finance',
    roles: ['super_admin', 'owner', 'hotel_manager'],
  },

  // --- Vận hành ---
  {
    id: 'operations',
    title: 'KPI Vận hành',
    description: 'Giao dịch nhập/xuất, kiểm kê, lịch sử hoạt động',
    path: '/reports/operations',
    section: 'operations',
    roles: ALL_PRIVILEGED,
  },
  {
    id: 'damages',
    title: 'Hỏng / Mất',
    description: 'Thống kê tổn thất tài sản theo bộ phận',
    path: '/reports/damages',
    section: 'operations',
    roles: ALL_PRIVILEGED,
  },

  // --- Buồng phòng ---
  {
    id: 'rooms',
    title: 'Hiệu năng phòng',
    description: 'Sử dụng phòng, doanh thu, lịch sử kiểm tra',
    path: '/reports/rooms',
    section: 'housekeeping',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['housekeeping'],
  },

  // --- Kho & Mua hàng ---
  {
    id: 'inventory',
    title: 'Tồn kho',
    description: 'Trạng thái kho, vòng quay, phân tích ABC',
    path: '/reports/inventory',
    section: 'inventory',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['inventory'],
  },
  {
    id: 'stock-audit',
    title: 'Kiểm kê kho',
    description: 'Kết quả kiểm kê định kỳ, chênh lệch và điều tra',
    path: '/reports/stock-audit',
    section: 'inventory',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['inventory'],
  },
  {
    id: 'outbound',
    title: 'Xuất kho',
    description: 'Phân tích chi tiết xuất kho theo loại',
    path: '/reports/outbound',
    section: 'inventory',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['inventory'],
  },

  // --- Giặt là ---
  {
    id: 'laundry',
    title: 'Giặt là',
    description: 'Chi phí giặt, hiệu quả, đánh giá vendor',
    path: '/reports/laundry',
    section: 'laundry',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['laundry'],
  },

  // --- Bảo trì ---
  {
    id: 'maintenance',
    title: 'Bảo trì',
    description: 'Yêu cầu sửa chữa, chi phí, thời gian xử lý',
    path: '/reports/maintenance',
    section: 'maintenance',
    roles: [...ALL_PRIVILEGED, 'department_manager'],
    departments: ['maintenance'],
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
