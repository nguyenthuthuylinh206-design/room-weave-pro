import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useUser } from './useUser'
import { toast } from 'sonner'
import type { 
  AdjustmentWithDetails,
  AdjustmentFilters,
  CreateAdjustmentData
} from '@/types/inventory.types'

export function useStockAdjustments(
  filters: AdjustmentFilters = {},
  page = 1,
  pageSize = 25
) {
  const { tenant } = useTenant()
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['stock-adjustments', tenant?.id, user?.hotel_id, filters, page, pageSize],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('Missing tenant')
      
      const { data, error } = await supabase
        .rpc('get_stock_adjustments_filtered', {
          p_tenant_id: tenant.id,
          p_hotel_id: user?.hotel_id || null,
          p_status: filters.status || null,
          p_adjustment_type: filters.adjustment_type || null,
          p_created_by: filters.created_by || null,
          p_date_from: filters.date_from?.toISOString().split('T')[0] || null,
          p_date_to: filters.date_to?.toISOString().split('T')[0] || null,
          p_limit: pageSize,
          p_offset: (page - 1) * pageSize,
        })
      
      if (error) throw error
      
      const adjustments = data as AdjustmentWithDetails[]
      const total = adjustments[0]?.total_count || 0
      
      return {
        adjustments,
        total,
        pages: Math.ceil(total / pageSize),
      }
    },
    enabled: !!tenant?.id,
  })
}

export function useStockAdjustment(adjustmentId?: string) {
  const { tenant } = useTenant()
  
  return useQuery({
    queryKey: ['stock-adjustment', adjustmentId],
    queryFn: async () => {
      if (!adjustmentId) throw new Error('Missing adjustment ID')
      
      const { data: adjustment, error: adjError } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          created_by_user:users!stock_adjustments_created_by_fkey(full_name, avatar_url),
          approved_by_user:users!stock_adjustments_approved_by_fkey(full_name, avatar_url)
        `)
        .eq('id', adjustmentId)
        .single()
      
      if (adjError) throw adjError
      
      const { data: items, error: itemsError } = await supabase
        .from('stock_adjustment_items')
        .select(`
          *,
          item:items(id, code, name, images, unit)
        `)
        .eq('adjustment_id', adjustmentId)
        .order('created_at', { ascending: true })
      
      if (itemsError) throw itemsError
      
      return {
        ...adjustment,
        items,
      }
    },
    enabled: !!adjustmentId && !!tenant?.id,
  })
}

export function useCreateStockAdjustment() {
  const { tenant } = useTenant()
  const { user } = useUser()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateAdjustmentData) => {
      if (!tenant?.id || !user?.hotel_id || !user?.id) {
        throw new Error('Missing required information')
      }
      
      const { data: result, error } = await supabase
        .rpc('create_stock_adjustment', {
          p_tenant_id: tenant.id,
          p_hotel_id: user.hotel_id,
          p_adjustment_type: data.adjustment_type,
          p_scheduled_date: data.scheduled_date.toISOString().split('T')[0],
          p_created_by: user.id,
          p_assigned_to: data.assigned_to,
          p_item_ids: data.item_ids,
          p_notes: data.notes || null,
        })
      
      if (error) throw error
      
      const typedResult = result as unknown as { 
        success: boolean
        error?: string
        adjustment_id?: string
        adjustment_code?: string
      }
      
      if (!typedResult.success) throw new Error(typedResult.error)
      
      return typedResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      toast.success('Đã tạo phiếu kiểm kê thành công')
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`)
    },
  })
}

export function useUpdateAdjustmentStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      adjustmentId, 
      status 
    }: { 
      adjustmentId: string
      status: 'in_progress' | 'completed' | 'approved' | 'rejected'
    }) => {
      const updateData: any = { status }
      
      if (status === 'in_progress') {
        updateData.started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
      
      const { error } = await supabase
        .from('stock_adjustments')
        .update(updateData)
        .eq('id', adjustmentId)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      toast.success('Đã cập nhật trạng thái')
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`)
    },
  })
}
