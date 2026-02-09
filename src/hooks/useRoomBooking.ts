import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from '@/hooks/useTenant'

export interface RoomBooking {
  id: string
  guest_name: string
  guest_phone: string | null
  guest_email: string | null
  guest_count: number
  check_in_date: string
  check_out_date: string
  actual_check_in: string | null
  status: string
  notes: string | null
}

export function useRoomBooking(roomId: string | undefined) {
  return useQuery({
    queryKey: ['room-booking', roomId],
    queryFn: async () => {
      if (!roomId) return null

      const { data, error } = await supabase
        .rpc('get_current_room_booking', { p_room_id: roomId })

      if (error) {
        console.error('Error fetching room booking:', error)
        return null
      }

      if (!data || data.length === 0) return null
      return data[0] as RoomBooking
    },
    enabled: !!roomId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useRoomBookings(roomId: string | undefined) {
  const { tenant } = useTenant()
  const tenantId = tenant?.id

  return useQuery({
    queryKey: ['room-bookings', roomId, tenantId],
    queryFn: async () => {
      if (!roomId || !tenantId) return []

      const { data, error } = await supabase
        .from('room_bookings')
        .select('*')
        .eq('room_id', roomId)
        .eq('tenant_id', tenantId)
        .order('check_in_date', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error fetching room bookings:', error)
        return []
      }

      return data
    },
    enabled: !!roomId,
  })
}
