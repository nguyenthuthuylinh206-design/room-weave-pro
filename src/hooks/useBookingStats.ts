import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useHotelContext } from '@/contexts/HotelContext'
import { useTenant } from '@/hooks/useTenant'
import { format, startOfDay, endOfDay } from 'date-fns'

export interface BookingStats {
  totalRooms: number
  occupiedRooms: number
  vacantRooms: number
  checkInsToday: number
  checkOutsToday: number
  todayRevenue: number
  projectedRevenue: number
  occupancyRate: number
}

export interface TodayCheckout {
  id: string
  guest_name: string
  guest_phone: string | null
  room_number: string
  room_id: string
  check_out_date: string
  room_price: number
  extra_charges: number
  total_amount: number
  payment_status: string
}

export interface TodayCheckin {
  id: string
  guest_name: string
  guest_phone: string | null
  room_number: string
  room_id: string
  check_in_date: string
  guest_count: number
}

export function useBookingStats() {
  const { selectedHotel } = useHotelContext()
  const { tenant } = useTenant()
  const hotelId = selectedHotel?.id
  const tenantId = tenant?.id
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['booking-stats', hotelId, today],
    queryFn: async (): Promise<BookingStats> => {
      // Get total rooms
      let roomsQuery = supabase.from('rooms').select('id', { count: 'exact' }).eq('tenant_id', tenantId)
      if (hotelId && hotelId !== 'all') {
        roomsQuery = roomsQuery.eq('hotel_id', hotelId)
      }
      const { count: totalRooms } = await roomsQuery

      // Get currently checked-in bookings
      let occupiedQuery = supabase
        .from('room_bookings')
        .select('id, room_price, extra_charges, total_amount', { count: 'exact' })
        .eq('status', 'checked_in')
        .eq('tenant_id', tenantId)
      if (hotelId && hotelId !== 'all') {
        occupiedQuery = occupiedQuery.eq('hotel_id', hotelId)
      }
      const { count: occupiedRooms, data: occupiedBookings } = await occupiedQuery

      // Get check-ins today
      let checkInQuery = supabase
        .from('room_bookings')
        .select('id', { count: 'exact' })
        .eq('status', 'confirmed')
        .eq('check_in_date', today)
        .eq('tenant_id', tenantId)
      if (hotelId && hotelId !== 'all') {
        checkInQuery = checkInQuery.eq('hotel_id', hotelId)
      }
      const { count: checkInsToday } = await checkInQuery

      // Get check-outs today
      let checkOutQuery = supabase
        .from('room_bookings')
        .select('id, total_amount, payment_status', { count: 'exact' })
        .eq('status', 'checked_in')
        .eq('check_out_date', today)
        .eq('tenant_id', tenantId)
      if (hotelId && hotelId !== 'all') {
        checkOutQuery = checkOutQuery.eq('hotel_id', hotelId)
      }
      const { count: checkOutsToday, data: checkoutBookings } = await checkOutQuery

      // Get today's revenue (paid checkouts)
      let revenueQuery = supabase
        .from('room_bookings')
        .select('total_amount')
        .eq('status', 'checked_out')
        .eq('payment_status', 'paid')
        .eq('tenant_id', tenantId)
        .gte('paid_at', startOfDay(new Date()).toISOString())
        .lte('paid_at', endOfDay(new Date()).toISOString())
      if (hotelId && hotelId !== 'all') {
        revenueQuery = revenueQuery.eq('hotel_id', hotelId)
      }
      const { data: paidBookings } = await revenueQuery

      const todayRevenue = paidBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

      // Projected revenue = currently occupied bookings
      const projectedRevenue = occupiedBookings?.reduce((sum, b) => sum + (b.total_amount || 0), 0) || 0

      const total = totalRooms || 0
      const occupied = occupiedRooms || 0
      const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0

      return {
        totalRooms: total,
        occupiedRooms: occupied,
        vacantRooms: total - occupied,
        checkInsToday: checkInsToday || 0,
        checkOutsToday: checkOutsToday || 0,
        todayRevenue,
        projectedRevenue,
        occupancyRate,
      }
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

export function useTodayCheckouts() {
  const { selectedHotel } = useHotelContext()
  const { tenant } = useTenant()
  const hotelId = selectedHotel?.id
  const tenantId = tenant?.id
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['today-checkouts', hotelId, today],
    queryFn: async (): Promise<TodayCheckout[]> => {
      let query = supabase
        .from('room_bookings')
        .select(`
          id,
          guest_name,
          guest_phone,
          room_id,
          check_out_date,
          room_price,
          extra_charges,
          total_amount,
          payment_status,
          room:rooms(room_number)
        `)
        .eq('status', 'checked_in')
        .eq('check_out_date', today)
        .eq('tenant_id', tenantId)
        .order('check_out_date', { ascending: true })

      if (hotelId && hotelId !== 'all') {
        query = query.eq('hotel_id', hotelId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching today checkouts:', error)
        return []
      }

      return (data || []).map((b: any) => ({
        id: b.id,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_number: b.room?.room_number || '',
        room_id: b.room_id,
        check_out_date: b.check_out_date,
        room_price: b.room_price || 0,
        extra_charges: b.extra_charges || 0,
        total_amount: b.total_amount || 0,
        payment_status: b.payment_status || 'pending',
      }))
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  })
}

export function useTodayCheckins() {
  const { selectedHotel } = useHotelContext()
  const { tenant } = useTenant()
  const hotelId = selectedHotel?.id
  const tenantId = tenant?.id
  const today = format(new Date(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['today-checkins', hotelId, today],
    queryFn: async (): Promise<TodayCheckin[]> => {
      let query = supabase
        .from('room_bookings')
        .select(`
          id,
          guest_name,
          guest_phone,
          room_id,
          check_in_date,
          guest_count,
          room:rooms(room_number)
        `)
        .eq('status', 'confirmed')
        .eq('check_in_date', today)
        .eq('tenant_id', tenantId)
        .order('check_in_date', { ascending: true })

      if (hotelId && hotelId !== 'all') {
        query = query.eq('hotel_id', hotelId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching today checkins:', error)
        return []
      }

      return (data || []).map((b: any) => ({
        id: b.id,
        guest_name: b.guest_name,
        guest_phone: b.guest_phone,
        room_number: b.room?.room_number || '',
        room_id: b.room_id,
        check_in_date: b.check_in_date,
        guest_count: b.guest_count,
      }))
    },
    enabled: !!tenantId,
    staleTime: 60 * 1000,
  })
}
