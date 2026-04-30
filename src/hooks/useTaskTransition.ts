import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { mapDbError } from '@/lib/dbErrors'
import type { TaskStatus, HousekeepingTask } from '@/types/housekeeping.types'

interface TransitionInput {
  taskId: string
  toStatus: TaskStatus
  reason?: string
  force?: boolean
}

/**
 * Hook chuẩn — mọi thay đổi trạng thái task PHẢI đi qua đây.
 * Backend tự ghi audit log và check permission.
 */
export function useTaskTransition() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ taskId, toStatus, reason, force }: TransitionInput) => {
      const { data, error } = await supabase.rpc('transition_task_status', {
        _task_id: taskId,
        _to_status: toStatus,
        _reason: reason ?? null,
        _force: force ?? false,
      })
      if (error) throw error
      return data as unknown as HousekeepingTask
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
      qc.invalidateQueries({ queryKey: ['unified-tasks'] })
      qc.invalidateQueries({ queryKey: ['my-tasks'] })
      qc.invalidateQueries({ queryKey: ['pending-counts'] })
      const labels: Record<TaskStatus, string> = {
        pending: 'Đã đặt về chờ xử lý',
        in_progress: 'Đã bắt đầu',
        completed_pending_review: 'Đã gửi chờ duyệt',
        approved: 'Đã duyệt',
        rejected_rework: 'Đã trả về làm lại',
        completed: 'Đã hoàn thành',
        cancelled: 'Đã hủy',
      }
      toast.success(labels[vars.toStatus] ?? 'Cập nhật trạng thái thành công')
    },
    onError: (err: any) => {
      toast.error(mapDbError(err))
    },
  })
}
