import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useUser } from './useUser'
import { toast } from 'sonner'
import type { 
  TransactionWithDetails, 
  InventoryFilters,
  CreateInboundData,
  CreateOutboundData
} from '@/types/inventory.types'

export function useInventoryTransactions(
  filters: InventoryFilters = {},
  page = 1,
  pageSize = 25
) {
  const { tenant } = useTenant()
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['inventory-transactions', tenant?.id, user?.hotel_id, filters, page, pageSize],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('Missing tenant')
      
      const { data, error } = await supabase
        .rpc('get_inventory_transactions_filtered', {
          p_tenant_id: tenant.id,
          p_hotel_id: user?.hotel_id || null,
          p_transaction_type: filters.transaction_type || null,
          p_category_id: filters.category_id || null,
          p_created_by: filters.created_by || null,
          p_date_from: filters.date_from?.toISOString().split('T')[0] || null,
          p_date_to: filters.date_to?.toISOString().split('T')[0] || null,
          p_search: filters.search || null,
          p_limit: pageSize,
          p_offset: (page - 1) * pageSize,
        })
      
      if (error) throw error
      
      const transactions = data as TransactionWithDetails[]
      const total = transactions[0]?.total_count || 0
      
      return {
        transactions,
        total,
        pages: Math.ceil(total / pageSize),
      }
    },
    enabled: !!tenant?.id,
  })
}

export function useCreateInboundTransaction() {
  const { tenant } = useTenant()
  const { user } = useUser()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateInboundData) => {
      if (!tenant?.id || !user?.hotel_id || !user?.id) {
        throw new Error('Missing required information')
      }
      
      const { data: result, error } = await supabase
        .rpc('create_inbound_transaction', {
          p_tenant_id: tenant.id,
          p_hotel_id: user.hotel_id,
          p_transaction_category: data.transaction_category,
          p_from_location: data.from_location,
          p_to_location: data.to_location,
          p_created_by: user.id,
          p_items: data.items as any,
          p_related_type: data.related_type || null,
          p_related_id: data.related_id || null,
          p_documents: data.documents || null,
          p_photos: data.photos || null,
          p_notes: data.notes || null,
        })
      
      if (error) throw error
      
      const typedResult = result as unknown as { success: boolean; error?: string; transaction_id?: string; transaction_code?: string }
      if (!typedResult.success) throw new Error(typedResult.error)
      
      return typedResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      toast.success('Đã tạo phiếu nhập kho thành công')
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`)
    },
  })
}

export function useCreateOutboundTransaction() {
  const { tenant } = useTenant()
  const { user } = useUser()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateOutboundData) => {
      if (!tenant?.id || !user?.hotel_id || !user?.id) {
        throw new Error('Missing required information')
      }
      
      const { data: result, error } = await supabase
        .rpc('create_outbound_transaction', {
          p_tenant_id: tenant.id,
          p_hotel_id: user.hotel_id,
          p_transaction_category: data.transaction_category,
          p_from_location: data.from_location,
          p_to_location: data.to_location,
          p_created_by: user.id,
          p_items: data.items as any,
          p_related_type: data.related_type || null,
          p_related_id: data.related_id || null,
          p_recipient_name: data.recipient_name || null,
          p_recipient_signature: data.recipient_signature || null,
          p_documents: data.documents || null,
          p_photos: data.photos || null,
          p_notes: data.notes || null,
        })
      
      if (error) throw error
      
      const typedResult = result as unknown as { 
        success: boolean
        error?: string
        transaction_id?: string
        transaction_code?: string
        low_stock_items?: string[]
      }
      
      if (!typedResult.success) throw new Error(typedResult.error)
      
      if (typedResult.low_stock_items && typedResult.low_stock_items.length > 0) {
        toast.warning(`Cảnh báo: ${typedResult.low_stock_items.length} mặt hàng sắp hết`)
      }
      
      return typedResult
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock-items'] })
      toast.success('Đã tạo phiếu xuất kho thành công')
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`)
    },
  })
}
