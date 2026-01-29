import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useToast } from '@/hooks/use-toast'
import { useImageUpload } from './useImageUpload'
import { triggerWorkflow } from '@/lib/triggerWorkflow'
import { 
  createMultipleNotifications, 
  sendMultiplePushNotifications,
  sendTelegramNotification
} from '@/hooks/useNotificationTriggers'
import { getNotificationRecipients } from '@/utils/notificationRecipients'
import type { RoomCheckFormData, LaundryItem, LostItem, ConsumedItem, DamagedItem } from '@/types/rooms.types'

export function useRoomChecks(roomId: string | undefined) {
  return useQuery({
    queryKey: ['room-checks', roomId],
    queryFn: async () => {
      if (!roomId) throw new Error('No room ID')
      
      const { data, error } = await supabase
        .from('room_checks')
        .select(`
          *,
          checked_by:users!room_checks_checked_by_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('room_id', roomId)
        .order('checked_at', { ascending: false })
        .limit(20)
      
      if (error) throw error
      return data
    },
    enabled: !!roomId,
  })
}

// Helper to generate transaction code for inventory tracking
function generateTransactionCode(prefix: string): string {
  const now = new Date()
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  const random = Math.floor(1000 + Math.random() * 9000)
  return `${prefix}-${timestamp}-${random}`
}

// ===== DAILY CHECK LOGIC =====
// Chỉ update room_items (laundry, change), không tạo inventory transaction
async function processDailyCheck(params: {
  roomId: string
  data: RoomCheckFormData
  userId?: string
  tenantId?: string
  hotelId: string
  roomNumber: string
}) {
  const { roomId, data, userId } = params
  const quantityChanges: Record<string, number> = {}
  
  // 1. Đồ gửi giặt (change action) → Giảm quantity trong room_items
  // Và cập nhật quantity_in_laundry trong items table
  const laundryItems = data.items_sent_to_laundry || []
  for (const item of laundryItems) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
  }
  
  // Update quantity_in_laundry in items table
  if (laundryItems.length > 0) {
    await updateLaundryQuantities(laundryItems)
  }
  
  // 2. Đồ thay thế (từ action "change") → Tăng quantity (bù lại vào phòng)
  for (const item of data.items_replaced || []) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) + item.quantity
  }
  
  // Apply quantity changes to room_items
  await applyRoomItemChanges(roomId, quantityChanges, userId)
  
  return { quantityChanges }
}

// ===== CHECK-IN VALIDATION =====
// Validate phòng sẵn sàng, block nếu có thiết bị hỏng
interface CheckinValidationResult {
  isReady: boolean
  blockedReason?: string
  damagedEquipment: DamagedItem[]
  missingItems: any[]
}

async function validateCheckinReadiness(params: {
  roomId: string
  data: RoomCheckFormData
  hotelId: string
  roomNumber: string
}): Promise<CheckinValidationResult> {
  const { data } = params
  
  const damagedEquipment = (data.items_damaged || []).filter(item => 
    // Equipment/Furniture có damage_type = 'replacement_needed' thì block
    item.damage_type === 'replacement_needed'
  )
  
  const missingItems = data.items_missing || []
  
  // Block check-in nếu có thiết bị hỏng cần thay thế
  if (damagedEquipment.length > 0) {
    return {
      isReady: false,
      blockedReason: `Có ${damagedEquipment.length} thiết bị hỏng cần thay thế trước khi nhận khách`,
      damagedEquipment,
      missingItems,
    }
  }
  
  // Warning nếu có đồ thiếu nhưng không block
  return {
    isReady: true,
    damagedEquipment: [],
    missingItems,
  }
}

async function processCheckinCheck(params: {
  roomId: string
  data: RoomCheckFormData
  userId?: string
  tenantId?: string
  hotelId: string
  roomNumber: string
}) {
  const { roomId, data, userId, hotelId, roomNumber } = params
  const quantityChanges: Record<string, number> = {}
  
  // Validate trước
  const validation = await validateCheckinReadiness({ 
    roomId, 
    data, 
    hotelId, 
    roomNumber 
  })
  
  // 1. Đồ thêm (add action) → Tăng quantity
  for (const item of data.items_replaced || []) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) + item.quantity
  }
  
  // Apply changes
  await applyRoomItemChanges(roomId, quantityChanges, userId)
  
  // Auto-change room status: check_in/vacant → occupied (phòng đã có khách)
  // Chỉ thực hiện nếu validation pass
  if (validation.isReady) {
    await supabase
      .from('rooms')
      .update({ status: 'occupied' })
      .eq('id', roomId)
      .in('status', ['check_in', 'vacant'])
  }
  
  return { quantityChanges, validation }
}

// ===== CHECKOUT FULL TRACKING =====
// Tạo inventory transaction cho lost/consumed, complete inspection
// Handle cleaning request and notifications
async function processCheckoutCheck(params: {
  roomId: string
  data: RoomCheckFormData
  userId?: string
  tenantId?: string
  hotelId: string
  roomNumber: string
  checkId: string
  inspectionId?: string
  userName?: string
}) {
  const { roomId, data, userId, tenantId, hotelId, roomNumber, checkId, inspectionId, userName } = params
  const quantityChanges: Record<string, number> = {}
  
  // 1. Đồ gửi giặt → Giảm quantity trong room_items
  const laundryItems = data.items_sent_to_laundry || []
  for (const item of laundryItems) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
  }
  
  if (laundryItems.length > 0) {
    await updateLaundryQuantities(laundryItems)
  }
  
  // 2. Đồ mất → Giảm quantity, TẠO INVENTORY TRANSACTION
  const lostItems = data.items_lost || []
  for (const item of lostItems) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
    
    if (tenantId && userId) {
      await createLostItemTransaction({
        item,
        tenantId,
        hotelId,
        roomNumber,
        checkId,
        userId,
      })
    }
  }
  
  // 3. Đồ tiêu hao → Giảm quantity, TẠO INVENTORY TRANSACTION
  const consumedItems = data.items_consumed || []
  for (const item of consumedItems) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
    
    if (tenantId && userId) {
      await createConsumedItemTransaction({
        item,
        tenantId,
        hotelId,
        roomNumber,
        checkId,
        userId,
      })
    }
  }
  
  // 4. Đồ thay thế → Tăng quantity
  for (const item of data.items_replaced || []) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) + item.quantity
  }
  
  // Apply changes
  await applyRoomItemChanges(roomId, quantityChanges, userId)
  
  // 5. Complete checkout inspection
  await completeCheckoutInspection(roomId, checkId, inspectionId)
  
  // 6. Handle room status based on cleaning request
  const needsCleaning = data.needs_cleaning ?? false
  const roomCondition = data.room_condition ?? 'clean'
  
  if (needsCleaning || roomCondition !== 'clean') {
    // Phòng cần dọn → Chuyển sang cleaning
    await supabase
      .from('rooms')
      .update({ status: 'cleaning' })
      .eq('id', roomId)
    
    // Gửi thông báo cho Manager
    if (tenantId && userId) {
      await sendCleaningRequestNotifications({
        roomId,
        roomNumber,
        tenantId,
        hotelId,
        userId,
        userName: userName || 'Nhân viên',
        priority: data.cleaning_priority || 'medium',
        notes: data.cleaning_notes,
        roomCondition,
      })
      
      // ✨ AUTO-CREATE CLEANING TASK
      // Tạo housekeeping_task loại 'cleaning' để nhân viên thấy trong task list
      const priorityMap: Record<string, string> = {
        'very_dirty': 'high',
        'dirty': 'medium', 
        'clean': 'low'
      }
      const taskPriority = data.cleaning_priority || priorityMap[roomCondition] || 'medium'
      
      const { error: taskError } = await supabase
        .from('housekeeping_tasks')
        .insert({
          tenant_id: tenantId,
          hotel_id: hotelId,
          room_id: roomId,
          task_type: 'cleaning',
          title: `Dọn dẹp phòng ${roomNumber}`,
          description: data.cleaning_notes || `Yêu cầu dọn phòng sau checkout. Tình trạng: ${roomCondition === 'very_dirty' ? 'Rất bẩn' : roomCondition === 'dirty' ? 'Bẩn' : 'Bình thường'}`,
          priority: taskPriority,
          requested_by: userId,
          room_check_id: checkId,
          status: 'pending'
        })
      
      if (taskError) {
        console.error('[useRoomChecks] Error creating cleaning task:', taskError)
      } else {
        console.log('[useRoomChecks] Auto-created cleaning task for room', roomNumber)
      }
    }
  } else {
    // Phòng sạch → Chuyển thẳng sang vacant
    await supabase
      .from('rooms')
      .update({ status: 'vacant' })
      .eq('id', roomId)
  }
  
  // 7. Send supplement alert if items were consumed/lost
  const hasConsumedOrLost = (data.items_consumed?.length || 0) > 0 || (data.items_lost?.length || 0) > 0
  if (hasConsumedOrLost && tenantId && userId) {
    await sendSupplementAlert({
      roomId,
      roomNumber,
      tenantId,
      hotelId,
      userId,
      userName: userName || 'Nhân viên',
      consumedItems: data.items_consumed || [],
      lostItems: data.items_lost || [],
    })
  }
  
  return { quantityChanges, needsCleaning }
}

// ===== MAINTENANCE CHECK =====
// Validate sau sửa chữa, chỉ update room_items, chuyển trạng thái maintenance → vacant
async function processMaintenanceCheck(params: {
  roomId: string
  data: RoomCheckFormData
  userId?: string
}) {
  const { roomId, data, userId } = params
  const quantityChanges: Record<string, number> = {}
  
  // Đồ thêm sau bảo trì
  for (const item of data.items_replaced || []) {
    quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) + item.quantity
  }
  
  await applyRoomItemChanges(roomId, quantityChanges, userId)
  
  // Auto-change room status: maintenance → vacant (phòng đã sửa xong)
  await supabase
    .from('rooms')
    .update({ status: 'vacant' })
    .eq('id', roomId)
    .eq('status', 'maintenance')
  
  return { quantityChanges }
}

// ===== HELPER FUNCTIONS =====

async function updateLaundryQuantities(laundryItems: LaundryItem[]) {
  for (const item of laundryItems) {
    const { data: currentItem } = await supabase
      .from('items')
      .select('quantity_in_laundry, quantity_in_stock, name')
      .eq('id', item.item_id)
      .single()
    
    if (currentItem) {
      const currentStock = currentItem.quantity_in_stock || 0
      const actualDeduct = Math.min(item.quantity, currentStock)
      
      if (actualDeduct < item.quantity) {
        console.warn(`Stock mismatch for ${currentItem.name}: requested ${item.quantity} for laundry, only ${actualDeduct} in stock`)
      }
      
      const { error: updateError } = await supabase
        .from('items')
        .update({
          quantity_in_laundry: (currentItem.quantity_in_laundry || 0) + item.quantity,
          quantity_in_stock: Math.max(0, currentStock - actualDeduct),
        })
        .eq('id', item.item_id)
      
      if (updateError) {
        console.error('Error updating quantity_in_laundry:', updateError)
      }
    }
  }
}

async function createLostItemTransaction(params: {
  item: LostItem
  tenantId: string
  hotelId: string
  roomNumber: string
  checkId: string
  userId: string
}) {
  const { item, tenantId, hotelId, roomNumber, checkId, userId } = params
  
  const { data: currentItem } = await supabase
    .from('items')
    .select('quantity_in_stock, quantity_lost, unit_price')
    .eq('id', item.item_id)
    .single()
  
  if (currentItem) {
    const quantityBefore = currentItem.quantity_in_stock || 0
    const quantityAfter = Math.max(0, quantityBefore - item.quantity)
    
    await supabase.from('inventory_transactions').insert({
      tenant_id: tenantId,
      hotel_id: hotelId,
      transaction_code: generateTransactionCode('LOST'),
      transaction_type: 'out',
      transaction_category: 'lost',
      item_id: item.item_id,
      quantity: item.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_price: currentItem.unit_price || 0,
      total_value: (currentItem.unit_price || 0) * item.quantity,
      from_location: `Phòng ${roomNumber}`,
      to_location: 'Mất/Thất lạc',
      related_type: 'room_check',
      related_id: checkId,
      notes: `Mất trong khi kiểm tra checkout phòng ${roomNumber}`,
      created_by: userId,
    })
    
    await supabase.from('items').update({
      quantity_lost: (currentItem.quantity_lost || 0) + item.quantity,
      quantity_in_stock: quantityAfter,
    }).eq('id', item.item_id)
  }
}

async function createConsumedItemTransaction(params: {
  item: ConsumedItem
  tenantId: string
  hotelId: string
  roomNumber: string
  checkId: string
  userId: string
}) {
  const { item, tenantId, hotelId, roomNumber, checkId, userId } = params
  
  const { data: currentItem } = await supabase
    .from('items')
    .select('quantity_in_stock, unit_price')
    .eq('id', item.item_id)
    .single()
  
  if (currentItem) {
    const quantityBefore = currentItem.quantity_in_stock || 0
    const quantityAfter = Math.max(0, quantityBefore - item.quantity)
    
    await supabase.from('inventory_transactions').insert({
      tenant_id: tenantId,
      hotel_id: hotelId,
      transaction_code: generateTransactionCode('CONS'),
      transaction_type: 'out',
      transaction_category: 'consumed',
      item_id: item.item_id,
      quantity: item.quantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_price: currentItem.unit_price || 0,
      total_value: (currentItem.unit_price || 0) * item.quantity,
      from_location: `Phòng ${roomNumber}`,
      to_location: 'Khách sử dụng',
      related_type: 'room_check',
      related_id: checkId,
      notes: `Khách sử dụng trong phòng ${roomNumber}`,
      created_by: userId,
    })
    
    await supabase.from('items').update({
      quantity_in_stock: quantityAfter,
    }).eq('id', item.item_id)
  }
}

async function applyRoomItemChanges(
  roomId: string, 
  quantityChanges: Record<string, number>,
  userId?: string
) {
  if (Object.keys(quantityChanges).length === 0) return
  
  // Get current quantities
  const { data: currentItems } = await supabase
    .from('room_items')
    .select('item_id, quantity, standard_quantity')
    .eq('room_id', roomId)
    .in('item_id', Object.keys(quantityChanges))
  
  const currentQtyMap: Record<string, number> = {}
  const standardQtyMap: Record<string, number> = {}
  for (const item of currentItems || []) {
    currentQtyMap[item.item_id] = item.quantity || 0
    standardQtyMap[item.item_id] = item.standard_quantity || 0
  }
  
  const updates = Object.entries(quantityChanges).map(([itemId, change]) => {
    const currentQty = currentQtyMap[itemId] ?? standardQtyMap[itemId] ?? 0
    const newQty = Math.max(0, currentQty + change)
    
    return {
      room_id: roomId,
      item_id: itemId,
      quantity: newQty,
      last_checked_at: new Date().toISOString(),
      last_checked_by: userId,
    }
  })
  
  if (updates.length > 0) {
    const { error: updateError } = await supabase
      .from('room_items')
      .upsert(updates, { onConflict: 'room_id,item_id' })
    
    if (updateError) throw updateError
  }
}

async function completeCheckoutInspection(
  roomId: string, 
  checkId: string, 
  inspectionId?: string
) {
  let effectiveInspectionId = inspectionId
  
  // Fallback: query for pending/in_progress inspection
  if (!effectiveInspectionId) {
    console.log('[useRoomChecks] Checkout without inspectionId, searching for pending inspection')
    
    const { data: foundInspection } = await supabase
      .from('checkout_inspection_requests')
      .select('id')
      .eq('room_id', roomId)
      .in('status', ['pending', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (foundInspection) {
      console.log('[useRoomChecks] Found pending inspection:', foundInspection.id)
      effectiveInspectionId = foundInspection.id
    }
  }
  
  if (effectiveInspectionId) {
    console.log('[useRoomChecks] Completing checkout inspection:', effectiveInspectionId)
    const { error: inspectionError } = await supabase
      .from('checkout_inspection_requests')
      .update({
        status: 'completed',
        room_check_id: checkId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', effectiveInspectionId)
    
    if (inspectionError) {
      console.error('[useRoomChecks] Error completing checkout inspection:', inspectionError)
    }
  }
}

// ===== MAIN MUTATION =====
export function useCreateRoomCheck() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, tenantId } = useUser()
  const { deleteImage } = useImageUpload()
  
  return useMutation({
    mutationFn: async ({ 
      roomId, 
      data,
      itemQuantities,
      inspectionId
    }: { 
      roomId: string
      data: RoomCheckFormData
      itemQuantities?: Record<string, number>
      inspectionId?: string
    }) => {
      // Get room info first
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('hotel_id, room_number')
        .eq('id', roomId)
        .single()
      
      if (roomError) throw roomError
      
      const hotelId = room.hotel_id
      const roomNumber = room.room_number

      // Enrich items_consumed with unit_price before saving (checkout only)
      let consumedItemsWithPrice = data.items_consumed || []
      if (data.check_type === 'checkout' && consumedItemsWithPrice.length > 0) {
        consumedItemsWithPrice = await Promise.all(
          consumedItemsWithPrice.map(async (item) => {
            const { data: itemData } = await supabase
              .from('items')
              .select('unit_price')
              .eq('id', item.item_id)
              .maybeSingle()
            
            return {
              ...item,
              unit_price: itemData?.unit_price || 0,
            }
          })
        )
      }

      // Create room check record
      const insertData = {
        room_id: roomId,
        checked_by: user?.id,
        check_type: data.check_type,
        cleanliness_score: data.cleanliness_score,
        items_complete: data.items_complete,
        items_missing: data.items_missing || [],
        items_damaged: data.items_damaged || [],
        items_sent_to_laundry: data.items_sent_to_laundry || [],
        items_consumed: consumedItemsWithPrice,
        items_lost: data.items_lost || [],
        items_replaced: data.items_replaced || [],
        notes: data.notes,
        photos: data.photos || [],
      }
      
      const { data: check, error } = await supabase
        .from('room_checks')
        .insert(insertData as any)
        .select()
        .single()

      if (error) {
        // Handle duplicate check
        const maybeCode = (error as any)?.code
        const maybeMsg = (error as any)?.message as string | undefined
        if (maybeCode === '23505' && maybeMsg?.includes('Duplicate check detected')) {
          const { data: existingCheck, error: fetchError } = await supabase
            .from('room_checks')
            .select('*')
            .eq('room_id', roomId)
            .eq('check_type', data.check_type)
            .order('checked_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (fetchError) throw fetchError
          if (existingCheck) return { ...(existingCheck as any), __duplicate: true }
        }

        throw error
      }

      // Delete old photos from previous checks
      const { data: recentChecks } = await supabase
        .from('room_checks')
        .select('id, photos')
        .eq('room_id', roomId)
        .order('checked_at', { ascending: false })
        .limit(10)

      if (recentChecks && recentChecks.length > 1) {
        const oldChecks = recentChecks.slice(1)

        for (const oldCheck of oldChecks) {
          if (oldCheck.photos && Array.isArray(oldCheck.photos) && oldCheck.photos.length > 0) {
            for (const photoUrl of oldCheck.photos) {
              try {
                const urlParts = photoUrl.split('/item-images/')
                if (urlParts.length > 1) {
                  const path = urlParts[1]
                  await deleteImage(path)
                }
              } catch (err) {
                console.error('Error deleting old photo:', err)
              }
            }

            await supabase
              .from('room_checks')
              .update({ photos: [] })
              .eq('id', oldCheck.id)
          }
        }
      }

      // ===== PROCESS BY CHECK TYPE =====
      const baseParams = {
        roomId,
        data,
        userId: user?.id,
        tenantId,
        hotelId,
        roomNumber,
      }

      switch (data.check_type) {
        case 'daily':
          // Daily: Chỉ update room_items (laundry/change)
          await processDailyCheck(baseParams)
          break

        case 'checkin':
          // Check-in: Validate + update room_items
          const { validation } = await processCheckinCheck(baseParams)
          if (!validation.isReady) {
            // Store warning in check record
            console.warn('[useRoomChecks] Check-in blocked:', validation.blockedReason)
          }
          break

        case 'checkout':
          // Checkout: Full inventory tracking + complete inspection + cleaning request
          await processCheckoutCheck({
            ...baseParams,
            checkId: check.id,
            inspectionId,
            userName: user?.full_name || user?.email || 'Nhân viên',
          })
          break

        case 'maintenance':
          // Maintenance: Validate + update room_items
          await processMaintenanceCheck(baseParams)
          break
      }

      // Apply manual item quantities if provided
      if (itemQuantities) {
        const manualUpdates = Object.entries(itemQuantities)
          .map(([itemId, quantity]) => ({
            room_id: roomId,
            item_id: itemId,
            quantity: quantity,
            last_checked_at: new Date().toISOString(),
            last_checked_by: user?.id,
          }))
        
        if (manualUpdates.length > 0) {
          const { error: updateError } = await supabase
            .from('room_items')
            .upsert(manualUpdates, { onConflict: 'room_id,item_id' })
          
          if (updateError) throw updateError
        }
      }
      
      // Update last_checked timestamp for all room items
      await supabase
        .from('room_items')
        .update({
          last_checked_at: new Date().toISOString(),
          last_checked_by: user?.id,
        })
        .eq('room_id', roomId)

      // ===== NOTIFICATIONS (checkout only) =====
      if (data.check_type === 'checkout') {
        await sendCheckoutNotifications({
          roomId,
          roomNumber,
          checkId: check.id,
          data,
          tenantId: tenantId!,
          hotelId,
          userId: user?.id,
        })
      }
      
      // Notifications for issues (non-checkout)
      const totalIssues = (data.items_missing?.length || 0) + (data.items_damaged?.length || 0)
      if (totalIssues > 0 && data.check_type !== 'checkout') {
        await sendIssueNotifications({
          roomId,
          roomNumber,
          data,
          tenantId: tenantId!,
          hotelId,
          userId: user?.id,
        })
      }
      
      // Trigger workflow
      if (tenantId) {
        const hasIssues = 
          (data.items_missing?.length || 0) > 0 ||
          (data.items_damaged?.length || 0) > 0 ||
          (data.items_lost?.length || 0) > 0
        
        await triggerWorkflow({
          triggerType: 'room_check_completed',
          eventData: {
            room_id: roomId,
            room_number: roomNumber,
            check_type: data.check_type,
            check_id: check.id,
            has_issues: hasIssues,
            missing_count: data.items_missing?.length || 0,
            damaged_count: data.items_damaged?.length || 0,
            lost_count: data.items_lost?.length || 0,
            laundry_count: data.items_sent_to_laundry?.length || 0,
            consumed_count: data.items_consumed?.length || 0,
            cleanliness_score: data.cleanliness_score,
            staff_name: user?.full_name || 'Nhân viên',
            issue_summary: hasIssues 
              ? `Thiếu ${data.items_missing?.length || 0}, Hỏng ${data.items_damaged?.length || 0}, Mất ${data.items_lost?.length || 0}`
              : 'Không có vấn đề',
          },
          tenantId,
          hotelId,
        }).catch(err => console.error('Workflow trigger failed:', err))
      }
      
      return check
    },
    onSuccess: (check: any, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room-checks', variables.roomId] })
      queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['checkout-inspection'] })
      queryClient.invalidateQueries({ queryKey: ['pending-inspection'] })
      queryClient.invalidateQueries({ queryKey: ['room-has-pending-inspection'] })

      const isDuplicate = !!check?.__duplicate

      toast({
        title: isDuplicate ? 'Đã có kiểm tra gần đây' : 'Thành công',
        description: isDuplicate
          ? 'Phòng đã được kiểm tra trong 5 phút gần đây. Hệ thống dùng lại kết quả mới nhất.'
          : 'Đã lưu kiểm tra phòng và cập nhật số lượng thực tế',
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

// ===== NOTIFICATION HELPERS =====

async function sendCheckoutNotifications(params: {
  roomId: string
  roomNumber: string
  checkId: string
  data: RoomCheckFormData
  tenantId: string
  hotelId: string
  userId?: string
}) {
  const { roomId, roomNumber, checkId, data, tenantId, hotelId, userId } = params
  
  const consumedCount = data.items_consumed?.length || 0
  const lostCount = data.items_lost?.length || 0
  const damagedCount = data.items_damaged?.length || 0
  const hasIssues = lostCount > 0 || damagedCount > 0
  
  const summaryParts = []
  if (consumedCount > 0) summaryParts.push(`Khách dùng ${consumedCount} items`)
  if (lostCount > 0) summaryParts.push(`Mất ${lostCount} items`)
  if (damagedCount > 0) summaryParts.push(`Hỏng ${damagedCount} items`)
  
  const summaryMessage = summaryParts.length > 0 
    ? summaryParts.join(', ')
    : 'Không có vấn đề'
  
  const checkoutRecipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager'],
    excludeUserId: userId,
  })
  
  const recipientIds = checkoutRecipients.length > 0 
    ? checkoutRecipients.map(r => r.id)
    : userId ? [userId] : []
  
  if (recipientIds.length > 0) {
    const notificationTitle = `Báo cáo checkout phòng ${roomNumber}`
    const notificationType = hasIssues ? 'warning' : 'success'
    const actionUrl = `/rooms/${roomId}?tab=history`
    
    await Promise.allSettled([
      createMultipleNotifications({
        recipientIds,
        tenantId,
        title: notificationTitle,
        body: summaryMessage,
        type: notificationType,
        actionUrl,
        metadata: {
          room_id: roomId,
          check_id: checkId,
          check_type: 'checkout',
        },
      }),
      sendMultiplePushNotifications({
        recipientIds,
        tenantId,
        title: notificationTitle,
        body: summaryMessage,
        actionUrl,
        notificationType,
      }),
      sendTelegramNotification({
        tenantId,
        hotelId,
        notificationTypeFilter: 'checkout',
        sendToManagementGroups: true,
        title: notificationTitle,
        message: summaryMessage,
        notificationType: 'checkout',
        actionUrl,
      }),
    ])
  }
}

async function sendIssueNotifications(params: {
  roomId: string
  roomNumber: string
  data: RoomCheckFormData
  tenantId: string
  hotelId: string
  userId?: string
}) {
  const { roomId, roomNumber, data, tenantId, hotelId, userId } = params
  
  const totalIssues = (data.items_missing?.length || 0) + (data.items_damaged?.length || 0)
  
  const issueRecipients = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager'],
    excludeUserId: userId,
  })
  
  const issueRecipientIds = issueRecipients.length > 0 
    ? issueRecipients.map(r => r.id)
    : userId ? [userId] : []
  
  if (issueRecipientIds.length > 0) {
    const issueTitle = `Kiểm tra phòng ${roomNumber} phát hiện vấn đề`
    const issueBody = `Phòng có ${totalIssues} vấn đề cần xử lý`
    
    await Promise.allSettled([
      createMultipleNotifications({
        recipientIds: issueRecipientIds,
        tenantId,
        title: issueTitle,
        body: issueBody,
        type: 'warning',
        actionUrl: `/rooms/${roomId}`,
        metadata: {
          room_id: roomId,
          check_type: data.check_type,
        },
      }),
      sendMultiplePushNotifications({
        recipientIds: issueRecipientIds,
        tenantId,
        title: issueTitle,
        body: issueBody,
        actionUrl: `/rooms/${roomId}`,
        notificationType: 'warning',
      }),
    ])
  }
}

// ===== CLEANING REQUEST NOTIFICATIONS =====

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
}

const CONDITION_LABELS: Record<string, string> = {
  clean: 'Sạch',
  dirty: 'Bẩn nhẹ',
  very_dirty: 'Rất bẩn',
}

async function sendCleaningRequestNotifications(params: {
  roomId: string
  roomNumber: string
  tenantId: string
  hotelId: string
  userId: string
  userName: string
  priority: string
  notes?: string
  roomCondition: string
}) {
  const { roomId, roomNumber, tenantId, hotelId, userId, userName, priority, notes, roomCondition } = params
  
  const priorityLabel = PRIORITY_LABELS[priority] || priority
  const conditionLabel = CONDITION_LABELS[roomCondition] || roomCondition
  
  // Get managers to notify
  const managers = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager'],
    excludeUserId: userId,
  })
  
  const recipientIds = managers.length > 0 
    ? managers.map(m => m.id)
    : userId ? [userId] : []
  
  if (recipientIds.length === 0) return
  
  const notificationTitle = `🧹 Yêu cầu dọn phòng ${roomNumber}`
  const notificationBody = notes 
    ? `${userName} báo cần dọn dẹp. Tình trạng: ${conditionLabel}. Ưu tiên: ${priorityLabel}. Ghi chú: ${notes}`
    : `${userName} báo cần dọn dẹp. Tình trạng: ${conditionLabel}. Ưu tiên: ${priorityLabel}`
  const actionUrl = `/rooms/${roomId}?action=assign-cleaning`
  
  await Promise.allSettled([
    // In-app notifications
    createMultipleNotifications({
      recipientIds,
      tenantId,
      title: notificationTitle,
      body: notificationBody,
      type: priority === 'urgent' || priority === 'high' ? 'warning' : 'info',
      actionUrl,
      metadata: {
        room_id: roomId,
        cleaning_priority: priority,
        room_condition: roomCondition,
        requested_by: userId,
      },
    }),
    // Push notifications
    sendMultiplePushNotifications({
      recipientIds,
      tenantId,
      title: notificationTitle,
      body: notificationBody,
      actionUrl,
      notificationType: priority === 'urgent' || priority === 'high' ? 'warning' : 'info',
    }),
    // Telegram notification - use 'system' type for housekeeping
    sendTelegramNotification({
      tenantId,
      hotelId,
      notificationTypeFilter: 'system',
      sendToManagementGroups: true,
      title: notificationTitle,
      message: notificationBody,
      notificationType: 'system',
      actionUrl,
    }),
  ])
  
  console.log('[useRoomChecks] Cleaning request notifications sent for room', roomNumber)
}

// ===== SUPPLEMENT ALERT (After checkout with consumed/lost items) =====

async function sendSupplementAlert(params: {
  roomId: string
  roomNumber: string
  tenantId: string
  hotelId: string
  userId: string
  userName: string
  consumedItems: ConsumedItem[]
  lostItems: LostItem[]
}) {
  const { roomId, roomNumber, tenantId, hotelId, userId, userName, consumedItems, lostItems } = params
  
  const totalConsumed = consumedItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalLost = lostItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalItems = totalConsumed + totalLost
  
  if (totalItems === 0) return
  
  // Get warehouse managers (or fallback to general managers)
  const managers = await getNotificationRecipients({
    tenantId,
    hotelId,
    targetRoles: ['manager'],
    excludeUserId: userId,
  })
  
  const recipientIds = managers.length > 0 
    ? managers.map(m => m.id)
    : userId ? [userId] : []
  
  if (recipientIds.length === 0) return
  
  // Build summary of items
  const itemSummary: string[] = []
  for (const item of consumedItems) {
    itemSummary.push(`${item.item_name}: ${item.quantity} (tiêu hao)`)
  }
  for (const item of lostItems) {
    itemSummary.push(`${item.item_name}: ${item.quantity} (mất)`)
  }
  
  const notificationTitle = `📦 Phòng ${roomNumber} cần bổ sung đồ dùng`
  const notificationBody = `${userName} báo: ${itemSummary.slice(0, 3).join(', ')}${itemSummary.length > 3 ? ` +${itemSummary.length - 3} khác` : ''}`
  const actionUrl = `/distribution?room=${roomId}&action=supplement`
  
  await Promise.allSettled([
    // In-app notifications
    createMultipleNotifications({
      recipientIds,
      tenantId,
      title: notificationTitle,
      body: notificationBody,
      type: 'info',
      actionUrl,
      metadata: {
        room_id: roomId,
        consumed_count: consumedItems.length,
        lost_count: lostItems.length,
        total_quantity: totalItems,
        items: itemSummary,
      },
    }),
    // Push notifications
    sendMultiplePushNotifications({
      recipientIds,
      tenantId,
      title: notificationTitle,
      body: notificationBody,
      actionUrl,
      notificationType: 'info',
    }),
    // Telegram notification
    sendTelegramNotification({
      tenantId,
      hotelId,
      notificationTypeFilter: 'inventory',
      sendToManagementGroups: true,
      title: notificationTitle,
      message: notificationBody,
      notificationType: 'inventory',
      actionUrl,
    }),
  ])
  
  console.log('[useRoomChecks] Supplement alert sent for room', roomNumber, '- Total items:', totalItems)
}
