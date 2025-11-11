import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useUser } from './useUser'
import { toast } from 'sonner'
import { useToast } from '@/components/ui/use-toast'
import type { 
  AdjustmentWithDetails,
  AdjustmentFilters,
  CreateAdjustmentData,
  CheckAdjustmentItemData
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
      if (!tenant?.id) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_stock_adjustments_filtered', {
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
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }
    },
    enabled: !!tenant?.id,
  })
}

export function useStockAdjustment(adjustmentId: string | undefined) {
  return useQuery({
    queryKey: ['stock-adjustment', adjustmentId],
    queryFn: async () => {
      if (!adjustmentId) throw new Error('No adjustment ID')
      
      const { data: adjustment, error: adjustmentError } = await supabase
        .from('stock_adjustments')
        .select(`
          *,
          created_by_user:users!stock_adjustments_created_by_fkey(
            id, full_name, avatar_url
          ),
          approved_by_user:users!stock_adjustments_approved_by_fkey(
            id, full_name, avatar_url
          )
        `)
        .eq('id', adjustmentId)
        .single()
      
      if (adjustmentError) throw adjustmentError
      
      const { data: items, error: itemsError } = await supabase
        .from('stock_adjustment_items')
        .select(`
          *,
          item:items(
            id, code, name, unit_price,
            category:item_categories(name, color),
            item_images(id, url, is_primary, display_order)
          ),
          checked_by_user:users(id, full_name, avatar_url)
        `)
        .eq('adjustment_id', adjustmentId)
        .order('created_at')
      
      if (itemsError) throw itemsError
      
      return {
        adjustment,
        items,
      }
    },
    enabled: !!adjustmentId,
  })
}

export function useCreateStockAdjustment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { tenant } = useTenant()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (data: CreateAdjustmentData) => {
      if (!tenant?.id || !user?.hotel_id || !user?.id) {
        throw new Error('Missing required data')
      }
      
      const { data: result, error } = await supabase.rpc('create_stock_adjustment', {
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
      
      const response = result as unknown as { 
        success: boolean
        error?: string
        adjustment_id?: string
        adjustment_code?: string
        total_items?: number
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create adjustment')
      }
      
      return response
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      
      toast({
        title: 'Thành công',
        description: `Đã tạo phiếu kiểm kê ${result.adjustment_code} với ${result.total_items} items`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateAdjustmentStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  
  return useMutation({
    mutationFn: async ({
      adjustmentId,
      status,
    }: {
      adjustmentId: string
      status: string
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
      
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật trạng thái',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useCheckAdjustmentItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({
      adjustmentId,
      itemData,
    }: {
      adjustmentId: string
      itemData: CheckAdjustmentItemData
    }) => {
      if (!user?.id) throw new Error('No user')
      
      const { error } = await supabase
        .from('stock_adjustment_items')
        .update({
          actual_quantity: itemData.actual_quantity,
          discrepancy_reason: itemData.discrepancy_reason || null,
          photos: itemData.photos || null,
          checked_by: user.id,
          checked_at: new Date().toISOString(),
          status: 'pending',
        })
        .eq('adjustment_id', adjustmentId)
        .eq('item_id', itemData.item_id)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useApproveAdjustment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({
      adjustmentId,
      approvalNotes,
      itemIds,
    }: {
      adjustmentId: string
      approvalNotes?: string
      itemIds?: string[]
    }) => {
      if (!user?.id) throw new Error('No user')
      
      let query = supabase
        .from('stock_adjustment_items')
        .update({ status: 'approved' })
        .eq('adjustment_id', adjustmentId)
        .eq('status', 'pending')
      
      if (itemIds && itemIds.length > 0) {
        query = query.in('item_id', itemIds)
      }
      
      const { error: itemsError } = await query
      
      if (itemsError) throw itemsError
      
      const { data: pendingItems } = await supabase
        .from('stock_adjustment_items')
        .select('id')
        .eq('adjustment_id', adjustmentId)
        .eq('status', 'pending')
      
      if (!pendingItems || pendingItems.length === 0) {
        const { error: adjustmentError } = await supabase
          .from('stock_adjustments')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            approval_notes: approvalNotes || null,
          })
          .eq('id', adjustmentId)
        
        if (adjustmentError) throw adjustmentError
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      toast({
        title: 'Thành công',
        description: 'Đã duyệt phiếu kiểm kê',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useRejectAdjustment() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({
      adjustmentId,
      rejectionReason,
    }: {
      adjustmentId: string
      rejectionReason: string
    }) => {
      if (!user?.id) throw new Error('No user')
      
      const { error } = await supabase
        .from('stock_adjustments')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approval_notes: rejectionReason,
        })
        .eq('id', adjustmentId)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      
      toast({
        title: 'Đã từ chối',
        description: 'Phiếu kiểm kê đã bị từ chối',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
