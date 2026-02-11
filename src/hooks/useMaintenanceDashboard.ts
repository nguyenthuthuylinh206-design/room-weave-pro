import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'

interface MaintenanceDashboardStats {
  total: number
  totalLast30Days: number
  inProgress: number
  completed: number
  completedLast30Days: number
  completionRate: number
  avgTime: number
  costLast30Days: number
  mttr: number
  mtbf: number
  firstTimeFixRate: number
}

interface MaintenanceDashboardResult {
  stats: MaintenanceDashboardStats
  activeRequests: any[]
  recentCompletions: any[]
}

export function useMaintenanceDashboard() {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: ['maintenance-dashboard', tenantId, isAllHotelsMode ? 'all' : selectedHotel?.id],
    queryFn: async () => {
      if (!tenantId) return null
      if (!isAllHotelsMode && !selectedHotel?.id) return null

      const { data, error } = await supabase.rpc('get_maintenance_dashboard', {
        p_tenant_id: tenantId,
        p_hotel_id: isAllHotelsMode ? null : selectedHotel?.id || null,
      })

      if (error) throw error

      const result = data as unknown as {
        stats: MaintenanceDashboardStats
        activeRequests: any[]
        recentCompletions: any[]
      }

      // Group active requests by priority for backward compatibility
      const activeRequests = result.activeRequests || []
      const grouped = {
        urgent: activeRequests.filter((r: any) => r.priority === 'urgent'),
        high: activeRequests.filter((r: any) => r.priority === 'high'),
        medium: activeRequests.filter((r: any) => r.priority === 'medium'),
        low: activeRequests.filter((r: any) => r.priority === 'low'),
      }

      return {
        stats: result.stats,
        activeRequests: grouped,
        recentCompletions: result.recentCompletions || [],
      }
    },
    enabled: !!tenantId && (isAllHotelsMode || !!selectedHotel?.id),
    staleTime: 60 * 1000, // 1 minute
  })
}
