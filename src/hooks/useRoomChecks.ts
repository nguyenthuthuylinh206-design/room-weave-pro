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
import type { RoomCheckFormData } from '@/types/rooms.types'

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

export function useCreateRoomCheck() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { user, tenantId } = useUser()
  const { deleteImage } = useImageUpload()
  
  return useMutation({
    mutationFn: async ({ 
      roomId, 
      data,
      itemQuantities
    }: { 
      roomId: string
      data: RoomCheckFormData
      itemQuantities?: Record<string, number>
    }) => {
      // Get room info first for transaction records
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('hotel_id, room_number')
        .eq('id', roomId)
        .single()
      
      if (roomError) throw roomError
      
      const hotelId = room.hotel_id
      const roomNumber = room.room_number

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
        items_consumed: data.items_consumed || [],
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
        // Handle duplicate check (double-submit or re-check too soon)
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

      // Delete old photos from previous checks (keep only the most recent)
      const { data: recentChecks } = await supabase
        .from('room_checks')
        .select('id, photos')
        .eq('room_id', roomId)
        .order('checked_at', { ascending: false })
        .limit(10)

      if (recentChecks && recentChecks.length > 1) {
        // Skip the first (most recent), delete photos from others
        const oldChecks = recentChecks.slice(1)

        for (const oldCheck of oldChecks) {
          if (oldCheck.photos && Array.isArray(oldCheck.photos) && oldCheck.photos.length > 0) {
            // Delete each photo from storage
            for (const photoUrl of oldCheck.photos) {
              try {
                // Extract path from URL
                const urlParts = photoUrl.split('/item-images/')
                if (urlParts.length > 1) {
                  const path = urlParts[1]
                  await deleteImage(path)
                }
              } catch (error) {
                console.error('Error deleting old photo:', error)
              }
            }

            // Update record, clear photos array
            await supabase
              .from('room_checks')
              .update({ photos: [] })
              .eq('id', oldCheck.id)
          }
        }
      }

      // Calculate quantity changes based on items marked during check
      const quantityChanges: Record<string, number> = {}
      
      // 1. Đồ gửi giặt → Giảm quantity trong room_items (lấy ra khỏi phòng)
      //    Và cập nhật quantity_in_laundry trong bảng items
      const laundryItems = data.items_sent_to_laundry || []
      for (const item of laundryItems) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
      }
      
      // Update quantity_in_laundry in items table for laundry items
      // With stock validation to prevent negative values
      if (laundryItems.length > 0) {
        for (const item of laundryItems) {
          const { data: currentItem } = await supabase
            .from('items')
            .select('quantity_in_laundry, quantity_in_stock, name')
            .eq('id', item.item_id)
            .single()
          
          if (currentItem) {
            const currentStock = currentItem.quantity_in_stock || 0
            // Don't deduct more than available stock
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
      
      // 2. Đồ mất → Giảm quantity, tạo inventory transaction
      const lostItems = data.items_lost || []
      for (const item of lostItems) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
        
        // Create inventory transaction for lost items
        if (tenantId && user?.id) {
          const { data: currentItem } = await supabase
            .from('items')
            .select('quantity_in_stock, quantity_lost, unit_price')
            .eq('id', item.item_id)
            .single()
          
          if (currentItem) {
            const quantityBefore = currentItem.quantity_in_stock || 0
            const quantityAfter = Math.max(0, quantityBefore - item.quantity)
            
            // Create outbound transaction for lost items
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
              related_id: check.id,
              notes: `Mất trong khi kiểm tra phòng ${roomNumber}`,
              created_by: user.id,
            })
            
            // Update quantity_lost in items table
            await supabase.from('items').update({
              quantity_lost: (currentItem.quantity_lost || 0) + item.quantity,
              quantity_in_stock: quantityAfter,
            }).eq('id', item.item_id)
          }
        }
      }
      
      // 3. Đồ tiêu hao → Giảm quantity, tạo inventory transaction
      const consumedItems = data.items_consumed || []
      for (const item of consumedItems) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
        
        // Create inventory transaction for consumed items
        if (tenantId && user?.id) {
          const { data: currentItem } = await supabase
            .from('items')
            .select('quantity_in_stock, unit_price')
            .eq('id', item.item_id)
            .single()
          
          if (currentItem) {
            const quantityBefore = currentItem.quantity_in_stock || 0
            const quantityAfter = Math.max(0, quantityBefore - item.quantity)
            
            // Create outbound transaction for consumed items
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
              related_id: check.id,
              notes: `Khách sử dụng trong phòng ${roomNumber}`,
              created_by: user.id,
            })
            
            // Update items table
            await supabase.from('items').update({
              quantity_in_stock: quantityAfter,
            }).eq('id', item.item_id)
          }
        }
      }
      
      // 4. Đồ thay thế → Tăng quantity (bù lại vào phòng)
      for (const item of data.items_replaced || []) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) + item.quantity
      }
      
      // Update room_items with calculated quantities
      if (Object.keys(quantityChanges).length > 0) {
        // Get current quantities for affected items
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
        
        // Calculate and upsert new quantities
        const updates = Object.entries(quantityChanges).map(([itemId, change]) => {
          // Use current quantity if exists, otherwise use standard quantity
          const currentQty = currentQtyMap[itemId] ?? standardQtyMap[itemId] ?? 0
          const newQty = Math.max(0, currentQty + change)
          
          return {
            room_id: roomId,
            item_id: itemId,
            quantity: newQty,
            last_checked_at: new Date().toISOString(),
            last_checked_by: user?.id,
          }
        })
        
        if (updates.length > 0) {
          const { error: updateError } = await supabase
            .from('room_items')
            .upsert(updates, { onConflict: 'room_id,item_id' })
          
          if (updateError) throw updateError
        }
      }
      
      // Also apply manual item quantities if provided (from quick mode or direct input)
      if (itemQuantities) {
        const manualUpdates = Object.entries(itemQuantities)
          .filter(([itemId]) => !quantityChanges[itemId]) // Skip items already updated above
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
      
      // Update last_checked timestamp for all room items (including ones updated above)
      await supabase
        .from('room_items')
        .update({
          last_checked_at: new Date().toISOString(),
          last_checked_by: user?.id,
        })
        .eq('room_id', roomId)

      
      // Handle checkout check type - send summary report to manager
      if (data.check_type === 'checkout') {
        const consumedCount = data.items_consumed?.length || 0
        const lostCount = data.items_lost?.length || 0
        const damagedCount = data.items_damaged?.length || 0
        const hasIssues = lostCount > 0 || damagedCount > 0
        
        // Build summary message
        const summaryParts = []
        if (consumedCount > 0) summaryParts.push(`Khách dùng ${consumedCount} items`)
        if (lostCount > 0) summaryParts.push(`Mất ${lostCount} items`)
        if (damagedCount > 0) summaryParts.push(`Hỏng ${damagedCount} items`)
        
        const summaryMessage = summaryParts.length > 0 
          ? summaryParts.join(', ')
          : 'Không có vấn đề'
        
        // Send checkout report to hotel managers using new notification system
        const checkoutRecipients = await getNotificationRecipients({
          tenantId: tenantId!,
          hotelId,
          targetRoles: ['manager'],
          excludeUserId: user?.id,
        })
        
        // If user is the only staff, include them in recipients
        const recipientIds = checkoutRecipients.length > 0 
          ? checkoutRecipients.map(r => r.id)
          : user?.id ? [user.id] : []
        
        if (recipientIds.length > 0) {
          const notificationTitle = `Báo cáo checkout phòng ${roomNumber}`
          const notificationType = hasIssues ? 'warning' : 'success'
          const actionUrl = `/rooms/${roomId}?tab=history`
          
          await Promise.allSettled([
            createMultipleNotifications({
              recipientIds,
              tenantId: tenantId!,
              title: notificationTitle,
              body: summaryMessage,
              type: notificationType,
              actionUrl,
              metadata: {
                room_id: roomId,
                check_id: check.id,
                check_type: 'checkout',
              },
            }),
            sendMultiplePushNotifications({
              recipientIds,
              tenantId: tenantId!,
              title: notificationTitle,
              body: summaryMessage,
              actionUrl,
              notificationType,
            }),
            sendTelegramNotification({
              tenantId: tenantId!,
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
        
        // Auto-change room status to cleaning after checkout
        await supabase
          .from('rooms')
          .update({ status: 'cleaning' })
          .eq('id', roomId)
      }
      
      // Create notification for managers about check completion (non-checkout)
      const totalIssues = (data.items_missing?.length || 0) + (data.items_damaged?.length || 0)
      if (totalIssues > 0 && data.check_type !== 'checkout') {
        const issueRecipients = await getNotificationRecipients({
          tenantId: tenantId!,
          hotelId,
          targetRoles: ['manager'],
          excludeUserId: user?.id,
        })
        
        const issueRecipientIds = issueRecipients.length > 0 
          ? issueRecipients.map(r => r.id)
          : user?.id ? [user.id] : []
        
        if (issueRecipientIds.length > 0) {
          const issueTitle = `Kiểm tra phòng ${roomNumber} phát hiện vấn đề`
          const issueBody = `Phòng có ${totalIssues} vấn đề cần xử lý`
          
          await Promise.allSettled([
            createMultipleNotifications({
              recipientIds: issueRecipientIds,
              tenantId: tenantId!,
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
              tenantId: tenantId!,
              title: issueTitle,
              body: issueBody,
              actionUrl: `/rooms/${roomId}`,
              notificationType: 'warning',
            }),
          ])
        }
      }
      
      // Trigger workflow for room check completed
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
