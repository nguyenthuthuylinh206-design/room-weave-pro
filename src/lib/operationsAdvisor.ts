/**
 * Operations Advisor — Rule engine sinh lời khuyên vận hành.
 * Output đi vào edge function `operations-advisor` để AI viết lại tự nhiên.
 *
 * Mỗi rule pure function: nhận snapshot → trả Finding hoặc null.
 */

import { classifyBenchmark, INDUSTRY_BENCHMARKS } from './industryBenchmarks'

export interface KpiSnapshot {
  /** Số ngày trong kỳ */
  periodDays: number
  /** Tổng phòng (capacity) */
  totalRooms: number
  /** Doanh thu thuần (đã trừ commission) */
  netRevenue: number
  /** Tổng doanh thu gộp */
  grossRevenue: number
  /** Doanh thu dịch vụ thêm (service + extra) */
  extraRevenue: number
  /** Tổng chi phí (purchase + laundry + maintenance) */
  totalCost: number
  costBreakdown: {
    purchase: number
    laundry: number
    maintenance: number
  }
  /** Số đêm phòng đã bán */
  roomNightsSold: number
  /** Số booking trong kỳ (non-refunded) */
  bookingsCount: number
  /** Doanh thu kỳ trước (để so sánh delta %) */
  prevNetRevenue: number
  prevBookingsCount: number
  prevRoomNightsSold: number
}

export interface DerivedKpis {
  profit: number
  profitMargin: number
  occupancy: number
  revpar: number
  adr: number
  extraRevenueShare: number
  costPerRoomDay: number
  laundryCostPerRoom: number
  revenueGrowth: number
  occupancyGrowth: number
}

export type Severity = 'high' | 'medium' | 'low'
export type Category = 'revenue' | 'cost' | 'occupancy' | 'service' | 'efficiency'

export interface Finding {
  id: string
  severity: Severity
  category: Category
  finding: string
  suggestion: string
  /** Tác động VNĐ ước tính / tháng nếu thực hiện gợi ý (positive = thu thêm hoặc tiết kiệm) */
  impactVnd?: number
}

/** Pure: tính các KPI dẫn xuất từ snapshot. */
export function computeDerivedKpis(s: KpiSnapshot): DerivedKpis {
  const safe = (n: number, d: number) => (d > 0 ? n / d : 0)
  const totalRoomDays = s.totalRooms * s.periodDays
  const profit = s.netRevenue - s.totalCost
  const profitMargin = safe(profit, s.netRevenue) * 100
  const occupancy = safe(s.roomNightsSold, totalRoomDays) * 100
  const revpar = safe(s.netRevenue, totalRoomDays)
  const adr = safe(s.netRevenue, s.roomNightsSold)
  const extraRevenueShare = safe(s.extraRevenue, s.grossRevenue) * 100
  const costPerRoomDay = safe(s.totalCost, totalRoomDays)
  // Chi phí giặt / phòng / 30 ngày
  const laundryCostPerRoom = safe(s.costBreakdown.laundry, s.totalRooms) * (30 / Math.max(1, s.periodDays))
  const revenueGrowth = safe(s.netRevenue - s.prevNetRevenue, s.prevNetRevenue) * 100
  const prevOcc = safe(s.prevRoomNightsSold, s.totalRooms * s.periodDays) * 100
  const occupancyGrowth = prevOcc > 0 ? occupancy - prevOcc : 0
  return {
    profit,
    profitMargin,
    occupancy,
    revpar,
    adr,
    extraRevenueShare,
    costPerRoomDay,
    laundryCostPerRoom,
    revenueGrowth,
    occupancyGrowth,
  }
}

