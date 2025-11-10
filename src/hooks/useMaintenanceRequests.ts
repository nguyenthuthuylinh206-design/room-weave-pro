import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useUser } from './useUser'

export interface MaintenanceRequest {
  id: string
  tenant_id: string
  hotel_id: string
  request_code: string
  room_id?: string
  item_id?: string
  location: string
  issue_type: 'repair' | 'replace' | 'inspection' | 'cleaning' | 'other'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  title: string
  description: string
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  reported_by: string
  reported_at: string
  assigned_to?: string
  assigned_at?: string
  started_at?: string
  completed_at?: string
  expected_completion_date?: string
  estimated_cost?: number
  actual_cost?: number
  under_warranty?: boolean
  warranty_info?: string
  solution?: string
  parts_used?: any[]
  photos?: string[]
  documents?: string[]
  completion_photos?: string[]
  completion_notes?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface MaintenanceFilters {
  search?: string
  status?: string
  priority?: string
  issue_type?: string
  room_id?: string
  item_id?: string
  assigned_to?: string
  reported_by?: string
  under_warranty?: boolean
  overdue?: boolean
  from_date?: string
  to_date?: string
}

export function useMaintenanceRequests(filters: MaintenanceFilters = {}) {
  const { toast } = useToast()
  const { tenantId, hotelId } = useUser()

  return useQuery({
    queryKey: ['maintenance-requests', tenantId, hotelId, filters],
    queryFn: async () => {
      if (!tenantId || !hotelId) return []

      let query = supabase
        .from('maintenance_requests')
        .select(`
          *,
          room:rooms(id, room_number, floor, room_type),
          item:items(id, code, name, images),
          reporter:users!maintenance_requests_reported_by_fkey(id, full_name, avatar_url),
          assignee:users!maintenance_requests_assigned_to_fkey(id, full_name, avatar_url)
        `)
        .eq('tenant_id', tenantId)
        .eq('hotel_id', hotelId)

      if (filters.search) {
        query = query.or(`request_code.ilike.%${filters.search}%,title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }

      if (filters.issue_type) {
        query = query.eq('issue_type', filters.issue_type)
      }

      if (filters.room_id) {
        query = query.eq('room_id', filters.room_id)
      }

      if (filters.item_id) {
        query = query.eq('item_id', filters.item_id)
      }

      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }

      if (filters.reported_by) {
        query = query.eq('reported_by', filters.reported_by)
      }

      if (filters.under_warranty !== undefined) {
        query = query.eq('under_warranty', filters.under_warranty)
      }

      if (filters.from_date) {
        query = query.gte('reported_at', filters.from_date)
      }

      if (filters.to_date) {
        query = query.lte('reported_at', filters.to_date)
      }

      query = query.order('priority', { ascending: false })
      query = query.order('reported_at', { ascending: false })

      const { data, error } = await query

      if (error) throw error
      return data as any[]
    },
    enabled: !!tenantId && !!hotelId,
  })
}

export function useMaintenanceRequest(id: string) {
  const { toast } = useToast()

  return useQuery({
    queryKey: ['maintenance-request', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select(`
          *,
          room:rooms(*),
          item:items(*),
          reporter:users!maintenance_requests_reported_by_fkey(*),
          assignee:users!maintenance_requests_assigned_to_fkey(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useCreateMaintenanceRequest() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user, tenantId, hotelId } = useUser()

  return useMutation({
    mutationFn: async (data: any) => {
      const { data: request, error } = await supabase
        .from('maintenance_requests')
        .insert({
          ...data,
          tenant_id: tenantId,
          hotel_id: hotelId,
          reported_by: user?.id,
          reported_at: data.reported_at || new Date().toISOString(),
          status: data.assigned_to ? 'assigned' : 'pending',
        })
        .select()
        .single()

      if (error) throw error

      // If assigned, update assigned_at
      if (data.assigned_to) {
        await supabase
          .from('maintenance_requests')
          .update({ assigned_at: new Date().toISOString() })
          .eq('id', request.id)
      }

      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      toast({
        title: 'Thành công',
        description: 'Đã tạo yêu cầu bảo trì',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateMaintenanceRequest() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: request, error } = await supabase
        .from('maintenance_requests')
        .update(data)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      queryClient.invalidateQueries({ queryKey: ['maintenance-request'] })
      toast({
        title: 'Thành công',
        description: 'Đã cập nhật yêu cầu',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Lỗi',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

export function useAssignRequest() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, assigned_to }: { id: string; assigned_to: string }) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({
          assigned_to,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      toast({
        title: 'Thành công',
        description: 'Đã gán thợ xử lý',
      })
    },
  })
}

export function useStartRequest() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      toast({
        title: 'Thành công',
        description: 'Đã bắt đầu xử lý',
      })
    },
  })
}

export function useCompleteRequest() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: request, error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          solution: data.solution,
          actual_cost: data.actual_cost,
          parts_used: data.parts_used,
          completion_photos: data.completion_photos,
          completion_notes: data.completion_notes,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return request
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      toast({
        title: 'Thành công',
        description: 'Đã hoàn thành yêu cầu',
      })
    },
  })
}

export function useCancelRequest() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .update({
          status: 'cancelled',
          notes: reason,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-requests'] })
      toast({
        title: 'Thành công',
        description: 'Đã hủy yêu cầu',
      })
    },
  })
}
