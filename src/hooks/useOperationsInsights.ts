import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { useRevenueReport } from './useRevenueReport'
import { useFinancialReport } from './useReports'
import { differenceInDays, subDays } from 'date-fns'
import {
  computeDerivedKpis,
  runOperationsAdvisor,
  type KpiSnapshot,
  type Finding,
} from '@/lib/operationsAdvisor'

export interface OperationsInsightsData {
  snapshot: KpiSnapshot
  derived: ReturnType<typeof computeDerivedKpis>
  ruleFindings: Finding[]
  /** Khoảng kỳ hiện tại (để hiển thị) */
  dateRange: { start: Date; end: Date }
}

/**
 * Tính room-nights sold từ bookings (sum check_out - check_in).
 * Trả về Map<period, nights>.
 */
async function fetchRoomNights(
  tenantId: string,
  hotelId: string | null,
  start: Date,
  end: Date,
): Promise<number> {
  let q = supabase
    .from('room_bookings')
    .select('check_in_date, check_out_date, payment_status')
    .eq('tenant_id', tenantId)
    .gte('check_out_date', start.toISOString())
    .lte('check_out_date', end.toISOString())
    .neq('payment_status', 'refunded')
    .limit(10000)
  if (hotelId) q = q.eq('hotel_id', hotelId)
  const { data, error } = await q
  if (error) throw error
  let nights = 0
  for (const b of data || []) {
    if (!b.check_in_date || !b.check_out_date) continue
    const n = Math.max(1, differenceInDays(new Date(b.check_out_date), new Date(b.check_in_date)))
    nights += n
  }
  return nights
}

/**
 * Hook chính cho tab "Đánh giá vận hành".
 * Gom revenue + cost + occupancy → tính KPI + chạy rule engine local.
 * AI advice gọi riêng qua useOperationsAdvice để không block UI khi AI chậm.
 */
export function useOperationsInsights(dateRange: { start: Date; end: Date }) {
  const { tenantId } = useUser()
  const { selectedHotel, availableHotels, isAllHotelsMode } = useHotelContext()

  const revenue = useRevenueReport('custom', dateRange)
  const financial = useFinancialReport(dateRange)

  const periodDays = Math.max(1, differenceInDays(dateRange.end, dateRange.start) + 1)
  const prevEnd = subDays(dateRange.start, 1)
  const prevStart = subDays(prevEnd, periodDays - 1)

  const hotelId = isAllHotelsMode ? null : selectedHotel?.id ?? null
  const totalRooms = isAllHotelsMode
    ? availableHotels.reduce((s, h) => s + (h.total_rooms || 0), 0)
    : selectedHotel?.total_rooms || 0

  return useQuery({
    queryKey: [
      'operations-insights',
      tenantId,
      hotelId ?? 'all',
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
      totalRooms,
      revenue.data?.currentPeriod.netRevenue,
      financial.data?.summary.total_cost,
    ],
    enabled: !!tenantId && !!revenue.data && !!financial.data && totalRooms > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<OperationsInsightsData> => {
      if (!tenantId || !revenue.data || !financial.data) {
        throw new Error('Thiếu dữ liệu nguồn')
      }

      const [currentNights, prevNights] = await Promise.all([
        fetchRoomNights(tenantId, hotelId, dateRange.start, dateRange.end),
        fetchRoomNights(tenantId, hotelId, prevStart, prevEnd),
      ])

      const cur = revenue.data.currentPeriod
      const prev = revenue.data.previousPeriod
      const cost = financial.data.summary

      const snapshot: KpiSnapshot = {
        periodDays,
        totalRooms,
        netRevenue: cur.netRevenue,
        grossRevenue: cur.totalRevenue,
        extraRevenue: cur.surcharges.serviceCharges + cur.surcharges.extraCharges,
        totalCost: cost.total_cost || 0,
        costBreakdown: {
          purchase: cost.purchase_cost || 0,
          laundry: cost.laundry_cost || 0,
          maintenance: cost.maintenance_cost || 0,
        },
        roomNightsSold: currentNights,
        bookingsCount: cur.bookingsCount,
        prevNetRevenue: prev.netRevenue,
        prevBookingsCount: prev.bookingsCount,
        prevRoomNightsSold: prevNights,
      }

      const derived = computeDerivedKpis(snapshot)
      const ruleFindings = runOperationsAdvisor(snapshot)

      return { snapshot, derived, ruleFindings, dateRange }
    },
  })
}

export interface AiAdvice {
  title: string
  description: string
  action: string
  priority: 'high' | 'medium' | 'low'
  impactVnd?: number
}

/** Gọi edge function operations-advisor để lấy AI advice. */
export function useOperationsAdvice(insights: OperationsInsightsData | undefined) {
  const { tenantId } = useUser()
  return useQuery({
    queryKey: [
      'operations-advice',
      tenantId,
      insights?.snapshot.netRevenue,
      insights?.snapshot.totalCost,
      insights?.ruleFindings.length,
    ],
    enabled: !!insights && !!tenantId,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<AiAdvice[]> => {
      if (!insights) return []
      const { data, error } = await supabase.functions.invoke('operations-advisor', {
        body: {
          snapshot: insights.snapshot,
          derived: insights.derived,
          findings: insights.ruleFindings.slice(0, 8),
        },
      })
      if (error) throw error
      const advice = (data?.advice ?? []) as AiAdvice[]
      return advice
    },
  })
}
