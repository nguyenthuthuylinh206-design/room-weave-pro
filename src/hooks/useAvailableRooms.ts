import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useHotelContext } from '@/contexts/HotelContext'
import { useTenant } from '@/hooks/useTenant'

export interface AvailableRoom {
  id: string
  room_number: string
  floor: number
  room_type: string
  status: string
  hotel_id: string
  hotel_name?: string
  base_price?: number
}

export function useAvailableRooms(checkInDate?: Date, checkOutDate?: Date) {
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  const hotelId = selectedHotel?.id

  return useQuery({
    queryKey: ['available-rooms', tenantId, hotelId, checkInDate?.toISOString(), checkOutDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return []

      // Get rooms with status available, vacant, or clean
      let query = supabase
        .from('rooms')
        .select(`
          id,
          room_number,
          floor,
          room_type,
          status,
          hotel_id,
          base_price,
          hotels(name)
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['vacant', 'available', 'clean'])
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true })

      if (hotelId && hotelId !== 'all') {
        query = query.eq('hotel_id', hotelId)
      }

      const { data: rooms, error } = await query

      if (error) {
        console.error('Error fetching available rooms:', error)
        return []
      }

      // If dates are provided, filter out rooms with overlapping bookings
      if (checkInDate && checkOutDate && rooms && rooms.length > 0) {
        const roomIds = rooms.map(r => r.id)
        
        // Correct overlap logic: existing.check_in < new.check_out AND existing.check_out > new.check_in
        const checkIn = checkInDate.toISOString().split('T')[0]
        const checkOut = checkOutDate.toISOString().split('T')[0]
        
        const { data: conflictingBookings, error: bookingsError } = await supabase
          .from('room_bookings')
          .select('room_id')
          .in('room_id', roomIds)
          .in('status', ['confirmed', 'checked_in'])
          .lt('check_in_date', checkOut)  // existing check_in < new checkout
          .gt('check_out_date', checkIn)  // existing check_out > new checkin

        if (bookingsError) {
          console.error('Error checking booking conflicts:', bookingsError)
        }

        const bookedRoomIds = new Set(conflictingBookings?.map(b => b.room_id) || [])
        
        return rooms
          .filter(room => !bookedRoomIds.has(room.id))
          .map(room => ({
            ...room,
            hotel_name: (room.hotels as any)?.name,
            base_price: room.base_price ?? 0,
          })) as AvailableRoom[]
      }

      return rooms.map(room => ({
        ...room,
        hotel_name: (room.hotels as any)?.name,
        base_price: room.base_price ?? 0,
      })) as AvailableRoom[]
    },
    enabled: !!tenantId,
  })
}
