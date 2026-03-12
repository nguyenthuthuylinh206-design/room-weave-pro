import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useState } from 'react'
import { format } from 'date-fns'
import { 
  calculateEarlyCheckinCharge, 
  calculateLateCheckoutCharge,
  calculateHourlyOvertimeCharge,
  calculateBookingCost,
  DEFAULT_PRICING_RULES 
} from '@/lib/bookingCalculations'
import { formatCurrency } from '@/lib/utils'
import { fetchServiceChargeSummary } from '@/hooks/useBookingServiceCharges'
import { triggerRoomCheckoutNotification } from '@/hooks/useNotificationTriggers'
import { useUser } from '@/hooks/useUser'
import { useTenant } from '@/hooks/useTenant'

interface UseBookingActionsOptions {
  onSuccess?: () => void
}

export function useBookingActions(options?: UseBookingActionsOptions) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useUser()
  const { tenant } = useTenant()

  const invalidateQueries = (roomId?: string) => {
    queryClient.invalidateQueries({ queryKey: ['rooms'] })
    queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
    queryClient.invalidateQueries({ queryKey: ['booking-stats'] })
    queryClient.invalidateQueries({ queryKey: ['today-checkouts'] })
    queryClient.invalidateQueries({ queryKey: ['today-checkins'] })
    queryClient.invalidateQueries({ queryKey: ['booking-detail'] })
    if (roomId) {
      queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
      queryClient.invalidateQueries({ queryKey: ['room-bookings', roomId] })
    }
  }

  /**
   * Check-in: Update booking status to 'checked_in' AND room status to 'occupied'
   * Uses database transaction (RPC) to ensure atomicity for concurrent users
   */
  // Error messages mapping for RPC errors
  const ERROR_MESSAGES: Record<string, string> = {
    'ROOM_NOT_FOUND': 'Phòng không tồn tại',
    'ROOM_OCCUPIED': 'Phòng đang có khách. Vui lòng checkout khách hiện tại trước.',
    'INVALID_ROOM_STATUS': 'Phòng không ở trạng thái có thể check-in (đang bảo trì hoặc ngừng hoạt động).',
    'BOOKING_NOT_VALID': 'Booking không hợp lệ hoặc đã được check-in.',
  }

  const parseRpcError = (errorMessage: string): string => {
    // Check for error codes like "ROOM_OCCUPIED:Guest Name"
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (errorMessage.includes(code)) {
        // Extract additional info after colon if present
        const parts = errorMessage.split(':')
        if (parts.length > 1 && code === 'ROOM_OCCUPIED') {
          return `Phòng đang có khách "${parts[1]}". Vui lòng checkout trước.`
        }
        if (parts.length > 1 && code === 'INVALID_ROOM_STATUS') {
          return `Phòng đang ở trạng thái "${parts[1]}". Không thể check-in.`
        }
        return message
      }
    }
    return errorMessage
  }

  const handleCheckIn = async (bookingId: string, roomId: string) => {
    setIsLoading(true)
    try {
      // First get the booking to calculate surcharge
      const { data: booking, error: fetchError } = await supabase
        .from('room_bookings')
        .select('room_price, booking_type')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      const bookingType = booking.booking_type || 'daily'
      let earlyCheckinCharge = 0

      // Only calculate early check-in surcharge for DAILY bookings
      // Hourly and Monthly bookings don't have early check-in charges
      if (bookingType === 'daily') {
        const now = new Date()
        const actualTime = format(now, 'HH:mm')
        earlyCheckinCharge = calculateEarlyCheckinCharge(actualTime, booking.room_price || 0)
      }

      // Use transaction-safe RPC function to update both booking and room atomically
      // The RPC now validates room status - will reject if occupied, maintenance, out_of_order
      const { data: result, error: rpcError } = await supabase.rpc('perform_checkin', {
        p_booking_id: bookingId,
        p_room_id: roomId,
        p_early_checkin_charge: earlyCheckinCharge,
      })

      if (rpcError) throw rpcError

      toast({ 
        title: 'Check-in thành công',
        description: earlyCheckinCharge > 0 
          ? `Phụ thu check-in sớm: ${formatCurrency(earlyCheckinCharge)}`
          : undefined,
      })
      invalidateQueries(roomId)
      options?.onSuccess?.()
      return true
    } catch (error: any) {
      console.error('Check-in error:', error)
      const errorMessage = parseRpcError(error.message || '')
      toast({
        variant: 'destructive',
        title: 'Lỗi check-in',
        description: errorMessage,
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check-out: Update booking status to 'checked_out' AND room status to 'check_out'
   * Uses database transaction (RPC) to ensure atomicity for concurrent users
   * Handles Daily, Hourly, and Monthly booking types differently
   */
  const handleCheckOut = async (bookingId: string, roomId: string) => {
    setIsLoading(true)
    try {
      // First get the booking to calculate final billing
      const { data: booking, error: fetchError } = await supabase
        .from('room_bookings')
        .select(`
          tenant_id, room_price, early_checkin_charge, vat_rate, service_fee_rate, 
          service_charges, extra_charges, deposit_amount, amount_paid, 
          check_in_date, check_out_date, booking_type,
          hourly_rate, booking_hours, hourly_end_time,
          monthly_rate, booking_months
        `)
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      const bookingType = (booking.booking_type as 'daily' | 'hourly' | 'monthly') || 'daily'
      const now = new Date()
      const actualTime = format(now, 'HH:mm')
      
      let lateCheckoutCharge = 0
      let hourlyOvertimeCharge = 0
      let nights = 1
      let hours = booking.booking_hours || 1
      let months = booking.booking_months || 1

      switch (bookingType) {
        case 'hourly': {
          // Calculate overtime for hourly bookings
          if (booking.hourly_end_time) {
            const scheduledEndTime = new Date(booking.hourly_end_time)
            hourlyOvertimeCharge = calculateHourlyOvertimeCharge(
              scheduledEndTime,
              now,
              booking.hourly_rate || 0
            )
          }
          break
        }
        
        case 'monthly': {
          // No time-based surcharges for monthly bookings
          // Just use the months and monthly rate
          months = booking.booking_months || 1
          break
        }
        
        case 'daily':
        default: {
          // Calculate late check-out surcharge for daily bookings
          const scheduledCheckoutDate = new Date(booking.check_out_date)
          lateCheckoutCharge = calculateLateCheckoutCharge(
            actualTime, 
            booking.room_price || 0,
            now,
            scheduledCheckoutDate
          )
          
          // Calculate nights
          const checkIn = new Date(booking.check_in_date)
          const checkOut = new Date(booking.check_out_date)
          nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))
          break
        }
      }

      // Fetch unified service charges (booking_service_charges + chargeable_consumptions)
      let serviceCharges = booking.service_charges || 0
      try {
        const summary = await fetchServiceChargeSummary(bookingId, booking.tenant_id, { includeAllBilled: true })
        serviceCharges = summary.grandTotal
      } catch (e) {
        console.error('Error fetching service charge summary:', e)
      }

      const totalExtraCharges = booking.extra_charges || 0
      const costBreakdown = calculateBookingCost({
        bookingType,
        roomPrice: booking.room_price || 0,
        nights,
        earlyCheckinCharge: bookingType === 'daily' ? (booking.early_checkin_charge || 0) : 0,
        lateCheckoutCharge,
        hourlyRate: booking.hourly_rate || 0,
        hours,
        hourlyOvertimeCharge,
        monthlyRate: booking.monthly_rate || 0,
        months,
        serviceCharges,
        extraCharges: totalExtraCharges,
        vatRate: booking.vat_rate ?? DEFAULT_PRICING_RULES.vatRate,
        serviceFeeRate: booking.service_fee_rate ?? DEFAULT_PRICING_RULES.serviceFeeRate,
        depositAmount: booking.deposit_amount || 0,
        amountPaid: booking.amount_paid || 0,
      })

      // Use transaction-safe RPC function to update both booking and room atomically
      // Note: RPC uses late_checkout_charge field, we pass the appropriate surcharge
      const surchargeToStore = bookingType === 'hourly' ? hourlyOvertimeCharge : lateCheckoutCharge
      
      const { data: result, error: rpcError } = await supabase.rpc('perform_checkout', {
        p_booking_id: bookingId,
        p_room_id: roomId,
        p_late_checkout_charge: surchargeToStore,
        p_service_charges: serviceCharges,
        p_subtotal: costBreakdown.subtotal,
        p_vat_amount: costBreakdown.vatAmount,
        p_service_fee_amount: costBreakdown.serviceFeeAmount,
        p_total_amount: costBreakdown.totalAmount,
      })

      if (rpcError) throw rpcError

      // Build success message based on booking type
      const remainingAmount = costBreakdown.remainingAmount
      let description: string | undefined
      
      if (remainingAmount > 0) {
        description = `Còn phải thu: ${formatCurrency(remainingAmount)}`
      } else if (bookingType === 'hourly' && hourlyOvertimeCharge > 0) {
        description = `Phí vượt giờ: ${formatCurrency(hourlyOvertimeCharge)}`
      } else if (bookingType === 'daily' && lateCheckoutCharge > 0) {
        description = `Phụ thu check-out trễ: ${formatCurrency(lateCheckoutCharge)}`
      }
      
      toast({ 
        title: 'Check-out thành công',
        description,
      })
      
      // Send checkout notification realtime
      if (tenant?.id) {
        const { data: roomData } = await supabase
          .from('rooms')
          .select('room_number, hotel_id')
          .eq('id', roomId)
          .single()
        
        if (roomData?.hotel_id) {
          triggerRoomCheckoutNotification({
            tenantId: tenant.id,
            hotelId: roomData.hotel_id,
            roomId,
            roomNumber: roomData.room_number || '',
            changedByUserId: user?.id,
          }).catch(err => console.error('Failed to send checkout notification:', err))
        }
      }
      
      invalidateQueries(roomId)
      options?.onSuccess?.()
      return true
    } catch (error: any) {
      console.error('Check-out error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi check-out',
        description: error.message?.includes('not in checked_in') 
          ? 'Booking chưa check-in hoặc đã check-out'
          : error.message?.includes('modified by another')
          ? 'Phòng đã được cập nhật bởi người khác. Vui lòng refresh lại.'
          : error.message,
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Mark booking as paid
   */
  const handleMarkAsPaid = async (bookingId: string, totalAmount: number, roomId?: string) => {
    setIsLoading(true)
    try {
      // Get current booking to calculate proper payment
      const { data: booking, error: fetchError } = await supabase
        .from('room_bookings')
        .select('total_amount, deposit_amount')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      const amountToPay = (booking.total_amount || totalAmount) - (booking.deposit_amount || 0)

      const { error } = await supabase
        .from('room_bookings')
        .update({
          amount_paid: amountToPay,
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (error) throw error

      toast({ title: 'Đã đánh dấu thanh toán đầy đủ' })
      invalidateQueries(roomId)
      return true
    } catch (error: any) {
      console.error('Mark as paid error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi cập nhật thanh toán',
        description: error.message,
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Cancel booking
   * Uses database transaction (RPC) to ensure atomicity for concurrent users
   */
  const handleCancel = async (bookingId: string, roomId?: string) => {
    setIsLoading(true)
    try {
      // Use transaction-safe RPC function
      const { data: result, error: rpcError } = await supabase.rpc('cancel_booking', {
        p_booking_id: bookingId,
        p_room_id: roomId || null,
      })

      if (rpcError) throw rpcError

      toast({ title: 'Đã hủy đặt phòng' })
      invalidateQueries(roomId)
      return true
    } catch (error: any) {
      console.error('Cancel booking error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi hủy đặt phòng',
        description: error.message?.includes('cannot be cancelled')
          ? 'Không thể hủy booking đã hoàn thành hoặc đã hủy'
          : error.message,
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    handleCheckIn,
    handleCheckOut,
    handleMarkAsPaid,
    handleCancel,
  }
}
