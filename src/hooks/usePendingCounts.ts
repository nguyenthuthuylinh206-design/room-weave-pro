import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'
import { useHotelContext } from '@/contexts/HotelContext'
import { isStaff } from '@/lib/userAccess'

export interface PendingCounts {
  supplements: number
  laundryRequests: number
  distributions: number
  maintenance: number
  adjustments: number
  tasks: number
  // Aggregated counts for parent menus
  inventoryTotal: number
  laundryTotal: number
  maintenanceTotal: number
}

export function usePendingCounts() {
  const { user, tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const isStaffUser = isStaff(user)

  return useQuery({
    queryKey: ['pending-counts-all', tenantId, selectedHotel?.id, isAllHotelsMode, user?.id, isStaffUser],
    queryFn: async (): Promise<PendingCounts> => {
      if (!tenantId) {
        return {
          supplements: 0,
          laundryRequests: 0,
          distributions: 0,
          maintenance: 0,
          adjustments: 0,
          tasks: 0,
          inventoryTotal: 0,
          laundryTotal: 0,
          maintenanceTotal: 0,
        }
      }

      const hotelId = !isAllHotelsMode && selectedHotel?.id ? selectedHotel.id : null

      // Build queries with optional hotel filter
      let supplementsQuery = supabase
        .from('supplement_requests')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
      if (hotelId) supplementsQuery = supplementsQuery.eq('hotel_id', hotelId)

      let laundryRequestsQuery = supabase
        .from('laundry_requests')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
      if (hotelId) laundryRequestsQuery = laundryRequestsQuery.eq('hotel_id', hotelId)

      let distributionsQuery = supabase
        .from('distribution_orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'released', 'in_progress'])
      if (hotelId) distributionsQuery = distributionsQuery.eq('hotel_id', hotelId)
      // Staff chỉ thấy phiếu được giao cho mình
      if (isStaffUser && user?.id) {
        distributionsQuery = distributionsQuery.eq('assigned_to', user.id)
      }
      if (hotelId) distributionsQuery = distributionsQuery.eq('hotel_id', hotelId)

      let maintenanceQuery = supabase
        .from('maintenance_requests')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'waiting'])
      if (hotelId) maintenanceQuery = maintenanceQuery.eq('hotel_id', hotelId)

      let adjustmentsQuery = supabase
        .from('stock_adjustments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
      if (hotelId) adjustmentsQuery = adjustmentsQuery.eq('hotel_id', hotelId)

      let tasksQuery = supabase
        .from('housekeeping_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'assigned'])
      if (hotelId) tasksQuery = tasksQuery.eq('hotel_id', hotelId)
      // Staff chỉ thấy task được giao cho mình
      if (isStaffUser && user?.id) {
        tasksQuery = tasksQuery.eq('assigned_to', user.id)
      }

      const [
        supplementsRes,
        laundryRequestsRes,
        distributionsRes,
        maintenanceRes,
        adjustmentsRes,
        tasksRes,
      ] = await Promise.all([
        supplementsQuery,
        laundryRequestsQuery,
        distributionsQuery,
        maintenanceQuery,
        adjustmentsQuery,
        tasksQuery,
      ])

      const supplements = supplementsRes.count || 0
      const laundryRequests = laundryRequestsRes.count || 0
      const distributions = distributionsRes.count || 0
      const maintenance = maintenanceRes.count || 0
      const adjustments = adjustmentsRes.count || 0
      const tasks = tasksRes.count || 0

      return {
        supplements,
        laundryRequests,
        distributions,
        maintenance,
        adjustments,
        tasks,
        // Aggregated totals for parent menus
        inventoryTotal: supplements + distributions + adjustments,
        laundryTotal: laundryRequests,
        maintenanceTotal: maintenance,
      }
    },
    enabled: !!tenantId,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
    refetchOnWindowFocus: false,
  })
}

// Export individual count hooks for backwards compatibility
export function usePendingSupplementsCount() {
  const { data } = usePendingCounts()
  return data?.supplements ?? 0
}

export function usePendingDistributionsCount() {
  const { data } = usePendingCounts()
  return data?.distributions ?? 0
}

export function usePendingMaintenanceCount() {
  const { data } = usePendingCounts()
  return data?.maintenance ?? 0
}

export function usePendingLaundryRequestsCount() {
  const { data } = usePendingCounts()
  return data?.laundryRequests ?? 0
}

export function usePendingAdjustmentsCount() {
  const { data } = usePendingCounts()
  return data?.adjustments ?? 0
}
