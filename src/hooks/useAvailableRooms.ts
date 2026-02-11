import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
  hourly_price?: number | null
  monthly_price?: number | null
  min_hours?: number | null
  max_hours?: number | null
  currentStatus: string // Current room status for UI indicators
}

export function useAvailableRooms(checkInDate?: Date, checkOutDate?: Date) {
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const { tenant } = useTenant()
  const queryClient = useQueryClient()
  const tenantId = tenant?.id
  const hotelId = selectedHotel?.id

  // Realtime subscription for rooms and bookings changes
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel(`available-rooms-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_bookings', filter: `tenant_id=eq.${tenantId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['available-rooms'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return useQuery({
    queryKey: ['available-rooms', tenantId, hotelId, checkInDate?.toISOString(), checkOutDate?.toISOString()],
    queryFn: async () => {
      if (!tenantId) return []

      // Get ALL rooms except out_of_order - rely on booking overlap logic for availability
      // This allows booking rooms in advance even if currently occupied
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
          hourly_price,
          monthly_price,
          min_hours,
          max_hours,
          hotels(name)
        `)
        .eq('tenant_id', tenantId)
        .neq('status', 'out_of_order')
        .order('floor', { ascending: true })
        .order('room_number', { ascending: true })

      if (!isAllHotelsMode && hotelId) {
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
            hourly_price: room.hourly_price ?? null,
            monthly_price: room.monthly_price ?? null,
            min_hours: room.min_hours ?? null,
            max_hours: room.max_hours ?? null,
            currentStatus: room.status,
          })) as AvailableRoom[]
      }

      return rooms.map(room => ({
        ...room,
        hotel_name: (room.hotels as any)?.name,
        base_price: room.base_price ?? 0,
        hourly_price: room.hourly_price ?? null,
        monthly_price: room.monthly_price ?? null,
        min_hours: room.min_hours ?? null,
        max_hours: room.max_hours ?? null,
        currentStatus: room.status,
      })) as AvailableRoom[]
    },
    enabled: !!tenantId,
  })
}
