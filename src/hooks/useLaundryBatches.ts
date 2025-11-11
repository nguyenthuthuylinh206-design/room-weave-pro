import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { useTenant } from './useTenant'
import { toast } from './use-toast'
import type { 
  LaundryBatchWithVendor, 
  LaundryBatchFilters,
  CreateBatchStep1Data,
  CreateBatchStep2Data,
  CreateBatchStep3Data,
  ReceiveBatchData,
  BatchStatus,
} from '@/types/laundry.types'

export function useLaundryBatches(
  filters: LaundryBatchFilters = {},
  page: number = 1,
  pageSize: number = 25
) {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  
  return useQuery({
    queryKey: ['laundry-batches', tenantId, selectedHotel?.id, isAllHotelsMode, filters, page, pageSize],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const hotelIdToFilter = isAllHotelsMode ? null : (selectedHotel?.id || null)
      
      const { data, error } = await supabase.rpc('get_laundry_batches_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: hotelIdToFilter,
        p_vendor_id: filters.vendorId || null,
        p_status: filters.status || null,
        p_from_date: filters.fromDate ? filters.fromDate.toISOString().split('T')[0] : null,
        p_to_date: filters.toDate ? filters.toDate.toISOString().split('T')[0] : null,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      })
      
      if (error) throw error
      
      return {
        batches: data as LaundryBatchWithVendor[],
        total: data?.[0]?.total_count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((data?.[0]?.total_count || 0) / pageSize),
      }
    },
    enabled: !!tenantId,
    placeholderData: (previousData) => previousData,
  })
}

export function useLaundryBatch(batchId: string | undefined) {
  return useQuery({
    queryKey: ['laundry-batch', batchId],
    queryFn: async () => {
      if (!batchId) throw new Error('No batch ID')
      
      const { data, error } = await supabase
        .rpc('get_laundry_batch_detail', { p_batch_id: batchId })
      
      if (error) throw error
      return data
    },
    enabled: !!batchId,
  })
}

