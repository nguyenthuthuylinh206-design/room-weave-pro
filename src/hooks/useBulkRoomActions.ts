import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { triggerRoomCheckoutNotification } from '@/hooks/useNotificationTriggers'
import { useUser } from '@/hooks/useUser'
import type { RoomStatus } from '@/types/rooms.types'

export function useBulkApplyStandards() {
  const queryClient = useQueryClient()
  const { user } = useUser()

  return useMutation({
    mutationFn: async ({
      roomIds,
      onProgress,
    }: {
      roomIds: string[]
      onProgress?: (current: number, total: number) => void
    }) => {
      let totalAdded = 0
      let totalUpdated = 0
      const failedRooms: string[] = []
      const skippedRooms: string[] = []

      for (let i = 0; i < roomIds.length; i++) {
        const roomId = roomIds[i]
        onProgress?.(i + 1, roomIds.length)
        try {
          const { data, error } = await supabase.rpc('apply_room_standards', {
            p_room_id: roomId,
            p_user_id: user?.id,
          })
          if (error) throw error
          const result = data as { added?: number; updated?: number; skipped?: boolean } | null
          if (result?.skipped) {
            skippedRooms.push(roomId)
          } else {
            totalAdded += result?.added ?? 0
            totalUpdated += result?.updated ?? 0
          }
        } catch (err) {
          console.error('Apply standards failed for room', roomId, err)
          failedRooms.push(roomId)
        }
      }

      return {
        total: roomIds.length,
        success: roomIds.length - failedRooms.length,
        totalAdded,
        totalUpdated,
        failedRooms,
        skippedRooms,
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room-stats'] })

      const parts: string[] = []
      parts.push(`${result.success}/${result.total} phòng`)
      if (result.totalAdded > 0) parts.push(`${result.totalAdded} thêm mới`)
      if (result.totalUpdated > 0) parts.push(`${result.totalUpdated} cập nhật`)
      if (result.failedRooms.length > 0) parts.push(`${result.failedRooms.length} thất bại`)

      toast({
        title: result.failedRooms.length > 0 ? 'Hoàn tất với cảnh báo' : 'Áp dụng tiêu chuẩn thành công',
        description: parts.join(' · '),
        variant: result.failedRooms.length > 0 ? 'destructive' : 'default',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Lỗi áp dụng tiêu chuẩn',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

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
      queryClient.invalidateQueries({ queryKey: ['floor-plan'] })
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
  const { tenantId } = useUser()

  return useMutation({
    mutationFn: async ({ roomIds, status }: { roomIds: string[]; status: RoomStatus }) => {
      // If changing to check_out, fetch room data first for notifications
      let roomsData: Array<{ id: string; room_number: string; hotel_id: string }> = []
      if (status === 'check_out') {
        const { data } = await supabase
          .from('rooms')
          .select('id, room_number, hotel_id')
          .in('id', roomIds)
        roomsData = data || []
      }

      const { error } = await supabase
        .from('rooms')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', roomIds)

      if (error) throw error
      return { count: roomIds.length, status, roomsData }
    },
    onSuccess: ({ count, status, roomsData }) => {
      // Send notification for each room changed to check_out
      if (status === 'check_out' && tenantId) {
        roomsData.forEach(room => {
          if (room.hotel_id) {
            triggerRoomCheckoutNotification({
              tenantId,
              hotelId: room.hotel_id,
              roomId: room.id,
              roomNumber: room.room_number,
            }).catch(err => console.error('Bulk checkout notification error:', err))
          }
        })
      }

      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room-stats'] })
      queryClient.invalidateQueries({ queryKey: ['floor-plan'] })
      const statusLabels: Partial<Record<RoomStatus, string>> = {
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
