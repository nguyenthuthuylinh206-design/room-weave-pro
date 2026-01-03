import { useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useState } from 'react'

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
    if (roomId) {
      queryClient.invalidateQueries({ queryKey: ['room-booking', roomId] })
      queryClient.invalidateQueries({ queryKey: ['room-bookings', roomId] })
    }
  }

  /**
   * Check-in: Update booking status to 'checked_in' AND room status to 'occupied'
   */
  const handleCheckIn = async (bookingId: string, roomId: string) => {
    setIsLoading(true)
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_in',
          actual_check_in: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (bookingError) throw bookingError

      // Update room status to 'occupied'
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'occupied' })
        .eq('id', roomId)

      if (roomError) throw roomError

      toast({ title: 'Check-in thành công' })
      invalidateQueries(roomId)
      options?.onSuccess?.()
      return true
    } catch (error: any) {
      console.error('Check-in error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi check-in',
        description: error.message,
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Check-out: Update booking status to 'checked_out' AND room status to 'check_out'
   * Room will be in 'check_out' state until cleaned/inspected, then 'vacant'
   */
  const handleCheckOut = async (bookingId: string, roomId: string) => {
    setIsLoading(true)
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('room_bookings')
        .update({
          status: 'checked_out',
          actual_check_out: new Date().toISOString(),
        })
        .eq('id', bookingId)

      if (bookingError) throw bookingError

      // Update room status to 'check_out' (needs inspection/cleaning)
      const { error: roomError } = await supabase
        .from('rooms')
        .update({ status: 'check_out' })
        .eq('id', roomId)

      if (roomError) throw roomError

      toast({ title: 'Check-out thành công' })
      invalidateQueries(roomId)
      options?.onSuccess?.()
      return true
    } catch (error: any) {
      console.error('Check-out error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi check-out',
        description: error.message,
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
      const { error } = await supabase
        .from('room_bookings')
        .update({
          payment_status: 'paid',
          paid_at: new Date().toISOString(),
          total_amount: totalAmount,
        })
        .eq('id', bookingId)

      if (error) throw error

      toast({ title: 'Đã đánh dấu thanh toán' })
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
   */
  const handleCancel = async (bookingId: string, roomId?: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('room_bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (error) throw error

      toast({ title: 'Đã hủy đặt phòng' })
      invalidateQueries(roomId)
      return true
    } catch (error: any) {
      console.error('Cancel booking error:', error)
      toast({
        variant: 'destructive',
        title: 'Lỗi hủy đặt phòng',
        description: error.message,
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
