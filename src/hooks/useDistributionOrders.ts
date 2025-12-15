import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { DistributionOrder, DistributionOrderDetail, CreateDistributionData, DistributionFilters } from '@/types/distribution.types'

export function useDistributionOrders(filters: DistributionFilters = {}, page = 1, pageSize = 25) {
  const { tenant } = useTenant()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: ['distribution-orders', tenant?.id, isAllHotelsMode ? 'all' : selectedHotel?.id, filters, page, pageSize],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('No tenant')
      if (!isAllHotelsMode && !selectedHotel?.id) throw new Error('No hotel selected')

      const { data, error } = await supabase.rpc('get_distribution_orders_filtered', {
        p_tenant_id: tenant.id,
        p_hotel_id: isAllHotelsMode ? null : selectedHotel?.id,
        p_status: filters.status || null,
        p_assigned_to: filters.assigned_to || null,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      })

      if (error) throw error
      return {
        data: data as DistributionOrder[],
        totalCount: (data as DistributionOrder[])?.[0]?.total_count || 0,
      }
    },
    enabled: !!tenant?.id && (isAllHotelsMode || !!selectedHotel?.id),
  })
}

export function useDistributionOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: ['distribution-order-detail', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID')

      const { data, error } = await supabase.rpc('get_distribution_order_detail', {
        p_order_id: orderId,
      })

      if (error) throw error
      return data as unknown as DistributionOrderDetail
    },
    enabled: !!orderId,
  })
}

export function useCreateDistributionOrder() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const { selectedHotel } = useHotelContext()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateDistributionData) => {
      if (!tenant?.id || !selectedHotel?.id || !user?.id) {
        throw new Error('Missing required context')
      }

      const { data: result, error } = await supabase.rpc('create_distribution_order', {
        p_tenant_id: tenant.id,
        p_hotel_id: selectedHotel.id,
        p_created_by: user.id,
        p_assigned_to: data.assigned_to || null,
        p_rooms: data.rooms,
        p_notes: data.notes || null,
      })

      if (error) throw error
      return result as { success: boolean; order_id: string; order_code: string }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success(`Tạo phiếu giao hàng ${result.order_code} thành công`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể tạo phiếu giao hàng')
    },
  })
}

export function useCompleteRoomDelivery() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({ roomOrderId, items }: { roomOrderId: string; items?: { item_id: string; quantity_confirmed: number }[] }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('complete_room_delivery', {
        p_distribution_order_room_id: roomOrderId,
        p_confirmed_by: user.id,
        p_items: items || null,
      })

      if (error) throw error
      return data as { success: boolean; room_id: string; all_completed: boolean }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
      queryClient.invalidateQueries({ queryKey: ['room-items'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      if (result.all_completed) {
        toast.success('Đã hoàn thành giao hàng cho tất cả các phòng!')
      } else {
        toast.success('Xác nhận giao hàng thành công')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể xác nhận giao hàng')
    },
  })
}
