import { describe, it, expect } from 'vitest'
import {
  REPORTS_CATALOG,
  filterReportsForUser,
  groupReportsBySection,
  canExportReport,
} from './reportsCatalog'

describe('reportsCatalog (consolidated hubs)', () => {
  describe('filterReportsForUser', () => {
    it('owner thấy toàn bộ 4 báo cáo hub', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'owner' })
      expect(r.length).toBe(REPORTS_CATALOG.length)
      expect(r.length).toBe(4)
    })

    it('hotel_manager thấy toàn bộ báo cáo', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'hotel_manager' })
      expect(r.length).toBe(REPORTS_CATALOG.length)
    })

    it('department_manager housekeeping chỉ thấy hub housekeeping', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'housekeeping',
      })
      const ids = r.map((x) => x.id)
      expect(ids).toEqual(['housekeeping'])
    })

    it('department_manager laundry thấy hub housekeeping (gộp giặt là)', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'laundry',
      })
      expect(r.map((x) => x.id)).toEqual(['housekeeping'])
    })

    it('department_manager inventory thấy hub inventory', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'inventory',
      })
      expect(r.map((x) => x.id)).toEqual(['inventory'])
    })

    it('department_manager maintenance thấy hub inventory (gộp bảo trì)', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'maintenance',
      })
      expect(r.map((x) => x.id)).toEqual(['inventory'])
    })

    it('department_manager không có department → không thấy gì', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'department_manager' })
      expect(r.length).toBe(0)
    })

    it('staff không thấy báo cáo nào', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'staff' })
      expect(r.length).toBe(0)
    })
  })

  describe('groupReportsBySection', () => {
    it('owner: đúng thứ tự 4 section', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, { role: 'owner' })
      const order = groupReportsBySection(r).map((g) => g.section.id)
      expect(order).toEqual(['finance', 'operations', 'housekeeping', 'inventory'])
    })

    it('department_manager housekeeping: chỉ section housekeeping', () => {
      const r = filterReportsForUser(REPORTS_CATALOG, {
        role: 'department_manager',
        department: 'housekeeping',
      })
      const grouped = groupReportsBySection(r)
      expect(grouped.length).toBe(1)
      expect(grouped[0].section.id).toBe('housekeeping')
    })
  })

  describe('canExportReport', () => {
    const financeHub = REPORTS_CATALOG.find((r) => r.id === 'finance')!
    const inventoryHub = REPORTS_CATALOG.find((r) => r.id === 'inventory')!

    it('owner / hotel_manager export mọi báo cáo', () => {
      expect(canExportReport(financeHub, { role: 'owner' })).toBe(true)
      expect(canExportReport(inventoryHub, { role: 'hotel_manager' })).toBe(true)
    })

    it('department_manager inventory export hub inventory (gồm bảo trì)', () => {
      expect(
        canExportReport(inventoryHub, { role: 'department_manager', department: 'inventory' }),
      ).toBe(true)
      expect(
        canExportReport(inventoryHub, { role: 'department_manager', department: 'maintenance' }),
      ).toBe(true)
    })

    it('department_manager KHÔNG export hub tài chính', () => {
      expect(
        canExportReport(financeHub, { role: 'department_manager', department: 'inventory' }),
      ).toBe(false)
    })

    it('staff không bao giờ export', () => {
      expect(canExportReport(financeHub, { role: 'staff' })).toBe(false)
    })
  })
})
