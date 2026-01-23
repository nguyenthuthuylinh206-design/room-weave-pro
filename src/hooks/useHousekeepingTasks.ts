import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { toast } from 'sonner'
import { triggerWorkflow, WorkflowTriggerTypes } from '@/lib/triggerWorkflow'
import { 
  TASK_TYPE_LABELS,
  PRIORITY_LABELS
} from '@/types/housekeeping.types'
import type { 
  HousekeepingTask, 
  HousekeepingTaskWithDetails, 
  CreateTaskInput, 
  TaskStatus 
} from '@/types/housekeeping.types'

// Fetch tasks assigned to current user
export function useMyTasks() {
  const { user } = useUser()
  const userId = user?.id
  const tenantId = user?.tenant_id
  const { selectedHotel } = useHotelContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['my-housekeeping-tasks', userId, selectedHotel?.id],
    queryFn: async () => {
      if (!userId) return []

      let q = supabase
        .from('housekeeping_tasks')
        .select(`
          *,
          room:rooms(id, room_number, floor, room_type),
          requested_user:users!housekeeping_tasks_requested_by_fkey(id, full_name, avatar_url),
          booking:room_bookings(id, guest_name, check_out_date)
        `)
        .eq('assigned_to', userId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (selectedHotel?.id) {
        q = q.eq('hotel_id', selectedHotel.id)
      }

      const { data, error } = await q

      if (error) throw error
      return data as unknown as HousekeepingTaskWithDetails[]
    },
    enabled: !!userId
  })

  // Realtime subscription
  useEffect(() => {
    if (!userId || !tenantId) return

    const channel = supabase
      .channel('my-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'housekeeping_tasks',
          filter: `assigned_to=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, tenantId, queryClient])

  return query
}

// Fetch all tasks for a hotel (manager view)
export function useHotelTasks(hotelId?: string) {
  const { tenantId } = useUser()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['hotel-housekeeping-tasks', hotelId],
    queryFn: async () => {
      if (!hotelId) return []

      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .select(`
          *,
          room:rooms(id, room_number, floor, room_type),
          assigned_user:users!housekeeping_tasks_assigned_to_fkey(id, full_name, avatar_url),
          requested_user:users!housekeeping_tasks_requested_by_fkey(id, full_name, avatar_url),
          booking:room_bookings(id, guest_name, check_out_date)
        `)
        .eq('hotel_id', hotelId)
        .in('status', ['pending', 'in_progress'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error
      return data as unknown as HousekeepingTaskWithDetails[]
    },
    enabled: !!hotelId
  })

  // Realtime subscription
  useEffect(() => {
    if (!hotelId || !tenantId) return

    const channel = supabase
      .channel(`hotel-tasks-${hotelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'housekeeping_tasks',
          filter: `hotel_id=eq.${hotelId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping-tasks', hotelId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hotelId, tenantId, queryClient])

  return query
}

// Create new task
export function useCreateTask() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const tenantId = user?.tenant_id
  const userId = user?.id

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!tenantId) throw new Error('Không tìm thấy tenant')

      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .insert({
          ...input,
          tenant_id: tenantId,
          requested_by: userId,
          priority: input.priority || 'medium'
        })
        .select(`
          *,
          room:rooms(id, room_number, floor, room_type),
          assigned_user:users!housekeeping_tasks_assigned_to_fkey(id, full_name)
        `)
        .single()

      if (error) throw error
      return data as HousekeepingTask & { 
        room?: { room_number: string; floor: number }
        assigned_user?: { full_name: string }
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
      toast.success('Đã tạo yêu cầu công việc')

      // Trigger workflow for task created
      if (tenantId) {
        triggerWorkflow({
          triggerType: WorkflowTriggerTypes.HOUSEKEEPING_TASK_CREATED,
          eventData: {
            task_id: data.id,
            task_type: data.task_type,
            task_type_label: TASK_TYPE_LABELS[data.task_type] || data.task_type,
            priority: data.priority,
            priority_label: PRIORITY_LABELS[data.priority] || data.priority,
            room_id: data.room_id,
            room_number: (data as any).room?.room_number,
            floor: (data as any).room?.floor,
            hotel_id: data.hotel_id,
            assigned_to: data.assigned_to,
            assigned_to_name: (data as any).assigned_user?.full_name,
            title: data.title,
            description: data.description,
          },
          tenantId,
          hotelId: data.hotel_id,
        }).catch(err => console.error('Workflow trigger failed:', err))
      }
    },
    onError: (error) => {
      console.error('Create task error:', error)
      toast.error('Không thể tạo yêu cầu')
    }
  })
}

// Update task status
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const tenantId = user?.tenant_id

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      status, 
      roomCheckId 
    }: { 
      taskId: string
      status: TaskStatus
      roomCheckId?: string 
    }) => {
      const updates: Partial<HousekeepingTask> = { status }

      if (status === 'in_progress') {
        updates.started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
        if (roomCheckId) {
          updates.room_check_id = roomCheckId
        }
      } else if (status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .update(updates)
        .eq('id', taskId)
        .select(`
          *,
          room:rooms(id, room_number, floor, room_type),
          assigned_user:users!housekeeping_tasks_assigned_to_fkey(id, full_name)
        `)
        .single()

      if (error) throw error
      return data as HousekeepingTask & {
        room?: { room_number: string; floor: number }
        assigned_user?: { full_name: string }
      }
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
      
      if (data.status === 'in_progress') {
        toast.success('Đã bắt đầu công việc')
        
        // Trigger workflow for task started
        if (tenantId) {
          triggerWorkflow({
            triggerType: WorkflowTriggerTypes.HOUSEKEEPING_TASK_STARTED,
            eventData: {
              task_id: data.id,
              task_type: data.task_type,
              task_type_label: TASK_TYPE_LABELS[data.task_type] || data.task_type,
              room_id: data.room_id,
              room_number: (data as any).room?.room_number,
              floor: (data as any).room?.floor,
              hotel_id: data.hotel_id,
              started_by_name: user?.full_name,
            },
            tenantId,
            hotelId: data.hotel_id,
          }).catch(err => console.error('Workflow trigger failed:', err))
        }
      } else if (data.status === 'completed') {
        toast.success('Đã hoàn thành công việc')
        
        // Calculate duration
        const startedAt = data.started_at ? new Date(data.started_at) : null
        const completedAt = data.completed_at ? new Date(data.completed_at) : new Date()
        const durationMinutes = startedAt 
          ? Math.round((completedAt.getTime() - startedAt.getTime()) / 60000)
          : null
        
        // Trigger workflow for task completed
        if (tenantId) {
          triggerWorkflow({
            triggerType: WorkflowTriggerTypes.HOUSEKEEPING_TASK_COMPLETED,
            eventData: {
              task_id: data.id,
              task_type: data.task_type,
              task_type_label: TASK_TYPE_LABELS[data.task_type] || data.task_type,
              room_id: data.room_id,
              room_number: (data as any).room?.room_number,
              floor: (data as any).room?.floor,
              hotel_id: data.hotel_id,
              completed_by_name: user?.full_name,
              duration_minutes: durationMinutes,
            },
            tenantId,
            hotelId: data.hotel_id,
          }).catch(err => console.error('Workflow trigger failed:', err))
        }
      }
    },
    onError: (error) => {
      console.error('Update task status error:', error)
      toast.error('Không thể cập nhật trạng thái')
    }
  })
}

// Get pending task count for current user
export function usePendingTaskCount() {
  const { user } = useUser()
  const userId = user?.id
  const { selectedHotel } = useHotelContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['pending-task-count', userId, selectedHotel?.id],
    queryFn: async () => {
      if (!userId) return 0

      let q = supabase
        .from('housekeeping_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .in('status', ['pending', 'in_progress'])

      if (selectedHotel?.id) {
        q = q.eq('hotel_id', selectedHotel.id)
      }

      const { count, error } = await q

      if (error) throw error
      return count || 0
    },
    enabled: !!userId
  })

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('task-count-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'housekeeping_tasks',
          filter: `assigned_to=eq.${userId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return query
}

// Cancel task
export function useCancelTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('housekeeping_tasks')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
      queryClient.invalidateQueries({ queryKey: ['unassigned-housekeeping-tasks'] })
      toast.success('Đã hủy công việc')
    },
    onError: (error) => {
      console.error('Cancel task error:', error)
      toast.error('Không thể hủy công việc')
    }
  })
}

