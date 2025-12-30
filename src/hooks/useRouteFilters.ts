import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import type { RouteFilters, RouteStatus } from '@/types/route-batch.types'

interface DistributionOrderWithFilters {
  id: string
  order_code: string
  status: RouteStatus
  floor: number | null
  shift_date: string | null
  shift_code: string | null
  total_rooms: number
  total_items: number
  rooms_completed: number
  assigned_to: string | null
  assigned_to_name: string | null
  created_by: string
  created_by_name: string
  notes: string | null
  released_at: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export function useRoutesWithFilters(
  filters: RouteFilters = {},
  page = 1,
  pageSize = 25
) {
  const { tenant } = useTenant()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: [
      'distribution-routes',
      tenant?.id,
      isAllHotelsMode ? 'all' : selectedHotel?.id,
      filters,
      page,
      pageSize,
    ],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('No tenant')
      if (!isAllHotelsMode && !selectedHotel?.id) throw new Error('No hotel selected')

      let query = supabase
        .from('distribution_orders')
        .select(`
          id,
          order_code,
          status,
          floor,
          shift_date,
          shift_code,
          total_rooms,
          total_items,
          rooms_completed,
          assigned_to,
          notes,
          released_at,
          started_at,
          completed_at,
          created_at,
          created_by,
          creator:users!distribution_orders_created_by_fkey(full_name),
          assignee:users!distribution_orders_assigned_to_fkey(full_name)
        `, { count: 'exact' })
        .eq('tenant_id', tenant.id)

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.floor !== undefined) {
        query = query.eq('floor', filters.floor)
      }
      if (filters.shift_date) {
        query = query.eq('shift_date', filters.shift_date)
      }
      if (filters.shift_code) {
        query = query.eq('shift_code', filters.shift_code)
      }
      if (filters.assigned_to) {
        query = query.eq('assigned_to', filters.assigned_to)
      }

      // Pagination
      const start = (page - 1) * pageSize
      const end = start + pageSize - 1
      query = query.order('created_at', { ascending: false }).range(start, end)

      const { data, error, count } = await query

      if (error) throw error

      // Transform data to include names
      const orders: DistributionOrderWithFilters[] = (data || []).map((row: any) => ({
        id: row.id,
        order_code: row.order_code,
        status: row.status,
        floor: row.floor,
        shift_date: row.shift_date,
        shift_code: row.shift_code,
        total_rooms: row.total_rooms,
        total_items: row.total_items,
        rooms_completed: row.rooms_completed,
        assigned_to: row.assigned_to,
        assigned_to_name: row.assignee?.full_name || null,
        created_by: row.created_by,
        created_by_name: row.creator?.full_name || 'Unknown',
        notes: row.notes,
        released_at: row.released_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        created_at: row.created_at,
      }))

      return {
        data: orders,
        totalCount: count || 0,
      }
    },
    enabled: !!tenant?.id && (isAllHotelsMode || !!selectedHotel?.id),
  })
}

export function useAvailableFloors() {
  const { tenant } = useTenant()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: ['distribution-floors', tenant?.id, isAllHotelsMode ? 'all' : selectedHotel?.id],
    queryFn: async () => {
      if (!tenant?.id) return []
      if (!isAllHotelsMode && !selectedHotel?.id) return []

      let query = supabase
        .from('distribution_orders')
        .select('floor')
        .eq('tenant_id', tenant.id)
        .not('floor', 'is', null)

      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }

      const { data, error } = await query

      if (error) throw error

      // Get unique floors and sort
      const uniqueFloors = [...new Set((data || []).map(d => d.floor as number))]
      return uniqueFloors.sort((a, b) => a - b)
    },
    enabled: !!tenant?.id && (isAllHotelsMode || !!selectedHotel?.id),
  })
}
