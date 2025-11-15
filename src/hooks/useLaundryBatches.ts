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
  const { tenantId } = useUser()
  const { selectedHotel } = useHotelContext()
  
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
      if (!tenantId || !selectedHotel?.id) {
        throw new Error('Thiếu thông tin tenant hoặc hotel')
      }

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
        tenant_id: tenantId,
        hotel_id: selectedHotel.id,
        vendor_id: step1.vendor_id,
        delivery_date: step1.delivery_date.toISOString(),
        expected_return_date: step1.expected_return_date.toISOString(),
        delivery_staff_id: step1.delivery_staff_id,
        receiver_name: step1.receiver_name,
        total_items: totalItems,
        total_weight_kg: totalWeight,
        estimated_cost: estimatedCost,
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
  
  const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    delivered: ['ready'],
    washing: ['ready'],
    ready: ['received'],
    received: ['stocked']
  }
  
  const statusLabels: Record<string, string> = {
    delivered: 'Đã giao',
    washing: 'Đang giặt',
    ready: 'Sẵn sàng nhận',
    received: 'Đã nhận về',
    stocked: 'Đã nhập kho'
  }
  
  return useMutation({
    mutationFn: async ({
      batchId,
      status,
    }: {
      batchId: string
      status: BatchStatus
    }) => {
      // Lấy status hiện tại
      const { data: batch, error: fetchError } = await supabase
        .from('laundry_batches')
        .select('status')
        .eq('id', batchId)
        .single()
      
      if (fetchError) throw fetchError
      
      // Validate transition
      const currentStatus = batch.status
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || []
      
      if (!allowedNext.includes(status)) {
        throw new Error(
          `Không thể chuyển từ "${statusLabels[currentStatus] || currentStatus}" sang "${statusLabels[status] || status}". ` +
          `Trạng thái hợp lệ: ${allowedNext.map(s => statusLabels[s] || s).join(', ')}`
        )
      }
      
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

export function useUpdateBatchCost() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  
  return useMutation({
    mutationFn: async ({
      batchId,
      total_weight_kg,
      estimated_cost,
      actual_cost
    }: {
      batchId: string
      total_weight_kg: number
      estimated_cost: number
      actual_cost?: number
    }) => {
      if (!tenant?.id) throw new Error('Tenant không tồn tại')

      const { error } = await supabase
        .from('laundry_batches')
        .update({ 
          total_weight_kg,
          estimated_cost,
          ...(actual_cost !== undefined && { actual_cost })
        })
        .eq('id', batchId)
        .eq('tenant_id', tenant.id)
      
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laundry-batch', variables.batchId] })
      queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật chi phí',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    }
  })
}

export function useStockInFromLaundry() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const { user } = useUser()
  const { selectedHotel } = useHotelContext()
  
  return useMutation({
    mutationFn: async ({
      batchId,
      batchCode,
      items
    }: {
      batchId: string
      batchCode: string
      items: Array<{
        item_id: string
        quantity_returned: number
        quantity_lost?: number
        quantity_damaged?: number
      }>
    }) => {
      if (!tenant?.id || !user?.id || !selectedHotel?.id) {
        throw new Error('Missing required data')
      }
      
      // 1. LẤY THÔNG TIN BATCH
      const { data: batchData, error: batchError } = await supabase
        .from('laundry_batches')
        .select('items_lost, items_damaged, status')
        .eq('id', batchId)
        .single()
      
      if (batchError) throw batchError
      
      // 2. VALIDATE STATUS (phải là 'received')
      if (batchData.status !== 'received') {
        throw new Error('Batch phải ở trạng thái "Đã nhận về" mới có thể nhập kho')
      }
      
      // 3. LẤY GIÁ TỪ DATABASE
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('id, unit_price, name')
        .in('id', items.map(i => i.item_id))
      
      if (itemsError) throw itemsError
      
      // 4. FORMAT ITEMS VỚI GIÁ ĐÚNG - chỉ items OK
      const okItems = items
        .filter(item => item.quantity_returned > 0)
        .map(item => {
          const itemData = itemsData?.find(i => i.id === item.item_id)
          return {
            item_id: item.item_id,
            quantity: item.quantity_returned,
            unit_price: itemData?.unit_price || 0,
            notes: null
          }
        })
      
      // 5. TẠO INBOUND TRANSACTION (items OK)
      if (okItems.length > 0) {
        const { error: inboundError } = await supabase.rpc('create_inbound_transaction', {
          p_tenant_id: tenant.id,
          p_hotel_id: selectedHotel.id,
          p_transaction_category: 'laundry_return',
          p_from_location: 'Đơn vị giặt',
          p_to_location: selectedHotel.name,
          p_created_by: user.id,
          p_items: okItems as any,
          p_related_type: 'laundry_batch',
          p_related_id: batchId,
          p_documents: null,
          p_photos: null,
          p_notes: `Nhập kho từ lô giặt ${batchCode}`,
        })
        
        if (inboundError) throw inboundError
      }
      
      // 6. XỬ LÝ ITEMS MẤT (nếu có)
      const lostItems = items
        .filter(item => item.quantity_lost && item.quantity_lost > 0)
        .map(item => {
          const itemData = itemsData?.find(i => i.id === item.item_id)
          return {
            item_id: item.item_id,
            quantity: item.quantity_lost!,
            unit_price: itemData?.unit_price || 0,
            notes: `Mất trong quá trình giặt - Lô ${batchCode}`
          }
        })
      
      if (lostItems.length > 0) {
        const { error: lostError } = await supabase.rpc('create_outbound_transaction', {
          p_tenant_id: tenant.id,
          p_hotel_id: selectedHotel.id,
          p_transaction_category: 'laundry',
          p_from_location: selectedHotel.name,
          p_to_location: 'Mất mát',
          p_created_by: user.id,
          p_items: lostItems as any,
          p_transaction_type: 'lost',
          p_related_type: 'laundry_batch',
          p_related_id: batchId,
          p_notes: `Items mất từ lô giặt ${batchCode}`,
          p_recipient_name: null,
          p_recipient_signature: null,
          p_documents: null,
          p_photos: null
        })
        
        if (lostError) throw lostError
      }
      
      // 7. XỬ LÝ ITEMS HƯ HỎNG (nếu có)
      const damagedItems = items
        .filter(item => item.quantity_damaged && item.quantity_damaged > 0)
        .map(item => {
          const itemData = itemsData?.find(i => i.id === item.item_id)
          return {
            item_id: item.item_id,
            quantity: item.quantity_damaged!,
            unit_price: itemData?.unit_price || 0,
            notes: `Hư hỏng trong quá trình giặt - Lô ${batchCode}`
          }
        })
      
      if (damagedItems.length > 0) {
        const { error: damagedError } = await supabase.rpc('create_outbound_transaction', {
          p_tenant_id: tenant.id,
          p_hotel_id: selectedHotel.id,
          p_transaction_category: 'laundry',
          p_from_location: selectedHotel.name,
          p_to_location: 'Hư hỏng',
          p_created_by: user.id,
          p_items: damagedItems as any,
          p_transaction_type: 'damaged',
          p_related_type: 'laundry_batch',
          p_related_id: batchId,
          p_notes: `Items hư hỏng từ lô giặt ${batchCode}`,
          p_recipient_name: null,
          p_recipient_signature: null,
          p_documents: null,
          p_photos: null
        })
        
        if (damagedError) throw damagedError
      }
      
      // 8. CẬP NHẬT STATUS BATCH
      const { error: updateError } = await supabase
        .from('laundry_batches')
        .update({ status: 'stocked' })
        .eq('id', batchId)
        .eq('tenant_id', tenant.id)
      
      if (updateError) throw updateError
      
      // Tạo notification
      await supabase.from('notifications').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        category: 'inventory',
        type: 'info',
        title: 'Đã nhập kho từ giặt là',
        message: `Lô ${batchCode} đã được nhập vào kho ${selectedHotel.name}`,
        action_url: `/laundry/batches/${batchId}`
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['laundry-batch', variables.batchId] })
      queryClient.invalidateQueries({ queryKey: ['laundry-batches'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      toast({
        title: 'Thành công',
        description: 'Đã nhập kho thành công! Tất cả items đã được cập nhật vào kho',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi nhập kho',
        description: error.message,
        variant: 'destructive',
      })
    }
  })
}
