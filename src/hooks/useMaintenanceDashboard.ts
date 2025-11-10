import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'

export function useMaintenanceDashboard() {
  const { tenantId, hotelId } = useUser()

  return useQuery({
    queryKey: ['maintenance-dashboard', tenantId, hotelId],
    queryFn: async () => {
      if (!tenantId || !hotelId) return null

      // Get all requests for stats
      const { data: requests, error } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('hotel_id', hotelId)

      if (error) throw error

      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Calculate stats
      const total = requests?.length || 0
      const inProgress = requests?.filter((r) => r.status === 'in_progress' || r.status === 'assigned').length || 0
      const completed = requests?.filter((r) => r.status === 'completed').length || 0
      const completedLast30Days = requests?.filter(
        (r) => r.status === 'completed' && new Date(r.completed_at || '') >= thirtyDaysAgo
      ).length || 0

      // Calculate average time
      const completedRequests = requests?.filter((r) => r.status === 'completed' && r.completed_at && r.reported_at) || []
      const avgTime = completedRequests.length > 0
        ? completedRequests.reduce((sum, r) => {
            const start = new Date(r.reported_at).getTime()
            const end = new Date(r.completed_at!).getTime()
            return sum + (end - start)
          }, 0) / completedRequests.length / (1000 * 60 * 60) // Convert to hours
        : 0

      // Calculate cost last 30 days
      const costLast30Days = requests
        ?.filter((r) => r.status === 'completed' && new Date(r.completed_at || '') >= thirtyDaysAgo)
        .reduce((sum, r) => sum + (r.actual_cost || 0), 0) || 0

      // Get active requests by priority
      const activeRequests = requests?.filter((r) => r.status !== 'completed' && r.status !== 'cancelled') || []
      const urgent = activeRequests.filter((r) => r.priority === 'urgent')
      const high = activeRequests.filter((r) => r.priority === 'high')
      const medium = activeRequests.filter((r) => r.priority === 'medium')
      const low = activeRequests.filter((r) => r.priority === 'low')

      // Get technicians with their workload
      const { data: technicians } = await supabase
        .from('users')
        .select(`
          *,
          assigned_requests:maintenance_requests!maintenance_requests_assigned_to_fkey(count)
        `)
        .eq('tenant_id', tenantId)
        .eq('department', 'maintenance')
        .eq('status', 'active')

      return {
        stats: {
          total,
          totalLast30Days: requests?.filter((r) => new Date(r.created_at) >= thirtyDaysAgo).length || 0,
          inProgress,
          completed,
          completedLast30Days,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
          avgTime: Math.round(avgTime * 10) / 10,
          costLast30Days,
        },
        activeRequests: {
          urgent,
          high,
          medium,
          low,
        },
        technicians: technicians || [],
        recentCompletions: requests
          ?.filter((r) => r.status === 'completed')
          .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
          .slice(0, 10) || [],
      }
    },
    enabled: !!tenantId && !!hotelId,
  })
}
