import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useToast } from '@/hooks/use-toast'
import { useImageUpload } from './useImageUpload'
import { sendNotificationByRole } from '@/lib/notifications'
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
                // URL format: https://xxx.supabase.co/storage/v1/object/public/item-images/tenantId/filename.jpg
                const urlParts = photoUrl.split('/item-images/')
                if (urlParts.length > 1) {
                  const path = urlParts[1]
                  await deleteImage(path)
                }
              } catch (error) {
                console.error('Error deleting old photo:', error)
                // Don't throw error, continue deleting other photos
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
      
      if (error) throw error
      
      // Calculate quantity changes based on items marked during check
      const quantityChanges: Record<string, number> = {}
      
      // 1. Đồ gửi giặt → Giảm quantity (lấy ra khỏi phòng)
      for (const item of data.items_sent_to_laundry || []) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
      }
      
      // 2. Đồ mất → Giảm quantity
      for (const item of data.items_lost || []) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
      }
      
      // 3. Đồ tiêu hao → Giảm quantity
      for (const item of data.items_consumed || []) {
        quantityChanges[item.item_id] = (quantityChanges[item.item_id] || 0) - item.quantity
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
      
      // Update last_checked timestamp for all other items
      await supabase
        .from('room_items')
        .update({
          last_checked_at: new Date().toISOString(),
          last_checked_by: user?.id,
        })
        .eq('room_id', roomId)
        .not('item_id', 'in', `(${[...Object.keys(quantityChanges), ...Object.keys(itemQuantities || {})].join(',')})`)
      
      // Get room info for notifications
      const { data: roomInfo } = await supabase
        .from('rooms')
        .select('room_number')
        .eq('id', roomId)
        .single()
      
      const roomNumber = roomInfo?.room_number || 'N/A'
      
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
        
        // Send checkout report to hotel manager using in_app_notifications
        await sendNotificationByRole({
          tenantId: tenantId!,
          role: 'hotel_manager',
          title: `Báo cáo checkout phòng ${roomNumber}`,
          body: summaryMessage,
          type: hasIssues ? 'warning' : 'success',
          actionUrl: `/rooms/${roomId}?tab=history`,
          metadata: {
            room_id: roomId,
            check_id: check.id,
            check_type: 'checkout',
          },
        })
        
        // Auto-change room status to cleaning after checkout
        await supabase
          .from('rooms')
          .update({ status: 'cleaning' })
          .eq('id', roomId)
      }
      
      // Create notification for managers about check completion (non-checkout)
      const totalIssues = (data.items_missing?.length || 0) + (data.items_damaged?.length || 0)
      if (totalIssues > 0 && data.check_type !== 'checkout') {
        await sendNotificationByRole({
          tenantId: tenantId!,
          role: 'hotel_manager',
          title: `Kiểm tra phòng ${roomNumber} phát hiện vấn đề`,
          body: `Phòng có ${totalIssues} vấn đề cần xử lý`,
          type: 'warning',
          actionUrl: `/rooms/${roomId}`,
          metadata: {
            room_id: roomId,
            check_type: data.check_type,
          },
        })
      }
      
      return check
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['room-checks', variables.roomId] })
      queryClient.invalidateQueries({ queryKey: ['room', variables.roomId] })
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      
      toast({
        title: 'Thành công',
        description: 'Đã lưu kiểm tra phòng và cập nhật số lượng thực tế',
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
