import { describe, it, expect } from 'vitest'
import {
  REPORTS_CATALOG,
  filterReportsForUser,
  groupReportsBySection,
  canExportReport,
} from './reportsCatalog'

describe('reportsCatalog', () => {
  describe('filterReportsForUser', () => {
    it('owner thấy toàn bộ báo cáo', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'owner' })
      expect(r.length).toBe(REPORTS_CATALOG.length)
    })

    it('hotel_manager thấy toàn bộ báo cáo', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'hotel_manager' })
      expect(r.length).toBe(REPORTS_CATALOG.length)
    })

    it('department_manager housekeeping chỉ thấy báo cáo HK', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'housekeeping',
      })
      expect(r.every((x) => x.departments?.includes('housekeeping'))).toBe(true)
      expect(r.some((x) => x.id === 'rooms')).toBe(true)
      expect(r.some((x) => x.id === 'inventory')).toBe(false)
      expect(r.some((x) => x.id === 'revenue')).toBe(false)
    })

    it('department_manager inventory thấy đủ inventory/stock-audit/outbound', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'inventory',
      })
      const ids = r.map((x) => x.id).sort()
      expect(ids).toEqual(['inventory', 'outbound', 'stock-audit'])
    })

    it('department_manager không có department → không thấy gì', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'department_manager' })
      expect(r.length).toBe(0)
    })

    it('staff không thấy báo cáo nào', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'staff' })
      expect(r.length).toBe(0)
    })

    it('không có role → mảng rỗng', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {})
      expect(r.length).toBe(0)
    })
  })

  describe('groupReportsBySection', () => {
    it('không trả về section rỗng', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'laundry',
      })
      const grouped = groupReportsBySection(r)
      expect(grouped.length).toBe(1)
      expect(grouped[0].section.id).toBe('laundry')
    })

    it('giữ đúng thứ tự section', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'owner' })
      const grouped = groupReportsBySection(r)
      const order = grouped.map((g) => g.section.id)
      expect(order).toEqual([
        'finance',
        'operations',
        'housekeeping',
        'inventory',
        'laundry',
        'maintenance',
      ])
    })
  })

  describe('canExportReport', () => {
    const inventoryReport = REPORTS_CATALOG.find((r) => r.id === 'inventory')!
    const revenueReport = REPORTS_CATALOG.find((r) => r.id === 'revenue')!

    it('owner export mọi báo cáo', () => {
      expect(canExportReport(revenueReport, { role: 'owner' })).toBe(true)
      expect(canExportReport(inventoryReport, { role: 'owner' })).toBe(true)
    })

    it('hotel_manager export mọi báo cáo', () => {
      expect(canExportReport(revenueReport, { role: 'hotel_manager' })).toBe(true)
    })

    it('department_manager export báo cáo của bộ phận mình', () => {
      expect(
        canExportReport(inventoryReport, { role: 'department_manager', department: 'inventory' }),
      ).toBe(true)
    })

    it('department_manager KHÔNG export báo cáo bộ phận khác', () => {
      expect(
        canExportReport(inventoryReport, { role: 'department_manager', department: 'laundry' }),
      ).toBe(false)
      expect(
        canExportReport(revenueReport, { role: 'department_manager', department: 'inventory' }),
      ).toBe(false)
    })

    it('staff không bao giờ export', () => {
      expect(canExportReport(revenueReport, { role: 'staff' })).toBe(false)
    })
  })
})
