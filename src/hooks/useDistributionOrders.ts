import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import type { DistributionOrder, DistributionOrderDetail, CreateDistributionData, DistributionFilters } from '@/types/distribution.types'
import { 
  triggerDistributionOrderCreated, 
  triggerDistributionDeliveryConfirmed, 
  triggerDistributionOrderCancelled 
} from './useNotificationTriggers'

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
      
      // Calculate totals for notification
      const totalRooms = data.rooms.length
      const totalItems = data.rooms.reduce((sum, room) => {
        return sum + room.items.reduce((itemSum, item) => itemSum + item.quantity, 0)
      }, 0)

      return { 
        ...(result as { success: boolean; order_id: string; order_code: string }),
        assigned_to: data.assigned_to,
        totalRooms,
        totalItems,
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success(`Tạo phiếu giao hàng ${result.order_code} thành công`)

      // Send notification to assigned staff
      if (tenant?.id && selectedHotel?.id && user?.id && result.assigned_to) {
        try {
          await triggerDistributionOrderCreated({
            tenantId: tenant.id,
            hotelId: selectedHotel.id,
            orderId: result.order_id,
            orderCode: result.order_code,
            assignedToUserId: result.assigned_to,
            createdByUserId: user.id,
            totalRooms: result.totalRooms,
            totalItems: result.totalItems,
          })
        } catch (e) {
          console.error('Failed to send notification:', e)
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể tạo phiếu giao hàng')
    },
  })
}

export function useCompleteRoomDelivery() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { tenant } = useTenant()

  return useMutation({
    mutationFn: async ({ 
      roomOrderId, 
      items,
      orderCode,
      roomNumber,
      createdByUserId,
    }: { 
      roomOrderId: string
      items?: { item_id: string; quantity_confirmed: number }[]
      orderCode?: string
      roomNumber?: string
      createdByUserId?: string
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      // Build item confirmations as JSONB format expected by RPC
      const itemConfirmations = items 
        ? items.reduce((acc, item) => {
            acc[item.item_id] = { quantity_confirmed: item.quantity_confirmed }
            return acc
          }, {} as Record<string, { quantity_confirmed: number }>)
        : null

      const { data, error } = await supabase.rpc('complete_room_delivery', {
        p_distribution_order_room_id: roomOrderId,
        p_confirmed_by: user.id,
        p_item_confirmations: itemConfirmations,
      })

      if (error) throw error
      return { 
        ...(data as { success: boolean; room_id: string; all_completed: boolean }),
        orderCode,
        roomNumber,
        createdByUserId,
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
      queryClient.invalidateQueries({ queryKey: ['room-items'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['room-distribution-history'] })
      
      if (result.all_completed) {
        toast.success('Đã hoàn thành giao hàng cho tất cả các phòng!')
      } else {
        toast.success('Xác nhận giao hàng thành công')
      }

      // Send notification to order creator
      if (tenant?.id && user?.id && result.createdByUserId && result.orderCode && result.roomNumber) {
        try {
          await triggerDistributionDeliveryConfirmed({
            tenantId: tenant.id,
            orderId: '', // We don't have order ID here but it's okay
            orderCode: result.orderCode,
            roomNumber: result.roomNumber,
            createdByUserId: result.createdByUserId,
            confirmedByUserId: user.id,
            allCompleted: result.all_completed,
          })
        } catch (e) {
          console.error('Failed to send notification:', e)
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể xác nhận giao hàng')
    },
  })
}

export function useCancelDistributionOrder() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { tenant } = useTenant()

  return useMutation({
    mutationFn: async ({ orderId, orderCode, assignedToUserId }: { 
      orderId: string
      orderCode?: string
      assignedToUserId?: string | null 
    }) => {
      if (!user?.id) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('cancel_distribution_order', {
        p_order_id: orderId,
        p_cancelled_by: user.id,
      })

      if (error) throw error
      return { 
        ...(data as { success: boolean; order_id: string }),
        orderCode,
        assignedToUserId,
      }
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Đã hủy phiếu giao hàng')

      // Send notification to assigned staff
      if (tenant?.id && user?.id && result.assignedToUserId && result.orderCode) {
        try {
          await triggerDistributionOrderCancelled({
            tenantId: tenant.id,
            orderId: result.order_id,
            orderCode: result.orderCode,
            assignedToUserId: result.assignedToUserId,
            cancelledByUserId: user.id,
          })
        } catch (e) {
          console.error('Failed to send notification:', e)
        }
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể hủy phiếu giao hàng')
    },
  })
}
