import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'

export interface HousekeepingKpi {
  totalRooms: number
  occupied: number          // Đang có khách (occupied_*, dnd, sleep_out)
  checkoutToday: number     // Booking trả hôm nay (status checked_in)
  needCleaning: number      // vacant_dirty + cleaning + occupied_dirty
  maintenance: number       // out_of_order + out_of_service + maintenance
  missingItems: number      // phòng không có khách nhưng còn thiếu đồ
}

const OCCUPIED_SET = new Set(['occupied', 'occupied_clean', 'occupied_dirty', 'dnd', 'sleep_out', 'service_refused'])
const DIRTY_SET = new Set(['vacant_dirty', 'cleaning', 'occupied_dirty', 'check_out'])
const MAINT_SET = new Set(['out_of_order', 'out_of_service', 'maintenance'])

/**
 * Aggregate 6 KPI cho cockpit Trưởng buồng phòng.
 * Realtime invalidate khi rooms/room_bookings thay đổi.
 */
export function useHousekeepingKpi(hotelId?: string | null) {
  const { user } = useUser()
  const tenantId = user?.tenant_id
  const qc = useQueryClient()

  const query = useQuery<HousekeepingKpi>({
    queryKey: ['hk-kpi', tenantId, hotelId],
    enabled: !!tenantId && !!hotelId,
    staleTime: 30_000,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10)

      // Query song song: rooms (status + missing) + bookings checkout hôm nay
      const [roomsRes, bookingsRes] = await Promise.all([
        supabase
          .from('rooms')
          .select('id, status')
          .eq('tenant_id', tenantId!)
          .eq('hotel_id', hotelId!),
        supabase
          .from('room_bookings')
          .select('id, room_id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId!)
          .eq('hotel_id', hotelId!)
          .eq('status', 'checked_in')
          .eq('check_out_date', today),
      ])

      if (roomsRes.error) throw roomsRes.error
      if (bookingsRes.error) throw bookingsRes.error

      const rooms = (roomsRes.data || []) as Array<{ id: string; status: string }>

      // Lấy missing_items qua RPC view nếu có; fallback: query room_items aggregate
      // Để giữ Phase 1 đơn giản: dùng view rooms_with_stats nếu có; fallback 0.
      let missingMap = new Map<string, number>()
      const statsRes = await supabase
        .from('rooms_with_stats')
        .select('id, missing_items')
        .eq('tenant_id', tenantId!)
        .eq('hotel_id', hotelId!)
      if (!statsRes.error && statsRes.data) {
        for (const r of statsRes.data as Array<{ id: string; missing_items: number | null }>) {
          missingMap.set(r.id, r.missing_items || 0)
        }
      }

      let occupied = 0
      let needCleaning = 0
      let maintenance = 0
      let missingItems = 0

      for (const r of rooms) {
        const s = r.status
        const isOccupied = OCCUPIED_SET.has(s)
        if (isOccupied) occupied++
        if (DIRTY_SET.has(s)) needCleaning++
        if (MAINT_SET.has(s)) maintenance++
        if (!isOccupied && (missingMap.get(r.id) || 0) > 0) missingItems++
      }

      return {
        totalRooms: rooms.length,
        occupied,
        checkoutToday: bookingsRes.count || 0,
        needCleaning,
        maintenance,
        missingItems,
      }
    },
  })

  useEffect(() => {
    if (!tenantId || !hotelId) return
    const channel = supabase
      .channel(`hk-kpi-${hotelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `hotel_id=eq.${hotelId}` }, () =>
        qc.invalidateQueries({ queryKey: ['hk-kpi', tenantId, hotelId] }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_bookings', filter: `hotel_id=eq.${hotelId}` }, () =>
        qc.invalidateQueries({ queryKey: ['hk-kpi', tenantId, hotelId] }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, hotelId, qc])

  return query
}