// Fetch unassigned tasks (tasks without assigned_to)
export function useUnassignedTasks() {
  const { user } = useUser()
  const tenantId = user?.tenant_id
  const { selectedHotel } = useHotelContext()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['unassigned-housekeeping-tasks', selectedHotel?.id],
    queryFn: async () => {
      if (!tenantId) return []

      let q = supabase
        .from('housekeeping_tasks')
        .select(`
          *,
          room:rooms(id, room_number, floor, room_type),
          requested_user:users!housekeeping_tasks_requested_by_fkey(id, full_name, avatar_url),
          booking:room_bookings(id, guest_name, check_out_date)
        `)
        .is('assigned_to', null)
        .eq('status', 'pending')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (selectedHotel?.id) {
        q = q.eq('hotel_id', selectedHotel.id)
      }

      const { data, error } = await q

      if (error) throw error
      return data as unknown as HousekeepingTaskWithDetails[]
    },
    enabled: !!tenantId
  })

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return

    const channel = supabase
      .channel('unassigned-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'housekeeping_tasks'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unassigned-housekeeping-tasks'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return query
}

// Claim an unassigned task
export function useClaimTask() {
  const queryClient = useQueryClient()
  const { user } = useUser()
  const userId = user?.id

  return useMutation({
    mutationFn: async (taskId: string) => {
      if (!userId) throw new Error('User not found')

      const { data, error } = await supabase
        .from('housekeeping_tasks')
        .update({ assigned_to: userId })
        .eq('id', taskId)
        .is('assigned_to', null) // Only claim if still unassigned
        .select('*')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['my-housekeeping-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['pending-task-count'] })
      toast.success('Đã nhận công việc')
    },
    onError: (error) => {
      console.error('Claim task error:', error)
      toast.error('Không thể nhận công việc. Có thể đã có người khác nhận.')
    }
  })
}
