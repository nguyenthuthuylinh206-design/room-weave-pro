import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useToast } from '@/hooks/use-toast'
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
  
  return useMutation({
    mutationFn: async ({ 
      roomId, 
      data 
    }: { 
      roomId: string
      data: RoomCheckFormData 
    }) => {
      const { data: check, error } = await supabase
        .from('room_checks')
        .insert({
          room_id: roomId,
          checked_by: user?.id,
          ...data,
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Update room_items last_checked_at
      await supabase
        .from('room_items')
        .update({
          last_checked_at: new Date().toISOString(),
          last_checked_by: user?.id,
        })
        .eq('room_id', roomId)
      
      // If items missing or damaged, create notifications
      if (data.items_missing.length > 0 || data.items_damaged.length > 0) {
        await supabase
          .from('notifications')
          .insert({
            tenant_id: tenantId,
            role: 'hotel_manager',
            type: 'warning',
            category: 'room',
            title: 'Phòng cần bổ sung đồ',
            message: `Phòng có thiếu hoặc hư hỏng ${data.items_missing.length + data.items_damaged.length} items`,
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
      
      toast({
        title: 'Thành công',
        description: 'Đã lưu kiểm tra phòng',
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
