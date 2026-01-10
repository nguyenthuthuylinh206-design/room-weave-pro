import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import { useToast } from '@/components/ui/use-toast'
import { triggerAdjustmentPendingApproval, triggerAdjustmentAssigned } from '@/hooks/useNotificationTriggers'
import { isAdminUser, isManager } from '@/lib/userAccess'
import { triggerWorkflow, WorkflowTriggerTypes } from '@/lib/triggerWorkflow'
import type { 
  AdjustmentWithDetails,
  AdjustmentFilters,
  CreateAdjustmentData,
  CheckAdjustmentItemData
} from '@/types/inventory.types'
import type {
  StartInvestigationDto,
  ResolveInvestigationDto,
  ApproveItemDto,
  ResolutionType,
} from '@/types/adjustment-investigation.types'

export function useStockAdjustments(
  filters: AdjustmentFilters = {},
  page = 1,
  pageSize = 25
) {
  const { tenant } = useTenant()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  
  return useQuery({
    queryKey: ['stock-adjustments', tenant?.id, isAllHotelsMode ? 'all' : selectedHotel?.id, filters, page, pageSize],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('No tenant')
      
      const { data, error } = await supabase.rpc('get_stock_adjustments_filtered', {
        p_tenant_id: tenant.id,
        p_hotel_id: isAllHotelsMode ? null : (selectedHotel?.id || null),
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
          checked_by_user:users!stock_adjustment_items_checked_by_fkey(id, full_name, avatar_url),
          approved_by_user:users!stock_adjustment_items_approved_by_fkey(id, full_name, avatar_url),
          responsible_person:users!stock_adjustment_items_responsible_person_id_fkey(id, full_name, avatar_url)
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
  const { selectedHotel } = useHotelContext()
  
  return useMutation({
    mutationFn: async (data: CreateAdjustmentData) => {
      if (!tenant?.id || !selectedHotel?.id || !user?.id) {
        throw new Error('Missing required data')
      }
      
      const { data: result, error } = await supabase.rpc('create_stock_adjustment', {
        p_tenant_id: tenant.id,
        p_hotel_id: selectedHotel.id,
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
    onSuccess: async (result: any, variables: CreateAdjustmentData) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      
      // Send notification to assigned staff
      if (variables.assigned_to && variables.assigned_to.length > 0 && selectedHotel?.id && tenant?.id && user?.id) {
        triggerAdjustmentAssigned({
          tenantId: tenant.id,
          hotelId: selectedHotel.id,
          adjustmentId: result.adjustment_id,
          adjustmentCode: result.adjustment_code,
          scheduledDate: variables.scheduled_date.toLocaleDateString('vi-VN'),
          assignedToUserIds: variables.assigned_to,
          createdByUserId: user.id,
        })
        
        // Trigger workflow for adjustment created
        triggerWorkflow({
          triggerType: WorkflowTriggerTypes.ADJUSTMENT_CREATED,
          eventData: {
            adjustment_id: result.adjustment_id,
            adjustment_code: result.adjustment_code,
            scheduled_date: variables.scheduled_date.toLocaleDateString('vi-VN'),
            assigned_to: variables.assigned_to,
            total_items: result.total_items,
            created_by: user.id,
            created_by_name: user.full_name,
          },
          tenantId: tenant.id,
          hotelId: selectedHotel.id,
        })
      }
      
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
  const { user } = useUser()
  
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
      
      // Return status and adjustmentId for onSuccess
      return { status, adjustmentId }
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      
      try {
        const { data: adj } = await supabase
          .from('stock_adjustments')
          .select('adjustment_code, hotel_id, tenant_id, stock_adjustment_items(id)')
          .eq('id', variables.adjustmentId)
          .single()
        
        if (adj) {
          // Trigger workflow for status changes
          if (result?.status === 'in_progress') {
            triggerWorkflow({
              triggerType: WorkflowTriggerTypes.ADJUSTMENT_STARTED,
              eventData: {
                adjustment_id: variables.adjustmentId,
                adjustment_code: adj.adjustment_code,
                started_by: user?.id,
                started_by_name: user?.full_name,
              },
              tenantId: adj.tenant_id,
              hotelId: adj.hotel_id,
            })
          }
          
          // Send notification when status becomes 'completed'
          if (result?.status === 'completed') {
            triggerAdjustmentPendingApproval({
              tenantId: adj.tenant_id,
              hotelId: adj.hotel_id,
              adjustmentId: variables.adjustmentId,
              adjustmentCode: adj.adjustment_code,
              triggeredByUserId: user?.id,
            })
            
            // Trigger workflow for completed adjustment
            triggerWorkflow({
              triggerType: WorkflowTriggerTypes.ADJUSTMENT_COMPLETED,
              eventData: {
                adjustment_id: variables.adjustmentId,
                adjustment_code: adj.adjustment_code,
                completed_by: user?.id,
                completed_by_name: user?.full_name,
                total_items: adj.stock_adjustment_items?.length || 0,
              },
              tenantId: adj.tenant_id,
              hotelId: adj.hotel_id,
            })
          }
        }
      } catch (e) {
        console.error('[Adjustment] Failed to trigger workflow:', e)
      }
      
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
      
      // Validation: Check if all items have been checked
      const { data: uncheckedItems } = await supabase
        .from('stock_adjustment_items')
        .select('id')
        .eq('adjustment_id', adjustmentId)
        .is('checked_at', null)

      if (uncheckedItems && uncheckedItems.length > 0) {
        throw new Error('Vẫn còn items chưa được kiểm tra. Vui lòng kiểm tra tất cả items trước khi duyệt.')
      }
      
      // Get adjustment info for transactions
      const { data: adjustment } = await supabase
        .from('stock_adjustments')
        .select('adjustment_code, hotel_id, tenant_id')
        .eq('id', adjustmentId)
        .single()
      
      if (!adjustment) throw new Error('Không tìm thấy phiếu kiểm kê')
      
      // Update items status to approved
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
      
      // Fetch all approved items with quantity differences
      const { data: approvedItems } = await supabase
        .from('stock_adjustment_items')
        .select('item_id, system_quantity, actual_quantity, unit_price')
        .eq('adjustment_id', adjustmentId)
        .eq('status', 'approved')

      // Update stock quantities and create transactions
      if (approvedItems && approvedItems.length > 0) {
        for (const item of approvedItems) {
          // Update quantity_in_stock in items table
          const { error: updateError } = await supabase
            .from('items')
            .update({ quantity_in_stock: item.actual_quantity })
            .eq('id', item.item_id)
          
          if (updateError) throw updateError
          
          // Create transaction only if there's a discrepancy
          if (item.system_quantity !== item.actual_quantity) {
            const quantity = item.actual_quantity - item.system_quantity
            const transactionType = quantity > 0 ? 'in' : 'out'
            
            const { error: transactionError } = await supabase
              .from('inventory_transactions')
              .insert({
                hotel_id: adjustment.hotel_id,
                tenant_id: adjustment.tenant_id,
                item_id: item.item_id,
                transaction_type: transactionType,
                transaction_category: 'adjustment',
                quantity: Math.abs(quantity),
                quantity_before: item.system_quantity,
                quantity_after: item.actual_quantity,
                transaction_code: `ADJ-${adjustment.adjustment_code}`,
                related_type: 'stock_adjustment',
                related_id: adjustmentId,
                created_by: user.id,
                unit_price: item.unit_price,
                total_value: Math.abs(quantity) * (item.unit_price || 0),
              })
            
            if (transactionError) throw transactionError
          }
        }
      }
      
      // Check if all items are now approved
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
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      // Trigger workflow for approved adjustment
      try {
        const { data: adj } = await supabase
          .from('stock_adjustments')
          .select('adjustment_code, hotel_id, tenant_id, created_by, stock_adjustment_items(id, actual_quantity, system_quantity)')
          .eq('id', variables.adjustmentId)
          .single()
        
        if (adj) {
          const discrepancyCount = adj.stock_adjustment_items?.filter(
            (item: any) => item.actual_quantity !== item.system_quantity
          ).length || 0
          
          triggerWorkflow({
            triggerType: WorkflowTriggerTypes.ADJUSTMENT_APPROVED,
            eventData: {
              adjustment_id: variables.adjustmentId,
              adjustment_code: adj.adjustment_code,
              approved_by: user?.id,
              approved_by_name: user?.full_name,
              total_items: adj.stock_adjustment_items?.length || 0,
              discrepancy_count: discrepancyCount,
              created_by: adj.created_by,
            },
            tenantId: adj.tenant_id,
            hotelId: adj.hotel_id,
          })
        }
      } catch (e) {
        console.error('[Adjustment] Failed to trigger approval workflow:', e)
      }
      
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
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      
      // Trigger workflow for rejected adjustment
      try {
        const { data: adj } = await supabase
          .from('stock_adjustments')
          .select('adjustment_code, hotel_id, tenant_id, created_by, assigned_to')
          .eq('id', variables.adjustmentId)
          .single()
        
        if (adj) {
          triggerWorkflow({
            triggerType: WorkflowTriggerTypes.ADJUSTMENT_REJECTED,
            eventData: {
              adjustment_id: variables.adjustmentId,
              adjustment_code: adj.adjustment_code,
              rejected_by: user?.id,
              rejected_by_name: user?.full_name,
              rejection_reason: variables.rejectionReason,
              created_by: adj.created_by,
              assigned_to: adj.assigned_to,
            },
            tenantId: adj.tenant_id,
            hotelId: adj.hotel_id,
          })
        }
      } catch (e) {
        console.error('[Adjustment] Failed to trigger rejection workflow:', e)
      }
      
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

// Hook to get count of pending adjustments (status = 'completed')
export function usePendingAdjustmentsCount() {
  const { tenant } = useTenant()
  const { user } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  
  const canSee = isAdminUser(user as any) || isManager(user as any)
  
  return useQuery({
    queryKey: ['pending-adjustments-count', tenant?.id, isAllHotelsMode ? 'all' : selectedHotel?.id],
    queryFn: async () => {
      if (!tenant?.id) return 0
      
      let query = supabase
        .from('stock_adjustments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .eq('tenant_id', tenant.id)
      
      // Non-admin/non-all-hotels mode: filter by selected hotel
      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }
      
      const { count, error } = await query
      
      if (error) {
        console.error('[usePendingAdjustmentsCount] Error:', error)
        return 0
      }
      
      return count || 0
    },
    enabled: !!tenant?.id && canSee,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// ============================================
// PER-ITEM APPROVAL & INVESTIGATION WORKFLOW
// ============================================

/**
 * Hook to approve a single item (for matched items without discrepancy)
 */
export function useApproveItem() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ itemId, adjustmentId, notes }: ApproveItemDto) => {
      if (!user?.id) throw new Error('No user')
      
      // Get item details first
      const { data: itemData, error: fetchError } = await supabase
        .from('stock_adjustment_items')
        .select('item_id, system_quantity, actual_quantity, unit_price')
        .eq('id', itemId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Update item status to approved
      const { error: updateError } = await supabase
        .from('stock_adjustment_items')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', itemId)
      
      if (updateError) throw updateError
      
      // Update stock quantity if there's a difference
      if (itemData.system_quantity !== itemData.actual_quantity) {
        const { error: stockError } = await supabase
          .from('items')
          .update({ quantity_in_stock: itemData.actual_quantity })
          .eq('id', itemData.item_id)
        
        if (stockError) throw stockError
        
        // Get adjustment info for transaction
        const { data: adjustment } = await supabase
          .from('stock_adjustments')
          .select('adjustment_code, hotel_id, tenant_id')
          .eq('id', adjustmentId)
          .single()
        
        if (adjustment) {
          const quantity = itemData.actual_quantity - itemData.system_quantity
          const transactionType = quantity > 0 ? 'in' : 'out'
          
          await supabase
            .from('inventory_transactions')
            .insert({
              hotel_id: adjustment.hotel_id,
              tenant_id: adjustment.tenant_id,
              item_id: itemData.item_id,
              transaction_type: transactionType,
              transaction_category: 'adjustment',
              quantity: Math.abs(quantity),
              quantity_before: itemData.system_quantity,
              quantity_after: itemData.actual_quantity,
              transaction_code: `ADJ-${adjustment.adjustment_code}`,
              related_type: 'stock_adjustment',
              related_id: adjustmentId,
              created_by: user.id,
              unit_price: itemData.unit_price,
              total_value: Math.abs(quantity) * (itemData.unit_price || 0),
            })
        }
      }
      
      // Check if all items are now approved, then update adjustment status
      await checkAndUpdateAdjustmentStatus(adjustmentId, user.id)
      
      return { itemId, adjustmentId }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast({ title: 'Đã duyệt item' })
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Hook to start investigation for a discrepancy item
 */
export function useStartInvestigation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ itemId, adjustmentId, notes }: StartInvestigationDto) => {
      if (!user?.id) throw new Error('No user')
      
      const { error } = await supabase
        .from('stock_adjustment_items')
        .update({
          status: 'investigating',
          investigation_status: 'investigating',
          investigation_notes: notes || null,
          investigation_started_at: new Date().toISOString(),
        })
        .eq('id', itemId)
      
      if (error) throw error
      return { itemId, adjustmentId }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      toast({ title: 'Đã bắt đầu điều tra' })
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Hook to resolve investigation and apply the resolution
 */
export function useResolveInvestigation() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ 
      itemId, 
      adjustmentId, 
      resolutionType, 
      resolutionNotes,
      responsiblePersonId 
    }: ResolveInvestigationDto) => {
      if (!user?.id) throw new Error('No user')
      
      // Get item details
      const { data: itemData, error: fetchError } = await supabase
        .from('stock_adjustment_items')
        .select('item_id, system_quantity, actual_quantity, unit_price')
        .eq('id', itemId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Get adjustment info
      const { data: adjustment } = await supabase
        .from('stock_adjustments')
        .select('adjustment_code, hotel_id, tenant_id')
        .eq('id', adjustmentId)
        .single()
      
      if (!adjustment) throw new Error('Không tìm thấy phiếu kiểm kê')
      
      let linkedDocId: string | null = null
      let linkedDocType: string | null = null
      
      // Apply resolution based on type
      if (resolutionType === 'adjust_stock' || 
          resolutionType === 'supplementary_in' || 
          resolutionType === 'supplementary_out') {
        // Update stock and create transaction
        const { error: stockError } = await supabase
          .from('items')
          .update({ quantity_in_stock: itemData.actual_quantity })
          .eq('id', itemData.item_id)
        
        if (stockError) throw stockError
        
        const quantity = itemData.actual_quantity - itemData.system_quantity
        const transactionType = quantity > 0 ? 'in' : 'out'
        
        // Create transaction
        const { data: transaction, error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            hotel_id: adjustment.hotel_id,
            tenant_id: adjustment.tenant_id,
            item_id: itemData.item_id,
            transaction_type: transactionType,
            transaction_category: resolutionType === 'adjust_stock' ? 'adjustment' : 'other',
            quantity: Math.abs(quantity),
            quantity_before: itemData.system_quantity,
            quantity_after: itemData.actual_quantity,
            transaction_code: `ADJ-${adjustment.adjustment_code}`,
            related_type: 'stock_adjustment',
            related_id: adjustmentId,
            created_by: user.id,
            unit_price: itemData.unit_price,
            total_value: Math.abs(quantity) * (itemData.unit_price || 0),
            notes: resolutionNotes,
          })
          .select('id')
          .single()
        
        if (transactionError) throw transactionError
        
        linkedDocId = transaction?.id || null
        linkedDocType = 'inventory_transaction'
      }
      
      // Update item with resolution
      const { error: updateError } = await supabase
        .from('stock_adjustment_items')
        .update({
          status: 'approved',
          investigation_status: 'resolved',
          investigation_completed_at: new Date().toISOString(),
          resolution_type: resolutionType,
          resolution_notes: resolutionNotes || null,
          responsible_person_id: responsiblePersonId || null,
          linked_document_type: linkedDocType,
          linked_document_id: linkedDocId,
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', itemId)
      
      if (updateError) throw updateError
      
      // Check if all items are now approved
      await checkAndUpdateAdjustmentStatus(adjustmentId, user.id)
      
      return { itemId, adjustmentId, resolutionType }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      const resolutionLabels: Record<ResolutionType, string> = {
        adjust_stock: 'Đã điều chỉnh tồn kho',
        compensation: 'Đã tạo yêu cầu bồi thường',
        supplementary_in: 'Đã ghi nhận nhập bổ sung',
        supplementary_out: 'Đã ghi nhận xuất bổ sung',
      }
      
      toast({ 
        title: 'Đã xử lý xong',
        description: resolutionLabels[result.resolutionType],
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' })
    },
  })
}

/**
 * Hook to approve all items at once (bulk approval)
 */
export function useBulkApproveItems() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ 
      adjustmentId, 
      approvalNotes 
    }: { 
      adjustmentId: string
      approvalNotes?: string 
    }) => {
      if (!user?.id) throw new Error('No user')
      
      // Get all pending items
      const { data: pendingItems, error: fetchError } = await supabase
        .from('stock_adjustment_items')
        .select('id, item_id, system_quantity, actual_quantity, unit_price, status, investigation_status')
        .eq('adjustment_id', adjustmentId)
        .eq('status', 'pending')
      
      if (fetchError) throw fetchError
      
      // Check if there are items under investigation
      const { data: investigatingItems } = await supabase
        .from('stock_adjustment_items')
        .select('id')
        .eq('adjustment_id', adjustmentId)
        .eq('status', 'investigating')
      
      if (investigatingItems && investigatingItems.length > 0) {
        throw new Error(`Còn ${investigatingItems.length} items đang điều tra. Vui lòng xử lý xong trước khi duyệt tất cả.`)
      }
      
      // Get adjustment info
      const { data: adjustment } = await supabase
        .from('stock_adjustments')
        .select('adjustment_code, hotel_id, tenant_id')
        .eq('id', adjustmentId)
        .single()
      
      if (!adjustment) throw new Error('Không tìm thấy phiếu kiểm kê')
      
      // Approve all pending items and update stock
      for (const item of pendingItems || []) {
        // Update item status
        await supabase
          .from('stock_adjustment_items')
          .update({
            status: 'approved',
            approved_by: user.id,
            approved_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        
        // Update stock if there's difference
        if (item.system_quantity !== item.actual_quantity) {
          await supabase
            .from('items')
            .update({ quantity_in_stock: item.actual_quantity })
            .eq('id', item.item_id)
          
          // Create transaction
          const quantity = item.actual_quantity - item.system_quantity
          await supabase
            .from('inventory_transactions')
            .insert({
              hotel_id: adjustment.hotel_id,
              tenant_id: adjustment.tenant_id,
              item_id: item.item_id,
              transaction_type: quantity > 0 ? 'in' : 'out',
              transaction_category: 'adjustment',
              quantity: Math.abs(quantity),
              quantity_before: item.system_quantity,
              quantity_after: item.actual_quantity,
              transaction_code: `ADJ-${adjustment.adjustment_code}`,
              related_type: 'stock_adjustment',
              related_id: adjustmentId,
              created_by: user.id,
              unit_price: item.unit_price,
              total_value: Math.abs(quantity) * (item.unit_price || 0),
            })
        }
      }
      
      // Update adjustment status
      await supabase
        .from('stock_adjustments')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approval_notes: approvalNotes || null,
        })
        .eq('id', adjustmentId)
      
      return { adjustmentId, approvedCount: pendingItems?.length || 0 }
    },
    onSuccess: async (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stock-adjustment', variables.adjustmentId] })
      queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      
      // Trigger workflow
      try {
        const { data: adj } = await supabase
          .from('stock_adjustments')
          .select('adjustment_code, hotel_id, tenant_id, created_by')
          .eq('id', variables.adjustmentId)
          .single()
        
        if (adj) {
          triggerWorkflow({
            triggerType: WorkflowTriggerTypes.ADJUSTMENT_APPROVED,
            eventData: {
              adjustment_id: variables.adjustmentId,
              adjustment_code: adj.adjustment_code,
              approved_by: user?.id,
              approved_by_name: user?.full_name,
              total_approved: result.approvedCount,
            },
            tenantId: adj.tenant_id,
            hotelId: adj.hotel_id,
          })
        }
      } catch (e) {
        console.error('[Adjustment] Failed to trigger workflow:', e)
      }
      
      toast({ 
        title: 'Đã duyệt tất cả',
        description: `Đã duyệt ${result.approvedCount} items`,
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Lỗi', description: error.message, variant: 'destructive' })
    },
  })
}

// Helper function to check and update adjustment status
async function checkAndUpdateAdjustmentStatus(adjustmentId: string, userId: string) {
  const { data: pendingItems } = await supabase
    .from('stock_adjustment_items')
    .select('id')
    .eq('adjustment_id', adjustmentId)
    .in('status', ['pending', 'investigating'])
  
  if (!pendingItems || pendingItems.length === 0) {
    await supabase
      .from('stock_adjustments')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', adjustmentId)
  }
}
