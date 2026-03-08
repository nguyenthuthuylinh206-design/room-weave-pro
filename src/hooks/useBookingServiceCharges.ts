import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from '@/hooks/useTenant'
import { useToast } from '@/hooks/use-toast'
import type { BookingServiceCharge } from '@/types/services.types'

export function useBookingServiceCharges(bookingId: string | undefined) {
  const { tenant } = useTenant()
  const tenantId = tenant?.id

  return useQuery({
    queryKey: ['booking-service-charges', bookingId, tenantId],
    queryFn: async () => {
      if (!bookingId || !tenantId) return []

      const { data, error } = await supabase
        .from('booking_service_charges')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as BookingServiceCharge[]
    },
    enabled: !!bookingId && !!tenantId,
  })
}

export function useAddServiceCharge() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (params: {
      bookingId: string
      serviceId: string | null
      serviceName: string
      quantity: number
      unitPrice: number
    }) => {
      if (!tenant?.id) throw new Error('Missing tenant')

      const { data: userData } = await supabase.auth.getUser()

      const totalPrice = params.quantity * params.unitPrice
      const { data, error } = await supabase
        .from('booking_service_charges')
        .insert({
          tenant_id: tenant.id,
          booking_id: params.bookingId,
          service_id: params.serviceId,
          service_name: params.serviceName,
          quantity: params.quantity,
          unit_price: params.unitPrice,
          total_price: totalPrice,
          created_by: userData?.user?.id || null,
        })
        .select()
        .single()

      if (error) throw error

      // Update booking service_charges total
      const { data: allCharges } = await supabase
        .from('booking_service_charges')
        .select('total_price')
        .eq('booking_id', params.bookingId)
        .eq('tenant_id', tenant.id)

      const totalServiceCharges = (allCharges || []).reduce((sum, c) => sum + (c.total_price || 0), 0)

      await supabase
        .from('room_bookings')
        .update({ service_charges: totalServiceCharges })
        .eq('id', params.bookingId)

      return data
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['booking-service-charges', params.bookingId] })
      queryClient.invalidateQueries({ queryKey: ['room-booking'] })
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      toast({ title: 'Đã thêm dịch vụ' })
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message })
    },
  })
}

export function useDeleteServiceCharge() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ chargeId, bookingId }: { chargeId: string; bookingId: string }) => {
      if (!tenant?.id) throw new Error('Missing tenant')

      const { error } = await supabase
        .from('booking_service_charges')
        .delete()
        .eq('id', chargeId)

      if (error) throw error

      // Recalculate booking service_charges total
      const { data: allCharges } = await supabase
        .from('booking_service_charges')
        .select('total_price')
        .eq('booking_id', bookingId)
        .eq('tenant_id', tenant.id)

      const totalServiceCharges = (allCharges || []).reduce((sum, c) => sum + (c.total_price || 0), 0)

      await supabase
        .from('room_bookings')
        .update({ service_charges: totalServiceCharges })
        .eq('id', bookingId)
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['booking-service-charges', params.bookingId] })
      queryClient.invalidateQueries({ queryKey: ['room-booking'] })
      queryClient.invalidateQueries({ queryKey: ['all-bookings'] })
      toast({ title: 'Đã xóa dịch vụ' })
    },
    onError: (error: any) => {
      toast({ variant: 'destructive', title: 'Lỗi', description: error.message })
    },
  })
}
