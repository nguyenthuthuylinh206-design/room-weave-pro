import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import type { RoomItemWithDetails } from '@/types/rooms.types'

export interface SupplementItem {
  item_id: string
  item_name: string
  item_code: string
  item_thumbnail?: string
  category_name?: string
  standard_quantity: number
  current_quantity: number
  missing_quantity: number
  quantity_in_stock: number
  unit_price: number
  selected_quantity: number
  item_type: string
}

export interface RoomSupplementData {
  room_id: string
  room_number: string
  room_type: string
  hotel_id: string
  missing_items: SupplementItem[]
  consumable_items: SupplementItem[]
  total_missing_value: number
}

/**
 * Hook to calculate items needed for room supplement
 * Returns missing standard items and available consumables for refill
 */
export function useRoomSupplements(roomId: string | undefined) {
  return useQuery({
    queryKey: ['room-supplements', roomId],
    queryFn: async (): Promise<RoomSupplementData | null> => {
      if (!roomId) return null

      // Fetch room info
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, room_number, room_type, hotel_id')
        .eq('id', roomId)
        .single()

      if (roomError) throw roomError

      // Fetch room items with standards comparison
      const { data: roomItems, error: itemsError } = await supabase
        .rpc('get_room_items_with_standards', { p_room_id: roomId })

      if (itemsError) throw itemsError

      // Fetch stock info for missing items
      const missingItems: SupplementItem[] = []
      const consumableItems: SupplementItem[] = []

      for (const item of (roomItems || [])) {
        // Get stock info
        const { data: stockItem } = await supabase
          .from('items')
          .select('quantity_in_stock, unit_price, item_type')
          .eq('id', item.item_id)
          .single()

        const supplementItem: SupplementItem = {
          item_id: item.item_id,
          item_name: item.item_name,
          item_code: item.item_code,
          item_thumbnail: item.item_thumbnail,
          category_name: item.category_name,
          standard_quantity: item.standard_quantity,
          current_quantity: item.current_quantity,
          missing_quantity: item.missing_quantity,
          quantity_in_stock: stockItem?.quantity_in_stock || 0,
          unit_price: stockItem?.unit_price || 0,
          selected_quantity: item.missing_quantity, // Default to missing qty
          item_type: stockItem?.item_type || 'equipment',
        }

        // Add to missing if has standard and missing > 0
        if (item.has_standard && item.missing_quantity > 0) {
          missingItems.push(supplementItem)
        }

        // Add consumables that might need refill (even if not missing)
        if (stockItem?.item_type === 'consumable' && item.has_standard) {
          consumableItems.push({
            ...supplementItem,
            selected_quantity: 0, // Default to 0 for extra consumables
          })
        }
      }

      const totalMissingValue = missingItems.reduce(
        (sum, item) => sum + (item.missing_quantity * item.unit_price),
        0
      )

      return {
        room_id: room.id,
        room_number: room.room_number,
        room_type: room.room_type,
        hotel_id: room.hotel_id,
        missing_items: missingItems,
        consumable_items: consumableItems.filter(
          c => !missingItems.some(m => m.item_id === c.item_id)
        ),
        total_missing_value: totalMissingValue,
      }
    },
    enabled: !!roomId,
  })
}

/**
 * Mutation to create supplement outbound transaction for a room
 */
export function useCreateRoomSupplement() {
  const { tenantId, user } = useUser()
  const { selectedHotel } = useHotelContext()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      room_id: string
      room_number: string
      items: { item_id: string; quantity: number }[]
      notes?: string
    }) => {
      if (!tenantId || !user?.id || !selectedHotel?.id) {
        throw new Error('Missing required context')
      }

      // Generate transaction code
      const timestamp = Date.now().toString(36).toUpperCase()
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase()
      const transactionCode = `XK-${timestamp}-${randomPart}`

      // Create transactions for each item
      const transactions = []
      for (const item of data.items) {
        if (item.quantity <= 0) continue

        // Get current stock
        const { data: stockItem, error: stockError } = await supabase
          .from('items')
          .select('quantity_in_stock, unit_price')
          .eq('id', item.item_id)
          .single()

        if (stockError) throw stockError

        const quantityBefore = stockItem?.quantity_in_stock || 0
        const quantityAfter = Math.max(0, quantityBefore - item.quantity)

        // Create transaction
        const { data: txn, error: txnError } = await supabase
          .from('inventory_transactions')
          .insert({
            tenant_id: tenantId,
            hotel_id: selectedHotel.id,
            transaction_code: `${transactionCode}-${transactions.length + 1}`,
            transaction_type: 'out',
            transaction_category: 'room_assign',
            item_id: item.item_id,
            quantity: item.quantity,
            quantity_before: quantityBefore,
            quantity_after: quantityAfter,
            unit_price: stockItem?.unit_price || 0,
            total_value: (stockItem?.unit_price || 0) * item.quantity,
            from_location: 'Kho',
            to_location: `Phòng ${data.room_number}`,
            related_type: 'room',
            related_id: data.room_id,
            notes: data.notes,
            created_by: user.id,
          })
          .select()
          .single()

        if (txnError) throw txnError
        transactions.push(txn)

        // Update stock
        const { error: updateError } = await supabase
          .from('items')
          .update({ 
            quantity_in_stock: quantityAfter,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.item_id)

        if (updateError) throw updateError

        // Update or create room_item
        const { data: existingRoomItem } = await supabase
          .from('room_items')
          .select('id, quantity')
          .eq('room_id', data.room_id)
          .eq('item_id', item.item_id)
          .single()

        if (existingRoomItem) {
          await supabase
            .from('room_items')
            .update({
              quantity: existingRoomItem.quantity + item.quantity,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingRoomItem.id)
        } else {
          await supabase
            .from('room_items')
            .insert({
              room_id: data.room_id,
              item_id: item.item_id,
              quantity: item.quantity,
              tenant_id: tenantId,
            })
        }
      }

      return {
        transactions,
        total_items: data.items.filter(i => i.quantity > 0).length,
        total_quantity: data.items.reduce((sum, i) => sum + i.quantity, 0),
      }
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room', variables.room_id] })
      queryClient.invalidateQueries({ queryKey: ['room-supplements', variables.room_id] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      
      toast.success(`Đã bổ sung ${result.total_quantity} đồ dùng cho phòng ${variables.room_number}`)
    },
    onError: (error: Error) => {
      toast.error(`Lỗi: ${error.message}`)
    },
  })
}

/**
 * Hook to get rooms that need supplements (missing items)
 */
export function useRoomsNeedingSupplement() {
  const { tenantId } = useUser()
  const { selectedHotel } = useHotelContext()

  return useQuery({
    queryKey: ['rooms-needing-supplement', tenantId, selectedHotel?.id],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase.rpc('get_rooms_filtered', {
        p_tenant_id: tenantId,
        p_hotel_id: selectedHotel?.id || null,
        p_floor: null,
        p_room_type: null,
        p_status: null,
        p_search: null,
        p_missing_items_only: true,
      })

      if (error) throw error
      return data || []
    },
    enabled: !!tenantId,
  })
}