/** Chạy toàn bộ rule, trả danh sách Finding sắp theo severity + impact desc. */
export function runOperationsAdvisor(snapshot: KpiSnapshot): Finding[] {
  if (snapshot.totalRooms <= 0 || snapshot.periodDays <= 0) return []
  const k = computeDerivedKpis(snapshot)
  const findings: Finding[] = []

  // R1 — Lấp đầy thấp
  if (k.occupancy > 0 && k.occupancy < INDUSTRY_BENCHMARKS.occupancy.fair) {
    const targetOcc = INDUSTRY_BENCHMARKS.occupancy.fair
    const extraNights = ((targetOcc - k.occupancy) / 100) * snapshot.totalRooms * snapshot.periodDays
    const impact = extraNights * (k.adr || 500_000) * (30 / Math.max(1, snapshot.periodDays))
    findings.push({
      id: 'low-occupancy',
      severity: 'high',
      category: 'occupancy',
      finding: `Tỷ lệ lấp đầy chỉ ${k.occupancy.toFixed(0)}%, thấp hơn trung bình ngành (${targetOcc}%).`,
      suggestion:
        'Tạo gói khuyến mãi đêm giữa tuần, mở thêm kênh OTA (Booking.com, Agoda), hoặc giảm giá cho khách lưu trú dài ngày.',
      impactVnd: Math.round(impact),
    })
  }

  // R2 — Biên lợi nhuận thấp
  if (k.profitMargin < INDUSTRY_BENCHMARKS.profitMargin.fair && snapshot.netRevenue > 0) {
    findings.push({
      id: 'low-profit-margin',
      severity: 'high',
      category: 'cost',
      finding: `Biên lợi nhuận chỉ ${k.profitMargin.toFixed(1)}%, dưới mức an toàn 20%.`,
      suggestion:
        'Rà soát chi phí cố định, đặc biệt giặt là và mua sắm. Cân nhắc đàm phán lại hợp đồng vendor.',
      impactVnd: Math.round(snapshot.totalCost * 0.1),
    })
  }

  // R3 — RevPAR thấp
  const revparLevel = classifyBenchmark('revpar', k.revpar)
  if (revparLevel === 'poor' && k.revpar > 0) {
    findings.push({
      id: 'low-revpar',
      severity: 'medium',
      category: 'revenue',
      finding: `RevPAR đạt ${(k.revpar / 1000).toFixed(0)}k/phòng/ngày, dưới mức trung bình ngành.`,
      suggestion:
        'Tăng giá phòng vào cuối tuần, áp dụng dynamic pricing, hoặc nâng cấp dịch vụ để tăng ADR.',
    })
  }

  // R4 — Doanh thu dịch vụ thêm thấp
  if (k.extraRevenueShare < INDUSTRY_BENCHMARKS.extraRevenueShare.fair && snapshot.grossRevenue > 0) {
    const target = INDUSTRY_BENCHMARKS.extraRevenueShare.good
    const impact = ((target - k.extraRevenueShare) / 100) * snapshot.grossRevenue * (30 / Math.max(1, snapshot.periodDays))
    findings.push({
      id: 'low-extra-revenue',
      severity: 'medium',
      category: 'service',
      finding: `Doanh thu dịch vụ thêm chỉ ${k.extraRevenueShare.toFixed(1)}% tổng doanh thu, ngành trung bình 10-15%.`,
      suggestion:
        'Đẩy mạnh bán minibar, dịch vụ giặt ủi cho khách, đưa đón sân bay, ăn sáng. Đào tạo lễ tân upsell.',
      impactVnd: Math.round(impact),
    })
  }

  // R5 — Chi phí giặt cao
  const laundryLevel = classifyBenchmark('laundryCostPerRoom', k.laundryCostPerRoom)
  if (laundryLevel === 'poor' && k.laundryCostPerRoom > 0) {
    const target = INDUSTRY_BENCHMARKS.laundryCostPerRoom.good
    const saving = (k.laundryCostPerRoom - target) * snapshot.totalRooms
    findings.push({
      id: 'high-laundry-cost',
      severity: 'medium',
      category: 'cost',
      finding: `Chi phí giặt là ${Math.round(k.laundryCostPerRoom / 1000)}k/phòng/tháng, cao hơn mức tốt (${target / 1000}k).`,
      suggestion:
        'So sánh báo giá 2-3 vendor giặt là, hoặc cân nhắc đầu tư máy giặt công nghiệp nội bộ nếu công suất đủ lớn.',
      impactVnd: Math.round(saving),
    })
  }

  // R6 — Chi phí bảo trì tăng đột biến (so cost vs revenue)
  if (snapshot.netRevenue > 0 && snapshot.costBreakdown.maintenance / snapshot.netRevenue > 0.08) {
    findings.push({
      id: 'high-maintenance-cost',
      severity: 'medium',
      category: 'cost',
      finding: `Chi phí bảo trì chiếm ${((snapshot.costBreakdown.maintenance / snapshot.netRevenue) * 100).toFixed(1)}% doanh thu, vượt ngưỡng 8%.`,
      suggestion:
        'Lên lịch bảo trì định kỳ thay vì sửa chữa khi hỏng. Đầu tư PM (preventive maintenance) để giảm chi phí dài hạn.',
    })
  }

  // R7 — Doanh thu giảm so kỳ trước
  if (k.revenueGrowth < -10 && snapshot.prevNetRevenue > 0) {
    findings.push({
      id: 'revenue-declining',
      severity: 'high',
      category: 'revenue',
      finding: `Doanh thu giảm ${Math.abs(k.revenueGrowth).toFixed(0)}% so kỳ trước.`,
      suggestion:
        'Rà soát khách hàng cũ chưa quay lại, kích hoạt chương trình loyalty, kiểm tra review online và phản hồi tiêu cực.',
    })
  }

  // R8 — Số booking ít bất thường
  if (snapshot.bookingsCount < snapshot.totalRooms * 0.5 && snapshot.periodDays >= 28) {
    findings.push({
      id: 'few-bookings',
      severity: 'low',
      category: 'occupancy',
      finding: `Chỉ có ${snapshot.bookingsCount} booking trong ${snapshot.periodDays} ngày — thấp với ${snapshot.totalRooms} phòng.`,
      suggestion: 'Marketing thêm trên mạng xã hội địa phương, cộng tác với công ty du lịch khu vực.',
    })
  }

  // R9 — Lãi tốt → giữ vững
  if (k.profitMargin >= INDUSTRY_BENCHMARKS.profitMargin.good && snapshot.netRevenue > 0) {
    findings.push({
      id: 'healthy-margin',
      severity: 'low',
      category: 'efficiency',
      finding: `Biên lợi nhuận ${k.profitMargin.toFixed(1)}% — vận hành rất hiệu quả.`,
      suggestion:
        'Cân nhắc tái đầu tư: nâng cấp phòng, mở rộng dịch vụ, hoặc tích lũy dự phòng cho mùa thấp điểm.',
    })
  }

  // R10 — ADR thấp
  if (classifyBenchmark('adr', k.adr) === 'poor' && k.adr > 0) {
    findings.push({
      id: 'low-adr',
      severity: 'medium',
      category: 'revenue',
      finding: `Giá phòng trung bình ${Math.round(k.adr / 1000)}k/đêm, thấp so phân khúc.`,
      suggestion:
        'Phân khúc lại sản phẩm: tạo gói cao cấp (view đẹp, tầng cao), nâng cấp ảnh OTA, dùng dynamic pricing.',
    })
  }

  return sortFindings(findings)
}

function severityRank(s: Severity): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const sd = severityRank(b.severity) - severityRank(a.severity)
    if (sd !== 0) return sd
    return (b.impactVnd || 0) - (a.impactVnd || 0)
  })
}
