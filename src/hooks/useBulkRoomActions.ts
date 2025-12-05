import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import type { RoomStatus } from '@/types/rooms.types'

export function useBulkDeleteRooms() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (roomIds: string[]) => {
      // Check if any room has items or checks
      const { data: roomItems } = await supabase
        .from('room_items')
        .select('room_id')
        .in('room_id', roomIds)

      const { data: roomChecks } = await supabase
        .from('room_checks')
        .select('room_id')
        .in('room_id', roomIds)

      const roomsWithItems = new Set(roomItems?.map(ri => ri.room_id) || [])
      const roomsWithChecks = new Set(roomChecks?.map(rc => rc.room_id) || [])
      
      const blockedRooms = roomIds.filter(
        id => roomsWithItems.has(id) || roomsWithChecks.has(id)
      )

      if (blockedRooms.length > 0) {
        throw new Error(`${blockedRooms.length} phòng có dữ liệu liên quan và không thể xóa`)
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .in('id', roomIds)

      if (error) throw error
      return roomIds.length
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room-stats'] })
      toast({
        title: 'Xóa thành công',
        description: `Đã xóa ${count} phòng`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi xóa phòng',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useBulkUpdateRoomStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ roomIds, status }: { roomIds: string[]; status: RoomStatus }) => {
      const { error } = await supabase
        .from('rooms')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', roomIds)

      if (error) throw error
      return { count: roomIds.length, status }
    },
    onSuccess: ({ count, status }) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room-stats'] })
      const statusLabels: Record<RoomStatus, string> = {
        vacant: 'Trống',
        occupied: 'Có khách',
        cleaning: 'Đang dọn',
        maintenance: 'Bảo trì',
        out_of_order: 'Không sử dụng',
        check_in: 'Check-in',
        check_out: 'Check-out',
      }
      toast({
        title: 'Cập nhật thành công',
        description: `Đã cập nhật ${count} phòng sang "${statusLabels[status]}"`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi cập nhật',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
