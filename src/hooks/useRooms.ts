import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import type { RoomWithStats, RoomFilters } from '@/types/rooms.types'

export function useRooms(filters: RoomFilters = {}) {
  const { tenantId, hotelId } = useUser()
  
  return useQuery({
    queryKey: ['rooms', tenantId, hotelId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_rooms_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: hotelId || null,
        p_floor: filters.floor || null,
        p_room_type: filters.roomType || null,
        p_status: filters.status || null,
        p_search: filters.search || null,
        p_missing_items_only: filters.missingItemsOnly || false,
      })
      
      if (error) throw error
      return data as RoomWithStats[]
    },
    enabled: !!tenantId,
  })
}

export function useRoomStats(tenantId: string | undefined, hotelId: string | undefined) {
  return useQuery({
    queryKey: ['room-stats', tenantId, hotelId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_rooms_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: hotelId || null,
        p_floor: null,
        p_room_type: null,
        p_status: null,
        p_search: null,
        p_missing_items_only: false,
      })
      
      if (error) throw error
      
      const rooms = data as RoomWithStats[]
      
      return {
        vacant: rooms.filter(r => r.status === 'vacant').length,
        occupied: rooms.filter(r => r.status === 'occupied').length,
        cleaning: rooms.filter(r => r.status === 'cleaning').length,
        maintenance: rooms.filter(r => r.status === 'maintenance').length,
        total: rooms.length,
      }
    },
    enabled: !!tenantId,
  })
}
