import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { mapDbError } from '@/lib/dbErrors'

export type QuickCheckType = 'daily' | 'checkin' | 'checkout' | 'periodic' | 'maintenance'

export interface LastRoomCheck {
  id: string
  check_type: string
  checked_at: string
  checked_by: string
  checker_name: string
  cleanliness_score: number | null
  items_complete: boolean | null
  photos: string[] | null
  notes: string | null
  issues_count: number
  qc_status: string | null
}

/**
 * Lấy lần kiểm phòng gần nhất — phục vụ Context Card.
 */
export function useLastRoomCheck(roomId: string | undefined) {
  return useQuery({
    queryKey: ['last-room-check', roomId],
    enabled: !!roomId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_last_room_check', { _room_id: roomId! })
      if (error) throw error
      return (data?.[0] ?? null) as LastRoomCheck | null
    },
  })
}

interface QuickCheckParams {
  roomId: string
  checkType: QuickCheckType
  notes?: string
  photos?: string[]
}

/**
 * Hoàn tất nhanh "Phòng OK hoàn toàn" — gọi RPC perform_quick_room_check.
 * Audit log + tenant guard + photo evidence được xử lý server-side.
 */
export function useQuickRoomCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ roomId, checkType, notes, photos }: QuickCheckParams) => {
      const { data, error } = await supabase.rpc('perform_quick_room_check', {
        _room_id: roomId,
        _check_type: checkType,
        _notes: notes ?? null,
        _photos: photos && photos.length > 0 ? photos : [],
      })
      if (error) {
        if (error.message?.includes('photo_required')) {
          throw new Error('Khách sạn yêu cầu chụp ảnh bằng chứng khi kiểm phòng')
        }
        if (error.message?.includes('forbidden_tenant')) {
          throw new Error('Bạn không có quyền kiểm phòng này.')
        }
        if (error.message?.includes('room_not_found')) {
          throw new Error('Không tìm thấy phòng.')
        }
        throw new Error(mapDbError(error.message) || error.message)
      }
      return data as { check_id: string; room_id: string; old_status: string; new_status: string }
    },
    onSuccess: (data) => {
      toast({
        title: 'Đã xác nhận phòng OK',
        description: `Phòng đã được ghi nhận sạch sẽ. Trạng thái: ${data.new_status}`,
      })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room', data.room_id] })
      qc.invalidateQueries({ queryKey: ['room-checks', data.room_id] })
      qc.invalidateQueries({ queryKey: ['room-last-check', data.room_id] })
      qc.invalidateQueries({ queryKey: ['last-room-check', data.room_id] })
      qc.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
    },
    onError: (err: Error) => {
      toast({
        title: 'Không thể xác nhận nhanh',
        description: err.message,
        variant: 'destructive',
      })
    },
  })
}
