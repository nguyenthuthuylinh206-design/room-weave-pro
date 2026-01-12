import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useUser } from './useUser'
import type { CheckoutInspectionRequest, CheckoutInspectionRequestWithDetails } from '@/types/checkout-inspection.types'

export function useCheckoutInspection(bookingId: string | undefined) {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  // Fetch current inspection request for this booking
  const { data: inspection, isLoading, refetch } = useQuery({
    queryKey: ['checkout-inspection', bookingId],
    queryFn: async () => {
      if (!bookingId) return null
      
      const { data, error } = await supabase
        .from('checkout_inspection_requests')
        .select(`
          *,
          assigned_user:users!checkout_inspection_requests_assigned_to_fkey(id, full_name, avatar_url),
          requested_user:users!checkout_inspection_requests_requested_by_fkey(id, full_name),
          room:rooms!checkout_inspection_requests_room_id_fkey(id, room_number),
          booking:room_bookings!checkout_inspection_requests_booking_id_fkey(id, guest_name)
        `)
        .eq('booking_id', bookingId)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching checkout inspection:', error)
        return null
      }
      
      return data as CheckoutInspectionRequestWithDetails | null
    },
    enabled: !!bookingId,
  })
  
  // Realtime subscription
  useEffect(() => {
    if (!bookingId) return
    
    const channel = supabase
      .channel(`checkout-inspection-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_inspection_requests',
          filter: `booking_id=eq.${bookingId}`,
        },
        () => {
          refetch()
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [bookingId, refetch])
  
  // Create inspection request
  const createInspection = useMutation({
    mutationFn: async ({ 
      tenantId, 
      hotelId, 
      roomId, 
      assignedTo,
      notes,
    }: { 
      tenantId: string
      hotelId: string
      roomId: string
      assignedTo: string
      notes?: string
    }) => {
      if (!bookingId || !user?.id) throw new Error('Missing required data')
      
      const { data, error } = await supabase
        .from('checkout_inspection_requests')
        .insert({
          tenant_id: tenantId,
          hotel_id: hotelId,
          room_id: roomId,
          booking_id: bookingId,
          requested_by: user.id,
          assigned_to: assignedTo,
          status: 'pending',
          notes,
        })
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-inspection', bookingId] })
      toast.success('Đã gửi yêu cầu kiểm tra phòng')
    },
    onError: (error: Error) => {
      console.error('Error creating inspection:', error)
      toast.error('Lỗi gửi yêu cầu: ' + error.message)
    },
  })
  
  // Cancel inspection request
  const cancelInspection = useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from('checkout_inspection_requests')
        .update({ status: 'cancelled' })
        .eq('id', inspectionId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-inspection', bookingId] })
      toast.success('Đã hủy yêu cầu kiểm tra')
    },
    onError: (error: Error) => {
      toast.error('Lỗi hủy yêu cầu: ' + error.message)
    },
  })
  
  // Start inspection (change status to in_progress)
  const startInspection = useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from('checkout_inspection_requests')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkout-inspection', bookingId] })
      toast.success('Bắt đầu kiểm tra phòng')
    },
    onError: (error: Error) => {
      toast.error('Lỗi: ' + error.message)
    },
  })
  
  return {
    inspection,
    isLoading,
    createInspection,
    cancelInspection,
    startInspection,
    refetch,
  }
}

// Hook for staff to get pending inspection requests assigned to them
export function usePendingInspections(roomId: string | undefined) {
  const { user } = useUser()
  const queryClient = useQueryClient()
  
  const { data: pendingInspection, isLoading, refetch } = useQuery({
    queryKey: ['pending-inspection', roomId, user?.id],
    queryFn: async () => {
      if (!roomId || !user?.id) return null
      
      const { data, error } = await supabase
        .from('checkout_inspection_requests')
        .select(`
          *,
          requested_user:users!checkout_inspection_requests_requested_by_fkey(id, full_name),
          booking:room_bookings!checkout_inspection_requests_booking_id_fkey(id, guest_name, check_out_date)
        `)
        .eq('room_id', roomId)
        .eq('assigned_to', user.id)
        .in('status', ['pending', 'in_progress'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (error) {
        console.error('Error fetching pending inspection:', error)
        return null
      }
      
      return data as CheckoutInspectionRequestWithDetails | null
    },
    enabled: !!roomId && !!user?.id,
  })
  
  // Realtime subscription
  useEffect(() => {
    if (!roomId || !user?.id) return
    
    const channel = supabase
      .channel(`pending-inspection-${roomId}-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkout_inspection_requests',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          refetch()
          queryClient.invalidateQueries({ queryKey: ['checkout-inspection'] })
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, user?.id, refetch, queryClient])
  
  // Start inspection
  const startInspection = useMutation({
    mutationFn: async (inspectionId: string) => {
      const { error } = await supabase
        .from('checkout_inspection_requests')
        .update({ 
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', inspectionId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-inspection', roomId, user?.id] })
      toast.success('Bắt đầu kiểm tra phòng')
    },
    onError: (error: Error) => {
      toast.error('Lỗi: ' + error.message)
    },
  })
  
  return {
    pendingInspection,
    isLoading,
    startInspection,
    refetch,
  }
}

// Hook to complete inspection (called when room check is submitted)
export function useCompleteCheckoutInspection() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      roomCheckId,
    }: { 
      bookingId: string
      roomCheckId: string
    }) => {
      // Find the pending/in_progress inspection for this booking
      const { data: inspection, error: findError } = await supabase
        .from('checkout_inspection_requests')
        .select('id')
        .eq('booking_id', bookingId)
        .in('status', ['pending', 'in_progress'])
        .maybeSingle()
      
      if (findError) throw findError
      if (!inspection) return null // No pending inspection
      
      // Complete the inspection
      const { error: updateError } = await supabase
        .from('checkout_inspection_requests')
        .update({
          status: 'completed',
          room_check_id: roomCheckId,
          completed_at: new Date().toISOString(),
        })
        .eq('id', inspection.id)
      
      if (updateError) throw updateError
      
      return inspection.id
    },
    onSuccess: (inspectionId, variables) => {
      if (inspectionId) {
        queryClient.invalidateQueries({ queryKey: ['checkout-inspection', variables.bookingId] })
        queryClient.invalidateQueries({ queryKey: ['pending-inspection'] })
      }
    },
  })
}
