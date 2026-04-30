import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'

export interface QcStaffStat {
  user_id: string
  full_name: string | null
  hotel_id: string | null
  total_completed: number
  approved_count: number
  rework_count: number
  pending_count: number
  rework_rate_pct: number | null
}

export interface QcFloorStat {
  hotel_id: string | null
  floor: number | null
  total_tasks: number
  rework_tasks: number
  pending_tasks: number
  rework_rate_pct: number | null
}

/** Thống kê QC theo nhân viên (30 ngày gần nhất) */
export function useQcStaffStats() {
  const { tenantId } = useUser()
  const { selectedHotel } = useHotelContext()
  const hotelId = selectedHotel?.id ?? null

  return useQuery({
    queryKey: ['qc-staff-stats', tenantId, hotelId],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('qc_staff_stats_30d')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('rework_rate_pct', { ascending: false, nullsFirst: false })
      if (hotelId) q = q.eq('hotel_id', hotelId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as QcStaffStat[]
    },
  })
}

/** Thống kê QC theo tầng (30 ngày gần nhất) */
export function useQcFloorStats() {
  const { tenantId } = useUser()
  const { selectedHotel } = useHotelContext()
  const hotelId = selectedHotel?.id ?? null

  return useQuery({
    queryKey: ['qc-floor-stats', tenantId, hotelId],
    enabled: !!tenantId,
    queryFn: async () => {
      let q = (supabase as any)
        .from('qc_floor_stats_30d')
        .select('*')
        .eq('tenant_id', tenantId!)
        .order('floor', { ascending: true, nullsFirst: false })
      if (hotelId) q = q.eq('hotel_id', hotelId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as QcFloorStat[]
    },
  })
}
