import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

/**
 * Lean Room Check — submit chuẩn (1 RPC, atomic, conflict check).
 * Khác Quick Path: cho phép daily/periodic/checkin/checkout/maintenance,
 * nhận đầy đủ jsonb buckets từ form.
 */
export interface SubmitRoomCheckLeanParams {
  roomId: string
  checkType: 'daily' | 'periodic' | 'checkin' | 'checkout' | 'maintenance'
  /** Thời điểm user mở phiên kiểm — dùng để conflict check */
  startedAt: string
  notes?: string | null
  photos?: string[]
  itemsMissing?: any[]
  itemsDamaged?: any[]
  itemsLost?: any[]
  itemsConsumed?: any[]
  itemsReplaced?: any[]
  taskId?: string | null
}

function mapLeanError(msg: string, rateLimitMin = 30): string {
  if (msg.includes('conflict_room_updated'))
    return 'Phòng này vừa có người cập nhật. Bạn cần tải lại trước khi gửi kết quả.'
  if (msg.includes('photo_required:damaged_lost'))
    return 'Cần chụp ảnh bằng chứng cho mục Hỏng / Mất trước khi gửi.'
  if (msg.includes('photo_required:missing_replace'))
    return 'Cần chụp ảnh bằng chứng cho mục Thiếu / Cần thay trước khi gửi.'
  if (msg.includes('photo_required:consumed_chargeable'))
    return 'Cần chụp ảnh bằng chứng cho mục Khách đã dùng (tính phí) trước khi gửi.'
  if (msg.includes('photo_required'))
    return 'Khách sạn yêu cầu chụp ảnh bằng chứng khi kiểm phòng.'
  if (msg.includes('invalid_quantity'))
    return 'Số lượng phải lớn hơn 0. Vui lòng kiểm tra lại các mục đã nhập.'
  if (msg.includes('invalid_check_type'))
    return 'Loại kiểm phòng không hợp lệ.'
  if (msg.includes('task_not_found'))
    return 'Không tìm thấy công việc liên quan.'
  if (msg.includes('quick_path_disabled'))
    return 'Khách sạn đã tắt chế độ kiểm nhanh.'
  if (msg.startsWith('quick_rate_limited')) {
    const m = msg.match(/quick_rate_limited:(\d+)/)
    const min = m ? Number(m[1]) : rateLimitMin
    return `Vừa có lần kiểm nhanh. Vui lòng đợi đủ ${min} phút giữa hai lần kiểm nhanh.`
  }
  if (msg.includes('quick_path_not_allowed'))
    return 'Loại kiểm này không hỗ trợ chế độ nhanh.'
  if (msg.includes('forbidden_tenant') || msg.includes('forbidden_role'))
    return 'Bạn không có quyền thực hiện thao tác này.'
  if (msg.includes('room_not_found')) return 'Không tìm thấy phòng.'
  if (msg.includes('check_not_found')) return 'Không tìm thấy bản kiểm.'
  return msg
}

export function useSubmitRoomCheckLean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (p: SubmitRoomCheckLeanParams) => {
      const { data, error } = await supabase.rpc('submit_room_check_lean', {
        _room_id: p.roomId,
        _check_type: p.checkType,
        _started_at: p.startedAt,
        _notes: p.notes ?? null,
        _photos: p.photos && p.photos.length ? p.photos : [],
        _items_missing: (p.itemsMissing ?? []) as any,
        _items_damaged: (p.itemsDamaged ?? []) as any,
        _items_lost: (p.itemsLost ?? []) as any,
        _items_consumed: (p.itemsConsumed ?? []) as any,
        _items_replaced: (p.itemsReplaced ?? []) as any,
        _task_id: p.taskId ?? null,
      })
      if (error) throw new Error(mapLeanError(error.message))
      return data as {
        check_id: string
        room_id: string
        summary_ok_count: number
        summary_issue_count: number
        minibar_count: number
      }
    },
    onSuccess: (data) => {
      const issues = data.summary_issue_count
      toast.success(
        issues === 0
          ? 'Đã gửi kiểm phòng. Phòng sạch, không có sự cố.'
          : `Đã gửi kiểm phòng. Ghi nhận ${issues} sự cố.`
      )
      // Xoá draft localStorage
      try {
        localStorage.removeItem(`room-check-${data.room_id}`)
      } catch {}
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['room', data.room_id] })
      qc.invalidateQueries({ queryKey: ['room-checks', data.room_id] })
      qc.invalidateQueries({ queryKey: ['room-last-check', data.room_id] })
      qc.invalidateQueries({ queryKey: ['last-room-check', data.room_id] })
      qc.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
    },
    onError: (err: Error) => {
      toast.error(err.message)
    },
  })
}

/**
 * Reopen room check (supervisor only).
 */
export function useReopenRoomCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ checkId, reason }: { checkId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('reopen_room_check', {
        _check_id: checkId,
        _reason: reason ?? null,
      })
      if (error) throw new Error(mapLeanError(error.message))
      return data as { check_id: string; status: string }
    },
    onSuccess: () => {
      toast.success('Đã mở lại bản kiểm phòng.')
      qc.invalidateQueries({ queryKey: ['room-checks'] })
      qc.invalidateQueries({ queryKey: ['last-room-check'] })
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
