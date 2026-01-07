import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useState } from 'react'
import { format } from 'date-fns'
import { 
  calculateEarlyCheckinCharge, 
  calculateLateCheckoutCharge,
  calculateBookingCost,
  DEFAULT_PRICING_RULES 
} from '@/lib/bookingCalculations'
import { formatCurrency } from '@/lib/utils'
import { calculateServiceChargesFromConsumables } from '@/hooks/usePricingRules'

interface UseBookingActionsOptions {
  onSuccess?: () => void
}

export function useBookingActions(options?: UseBookingActionsOptions) {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

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
   * Automatically calculates early check-in surcharge
   */
  /**
   * Check-in: Update booking status to 'checked_in' AND room status to 'occupied'
   * Uses database transaction (RPC) to ensure atomicity for concurrent users
   */
  const handleCheckIn = async (bookingId: string, roomId: string) => {
    setIsLoading(true)
    try {
      // First get the booking to calculate surcharge
      const { data: booking, error: fetchError } = await supabase
        .from('room_bookings')
        .select('room_price')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      // Calculate early check-in surcharge based on actual time
      const now = new Date()
      const actualTime = format(now, 'HH:mm')
      const earlyCheckinCharge = calculateEarlyCheckinCharge(actualTime, booking.room_price || 0)

      // Use transaction-safe RPC function to update both booking and room atomically
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
      toast({
        variant: 'destructive',
        title: 'Lỗi check-in',
        description: error.message?.includes('already checked') 
          ? 'Booking đã được check-in hoặc không hợp lệ'
          : error.message,
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check-out: Update booking status to 'checked_out' AND room status to 'check_out'
   * Uses database transaction (RPC) to ensure atomicity for concurrent users
   */
  const handleCheckOut = async (bookingId: string, roomId: string) => {
    setIsLoading(true)
    try {
      // First get the booking to calculate final billing
      const { data: booking, error: fetchError } = await supabase
        .from('room_bookings')
        .select('room_price, early_checkin_charge, vat_rate, service_fee_rate, service_charges, extra_charges, deposit_amount, amount_paid, check_in_date, check_out_date')
        .eq('id', bookingId)
        .single()

      if (fetchError) throw fetchError

      // Calculate late check-out surcharge based on actual time
      const now = new Date()
      const actualTime = format(now, 'HH:mm')
      const lateCheckoutCharge = calculateLateCheckoutCharge(actualTime, booking.room_price || 0)

      // Calculate nights
      const checkIn = new Date(booking.check_in_date)
      const checkOut = new Date(booking.check_out_date)
      const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)))

      // Auto-calculate service charges from consumables
      const consumablesTotal = await calculateServiceChargesFromConsumables(bookingId)
      const serviceCharges = consumablesTotal > 0 ? consumablesTotal : (booking.service_charges || 0)

      // Calculate final cost breakdown
      const costBreakdown = calculateBookingCost({
        roomPrice: booking.room_price || 0,
        nights,
        earlyCheckinCharge: booking.early_checkin_charge || 0,
        lateCheckoutCharge,
        serviceCharges,
        extraCharges: booking.extra_charges || 0,
        vatRate: booking.vat_rate || DEFAULT_PRICING_RULES.vatRate,
        serviceFeeRate: booking.service_fee_rate || DEFAULT_PRICING_RULES.serviceFeeRate,
        depositAmount: booking.deposit_amount || 0,
        amountPaid: booking.amount_paid || 0,
      })

      // Use transaction-safe RPC function to update both booking and room atomically
      const { data: result, error: rpcError } = await supabase.rpc('perform_checkout', {
        p_booking_id: bookingId,
        p_room_id: roomId,
        p_late_checkout_charge: lateCheckoutCharge,
        p_service_charges: serviceCharges,
        p_subtotal: costBreakdown.subtotal,
        p_vat_amount: costBreakdown.vatAmount,
        p_service_fee_amount: costBreakdown.serviceFeeAmount,
        p_total_amount: costBreakdown.totalAmount,
      })

      if (rpcError) throw rpcError

      const remainingAmount = costBreakdown.remainingAmount
      toast({ 
        title: 'Check-out thành công',
        description: remainingAmount > 0 
          ? `Còn phải thu: ${formatCurrency(remainingAmount)}`
          : lateCheckoutCharge > 0
          ? `Phụ thu check-out trễ: ${formatCurrency(lateCheckoutCharge)}`
          : undefined,
      })
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
