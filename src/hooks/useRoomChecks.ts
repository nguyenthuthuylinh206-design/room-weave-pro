import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useToast } from '@/hooks/use-toast'
import { useImageUpload } from './useImageUpload'
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
      
      // Update room_items with actual quantities from inspection
      if (itemQuantities) {
        const updates = Object.entries(itemQuantities).map(([itemId, quantity]) => ({
          room_id: roomId,
          item_id: itemId,
          quantity: quantity,
          last_checked_at: new Date().toISOString(),
          last_checked_by: user?.id,
        }))
        
        if (updates.length > 0) {
          const { error: updateError } = await supabase
            .from('room_items')
            .upsert(updates, { onConflict: 'room_id,item_id' })
          
          if (updateError) throw updateError
        }
      } else {
        // Fallback: just update last_checked timestamp
        await supabase
          .from('room_items')
          .update({
            last_checked_at: new Date().toISOString(),
            last_checked_by: user?.id,
          })
          .eq('room_id', roomId)
      }
      
      // Create notification for managers about check completion
      const totalIssues = (data.items_missing?.length || 0) + (data.items_damaged?.length || 0)
      if (totalIssues > 0) {
        await supabase
          .from('notifications')
          .insert({
            tenant_id: tenantId,
            role: 'hotel_manager',
            type: 'warning',
            category: 'room',
            title: 'Kiểm tra phòng phát hiện vấn đề',
            message: `Phòng có ${totalIssues} vấn đề cần xử lý`,
            related_type: 'room',
            related_id: roomId,
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
