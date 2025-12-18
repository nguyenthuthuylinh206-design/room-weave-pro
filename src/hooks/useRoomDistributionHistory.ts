import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface RoomDistributionHistoryItem {
  order_id: string
  order_code: string
  order_status: string
  room_status: string
  total_items: number
  total_quantity: number
  delivered_at: string | null
  confirmed_at: string | null
  confirmed_by_name: string | null
  assigned_to_name: string | null
  rejection_reason: string | null
  created_at: string
  items: {
    item_id: string
    item_name: string
    item_code: string
    quantity: number
    quantity_confirmed: number
    status: string
  }[]
}

export function useRoomDistributionHistory(roomId: string | undefined) {
  return useQuery({
    queryKey: ['room-distribution-history', roomId],
    queryFn: async () => {
      if (!roomId) return []
      
      const { data, error } = await supabase
        .rpc('get_room_distribution_history' as any, { p_room_id: roomId })
      
      if (error) throw error
      return (data || []) as unknown as RoomDistributionHistoryItem[]
    },
    enabled: !!roomId
  })
}

export function useRejectRoomDelivery() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      distributionOrderRoomId, 
      rejectedBy, 
      rejectionReason 
    }: { 
      distributionOrderRoomId: string
      rejectedBy: string
      rejectionReason: string 
    }) => {
      const { data, error } = await supabase
        .rpc('reject_room_delivery' as any, {
          p_distribution_order_room_id: distributionOrderRoomId,
          p_rejected_by: rejectedBy,
          p_rejection_reason: rejectionReason
        })
      
      if (error) throw error
      const result = data as any
      if (!result?.success) throw new Error(result?.error || 'Failed to reject')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['room-distribution-history'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Đã từ chối giao hàng')
    },
    onError: (error) => {
      toast.error('Lỗi: ' + (error as Error).message)
    }
  })
}

export function useUndoRoomDelivery() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      distributionOrderRoomId, 
      performedBy 
    }: { 
      distributionOrderRoomId: string
      performedBy: string
    }) => {
      const { data, error } = await supabase
        .rpc('undo_room_delivery_confirmation' as any, {
          p_distribution_order_room_id: distributionOrderRoomId,
          p_performed_by: performedBy
        })
      
      if (error) throw error
      const result = data as any
      if (!result?.success) throw new Error(result?.error || 'Failed to undo')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-order-detail'] })
      queryClient.invalidateQueries({ queryKey: ['distribution-orders'] })
      queryClient.invalidateQueries({ queryKey: ['room-distribution-history'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['room-items'] })
      toast.success('Đã hoàn tác xác nhận giao hàng')
    },
    onError: (error) => {
      toast.error('Lỗi: ' + (error as Error).message)
    }
  })
}
