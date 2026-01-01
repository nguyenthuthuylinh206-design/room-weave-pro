import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { startOfMonth, endOfMonth, subMonths, format, startOfDay, endOfDay } from 'date-fns'

export interface RevenueData {
  totalRevenue: number
  paidRevenue: number
  pendingRevenue: number
  refundedRevenue: number
  bookingsCount: number
  paidBookingsCount: number
  averageBookingValue: number
}

export interface RevenueTrend {
  month: string
  revenue: number
  bookings: number
}

export interface RevenueReport {
  today: RevenueData
  thisMonth: RevenueData
  lastMonth: RevenueData
  monthlyTrends: RevenueTrend[]
  revenueGrowth: number
}

export function useRevenueReport() {
  const { hotelId, tenantId } = useUser()

  return useQuery({
    queryKey: ['revenue-report', hotelId, tenantId],
    queryFn: async (): Promise<RevenueReport> => {
      const today = new Date()
      const startOfToday = startOfDay(today).toISOString()
      const endOfToday = endOfDay(today).toISOString()
      const thisMonthStart = startOfMonth(today).toISOString()
      const thisMonthEnd = endOfMonth(today).toISOString()
      const lastMonthStart = startOfMonth(subMonths(today, 1)).toISOString()
      const lastMonthEnd = endOfMonth(subMonths(today, 1)).toISOString()

      // Build query base
      let query = supabase.from('room_bookings').select('*')
      
      if (hotelId) {
        query = query.eq('hotel_id', hotelId)
      }

      const { data: allBookings, error } = await query

      if (error) {
        console.error('Error fetching revenue data:', error)
        throw error
      }

      const bookings = allBookings || []

      // Helper function to calculate revenue data
      const calculateRevenueData = (filteredBookings: typeof bookings): RevenueData => {
        const paidBookings = filteredBookings.filter(b => b.payment_status === 'paid')
        const pendingBookings = filteredBookings.filter(b => b.payment_status === 'pending' || !b.payment_status)
        const refundedBookings = filteredBookings.filter(b => b.payment_status === 'refunded')

        const paidRevenue = paidBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
        const pendingRevenue = pendingBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)
        const refundedRevenue = refundedBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0)

        return {
          totalRevenue: paidRevenue + pendingRevenue,
          paidRevenue,
          pendingRevenue,
          refundedRevenue,
          bookingsCount: filteredBookings.length,
          paidBookingsCount: paidBookings.length,
          averageBookingValue: filteredBookings.length > 0 
            ? (paidRevenue + pendingRevenue) / filteredBookings.length 
            : 0,
        }
      }

      // Today's bookings (checked out today with payment)
      const todayBookings = bookings.filter(b => {
        const checkOutDate = new Date(b.check_out_date)
        return checkOutDate >= new Date(startOfToday) && checkOutDate <= new Date(endOfToday)
      })

      // This month's bookings
      const thisMonthBookings = bookings.filter(b => {
        const checkOutDate = new Date(b.check_out_date)
        return checkOutDate >= new Date(thisMonthStart) && checkOutDate <= new Date(thisMonthEnd)
      })

      // Last month's bookings
      const lastMonthBookings = bookings.filter(b => {
        const checkOutDate = new Date(b.check_out_date)
        return checkOutDate >= new Date(lastMonthStart) && checkOutDate <= new Date(lastMonthEnd)
      })

      // Monthly trends (last 6 months)
      const monthlyTrends: RevenueTrend[] = []
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i)
        const monthStart = startOfMonth(monthDate)
        const monthEnd = endOfMonth(monthDate)
        
        const monthBookings = bookings.filter(b => {
          const checkOutDate = new Date(b.check_out_date)
          return checkOutDate >= monthStart && checkOutDate <= monthEnd && b.payment_status === 'paid'
        })

        monthlyTrends.push({
          month: format(monthDate, 'MM/yyyy'),
          revenue: monthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
          bookings: monthBookings.length,
        })
      }

      // Calculate growth
      const thisMonthData = calculateRevenueData(thisMonthBookings)
      const lastMonthData = calculateRevenueData(lastMonthBookings)
      const revenueGrowth = lastMonthData.paidRevenue > 0 
        ? ((thisMonthData.paidRevenue - lastMonthData.paidRevenue) / lastMonthData.paidRevenue) * 100
        : 0

      return {
        today: calculateRevenueData(todayBookings),
        thisMonth: thisMonthData,
        lastMonth: lastMonthData,
        monthlyTrends,
        revenueGrowth,
      }
    },
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useOwnerAlerts() {
  const { hotelId, tenantId } = useUser()

  return useQuery({
    queryKey: ['owner-alerts', hotelId, tenantId],
    queryFn: async () => {
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      const threeDaysAgo = format(subMonths(today, 0), 'yyyy-MM-dd') // Actually 3 days ago
      
      // Query overdue checkouts
      let overdueQuery = supabase
        .from('room_bookings')
        .select('id, guest_name, check_out_date, room:rooms(room_number)')
        .eq('status', 'checked_in')
        .lt('check_out_date', todayStr)
        .limit(10)

      if (hotelId) {
        overdueQuery = overdueQuery.eq('hotel_id', hotelId)
      }

      const { data: overdueCheckouts } = await overdueQuery

      // Query unpaid bookings (checked out but not paid)
      let unpaidQuery = supabase
        .from('room_bookings')
        .select('id, guest_name, total_amount, check_out_date, room:rooms(room_number)')
        .eq('status', 'checked_out')
        .neq('payment_status', 'paid')
        .limit(10)

      if (hotelId) {
        unpaidQuery = unpaidQuery.eq('hotel_id', hotelId)
      }

      const { data: unpaidBookings } = await unpaidQuery

      // Query room checks with unresolved damages
      let damagesQuery = supabase
        .from('room_checks')
        .select('id, room:rooms(room_number), items_damaged, items_lost, created_at')
        .or('items_damaged.neq.{},items_lost.neq.{}')
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: unresolvedDamages } = await damagesQuery

      return {
        overdueCheckouts: overdueCheckouts || [],
        unpaidBookings: unpaidBookings || [],
        unresolvedDamages: unresolvedDamages || [],
        totalAlerts: (overdueCheckouts?.length || 0) + (unpaidBookings?.length || 0) + (unresolvedDamages?.length || 0),
      }
    },
    enabled: !!tenantId,
    staleTime: 2 * 60 * 1000,
  })
}