export function useCreateLaundryBatch() {
  const queryClient = useQueryClient()
  const { tenantId, hotelId } = useUser()
  
  return useMutation({
    mutationFn: async ({
      step1,
      step2,
      step3,
    }: {
      step1: CreateBatchStep1Data
      step2: CreateBatchStep2Data
      step3: CreateBatchStep3Data
    }) => {
      // Calculate totals
      const totalItems = step2.items.reduce((sum, item) => sum + item.quantity, 0)
      const totalWeight = step2.items.reduce((sum, item) => sum + item.weight_kg, 0)
      
      // Get vendor pricing
      const { data: vendor } = await supabase
        .from('laundry_vendors')
        .select('contract_info')
        .eq('id', step1.vendor_id)
        .single()
      
      const contractInfo = vendor?.contract_info as any
      const pricePerKg = contractInfo?.price_per_kg || 0
      const estimatedCost = totalWeight * pricePerKg
      
      // 1. Create batch
      const batchData: any = {
        tenant_id: tenantId!,
        hotel_id: hotelId!,
        vendor_id: step1.vendor_id,
        delivery_date: step1.delivery_date.toISOString(),
        expected_return_date: step1.expected_return_date.toISOString(),
        delivery_staff_id: step1.delivery_staff_id,
        receiver_name: step1.receiver_name,
        total_items: totalItems,
        total_weight_kg: totalWeight,
        estimated_cost: estimatedCost,
        delivery_photos: step3.delivery_photos,
        notes: step1.notes,
        status: 'delivered',
      }
      
      const { data: batch, error: batchError } = await supabase
        .from('laundry_batches')
        .insert(batchData)
        .select()
        .single()
      
      if (batchError) throw batchError
      
      // 2. Create batch items
      const batchItems = step2.items.map(item => ({
        batch_id: batch.id,
        item_id: item.item_id,
        quantity_delivered: item.quantity,
        weight_kg: item.weight_kg,
        condition_note: item.condition_note,
      }))
      
      const { error: itemsError } = await supabase
        .from('laundry_batch_items')
        .insert(batchItems)
      
      if (itemsError) throw itemsError
      
      // 3. Create notification
      await supabase
        .from('notifications')
        .insert({
          tenant_id: tenantId,
          role: 'department_manager',
          type: 'info',
          category: 'laundry',
          title: 'Lô giặt mới đã tạo',
          message: `Lô ${batch.batch_code} với ${totalItems} items đã được gửi đi giặt`,
          action_url: `/laundry/batches/${batch.id}`,
          related_type: 'laundry_batch',
          related_id: batch.id,
        })
      
      return batch
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
      queryClient.invalidateQueries({ queryKey: ['laundry-dashboard-stats'] })
      toast({
        title: 'Thành công',
        description: 'Đã tạo lô giặt mới',
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

export function useReceiveLaundryBatch() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const { tenant } = useTenant()
  
  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string
      data: ReceiveBatchData
    }) => {
      // 1. Update batch
      const { error: batchError } = await supabase
        .from('laundry_batches')
        .update({
          actual_return_date: data.actual_return_date.toISOString(),
          return_staff_id: user?.id,
          delivery_person_name: data.delivery_person_name,
          actual_cost: data.actual_cost,
          quality_rating: data.quality_rating,
          timeliness_rating: data.timeliness_rating,
          items_lost: data.items.reduce((sum, item) => sum + item.quantity_lost, 0),
          items_damaged: data.items.reduce((sum, item) => sum + item.quantity_damaged, 0),
          compensation_amount: data.compensation_amount,
          return_photos: data.return_photos,
          return_notes: data.return_notes,
          status: 'received',
        })
        .eq('id', batchId)
      
      if (batchError) throw batchError
      
      // 2. Update batch items
      for (const item of data.items) {
        const { error: itemError } = await supabase
          .from('laundry_batch_items')
          .update({
            quantity_returned: item.quantity_returned,
            quantity_lost: item.quantity_lost,
            quantity_damaged: item.quantity_damaged,
            return_condition: item.return_condition,
          })
          .eq('batch_id', batchId)
          .eq('item_id', item.item_id)
        
        if (itemError) throw itemError
      }
      
      // 3. Create notifications if issues
      const totalLost = data.items.reduce((sum, item) => sum + item.quantity_lost, 0)
      const totalDamaged = data.items.reduce((sum, item) => sum + item.quantity_damaged, 0)
      
      if (totalLost > 0 || totalDamaged > 0) {
        await supabase
          .from('notifications')
          .insert({
            tenant_id: tenant?.id,
            role: 'hotel_manager',
            type: 'warning',
            category: 'laundry',
            title: 'Có vấn đề với lô giặt',
            message: `Lô giặt có ${totalLost} items mất và ${totalDamaged} items hỏng`,
            action_url: `/laundry/batches/${batchId}`,
            related_type: 'laundry_batch',
            related_id: batchId,
          })
      }
      
      return { totalLost, totalDamaged }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laundry-batch', variables.batchId] })
      queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
      queryClient.invalidateQueries({ queryKey: ['laundry-dashboard-stats'] })
      
      if (result.totalLost === 0 && result.totalDamaged === 0) {
        toast({
          title: '🎉 Hoàn tất!',
          description: 'Đã nhận đồ giặt thành công, không có vấn đề gì',
        })
      } else {
        toast({
          title: 'Đã nhận đồ giặt',
          description: `Có ${result.totalLost} items mất và ${result.totalDamaged} items hỏng`,
        })
      }
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

export function useUpdateBatchStatus() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({
      batchId,
      status,
    }: {
      batchId: string
      status: BatchStatus
    }) => {
      const { error } = await supabase
        .from('laundry_batches')
        .update({ status })
        .eq('id', batchId)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laundry-batch', variables.batchId] })
      queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
      
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật trạng thái lô giặt',
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
