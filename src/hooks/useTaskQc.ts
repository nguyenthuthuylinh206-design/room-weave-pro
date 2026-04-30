import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { mapDbError } from '@/lib/dbErrors'
import type { HousekeepingTask } from '@/types/housekeeping.types'

/**
 * Hooks bọc các RPC `complete_task`, `approve_task`, `reject_task`.
 * Backend tự áp dụng rule theo `hotels.qc_mode` và ghi audit.
 */

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['housekeeping-tasks'] })
  qc.invalidateQueries({ queryKey: ['unified-tasks'] })
  qc.invalidateQueries({ queryKey: ['my-tasks'] })
  qc.invalidateQueries({ queryKey: ['pending-counts'] })
  qc.invalidateQueries({ queryKey: ['tasks-pending-review'] })
}

export function useCompleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; note?: string }) => {
      const { data, error } = await supabase.rpc('complete_task', {
        _task_id: input.taskId,
        _note: input.note ?? null,
      })
      if (error) throw error
      return data as unknown as HousekeepingTask
    },
    onSuccess: (data) => {
      invalidate(qc)
      const isReview = (data as any)?.status === 'completed_pending_review'
      toast.success(isReview ? 'Đã gửi chờ duyệt' : 'Đã hoàn thành công việc')
    },
    onError: (err: any) => toast.error(mapDbError(err?.message ?? err)),
  })
}

export function useApproveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; note?: string }) => {
      const { data, error } = await supabase.rpc('approve_task', {
        _task_id: input.taskId,
        _note: input.note ?? null,
      })
      if (error) throw error
      return data as unknown as HousekeepingTask
    },
    onSuccess: () => {
      invalidate(qc)
      toast.success('Đã duyệt công việc')
    },
    onError: (err: any) => toast.error(mapDbError(err?.message ?? err)),
  })
}

export function useRejectTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { taskId: string; reason: string }) => {
      const { data, error } = await supabase.rpc('reject_task', {
        _task_id: input.taskId,
        _reason: input.reason,
      })
      if (error) throw error
      return data as unknown as HousekeepingTask
    },
    onSuccess: () => {
      invalidate(qc)
      toast.success('Đã trả về làm lại')
    },
    onError: (err: any) => toast.error(mapDbError(err?.message ?? err)),
  })
}
