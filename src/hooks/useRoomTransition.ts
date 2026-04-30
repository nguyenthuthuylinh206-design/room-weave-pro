import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { useUser } from '@/hooks/useUser'
import { ROOM_STATUS_META_V2 } from '@/lib/roomStatus'
import type { RoomStatusV2 } from '@/types/rooms.types'

export interface RoomTransitionInput {
  roomId: string
  toStatus: RoomStatusV2
  reason?: string | null
  /** ISO timestamp khi nào tự gỡ (cho DND, OOS, OOO, sleep_out) */
  until?: string | null
  /** Ghi chú nội bộ thêm */
  notes?: string | null
}

interface TransitionResult {
  success: boolean
  room_id: string
  from_status: string
  to_status: string
  changed_at: string
}

/**
 * Hook chuẩn để chuyển trạng thái phòng theo state machine v2.
 * Thay cho mọi `update({ status: ... })` thủ công.
 *
 * - Gọi RPC `transition_room_status` (atomic, có audit, kiểm role).
 * - Map lỗi tiếng Việt theo bảng RPC localization.
 * - Tự invalidate các query liên quan.
 */
export function useRoomTransition() {
  const queryClient = useQueryClient()
  const { user } = useUser()

  return useMutation<TransitionResult, Error, RoomTransitionInput>({
    mutationFn: async ({ roomId, toStatus, reason, until, notes }) => {
      const { data, error } = await supabase.rpc('transition_room_status', {
        p_room_id: roomId,
        p_to_status: toStatus,
        p_reason: reason ?? null,
        p_until: until ?? null,
        p_notes: notes ?? null,
        p_user_id: user?.id ?? null,
      })

      if (error) {
        // Bảng map lỗi từ RPC sang thông điệp tiếng Việt
        const msg = error.message || ''
        if (msg.includes('invalid_transition')) {
          throw new Error('Không thể chuyển trạng thái này từ trạng thái hiện tại. Vui lòng kiểm tra lại quy trình.')
        }
        if (msg.includes('forbidden_role')) {
          throw new Error('Bạn không có quyền thực hiện chuyển trạng thái này. Vui lòng liên hệ Quản lý.')
        }
        if (msg.includes('room_not_found')) {
          throw new Error('Không tìm thấy phòng. Có thể đã bị xóa hoặc bạn không có quyền.')
        }
        if (msg.includes('reason_required')) {
          throw new Error('Trạng thái này yêu cầu nhập lý do.')
        }
        throw new Error(msg || 'Lỗi không xác định khi chuyển trạng thái phòng')
      }

      return data as unknown as TransitionResult
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
      queryClient.invalidateQueries({ queryKey: ['room', vars.roomId] })
      queryClient.invalidateQueries({ queryKey: ['room-stats'] })
      queryClient.invalidateQueries({ queryKey: ['floor-plan'] })
      queryClient.invalidateQueries({ queryKey: ['room-detail', vars.roomId] })
      queryClient.invalidateQueries({ queryKey: ['audit-log'] })

      toast({
        title: 'Đã cập nhật trạng thái',
        description: `Phòng chuyển sang "${ROOM_STATUS_META_V2[vars.toStatus].label}".`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Không cập nhật được trạng thái',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}
