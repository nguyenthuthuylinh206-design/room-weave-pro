import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import { useHotelContext } from '@/contexts/HotelContext'

export function useMaintenanceDashboard() {
  const { tenantId } = useUser()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()

  return useQuery({
    queryKey: ['maintenance-dashboard', tenantId, isAllHotelsMode ? 'all' : selectedHotel?.id],
    queryFn: async () => {
      if (!tenantId) return null
      if (!isAllHotelsMode && !selectedHotel?.id) return null

      // Get all requests for stats
      let query = supabase
        .from('maintenance_requests')
        .select('*')
        .eq('tenant_id', tenantId)
      
      if (!isAllHotelsMode && selectedHotel?.id) {
        query = query.eq('hotel_id', selectedHotel.id)
      }
      
      const { data: requests, error } = await query

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

      // Calculate KPIs
      // MTTR - Mean Time To Repair (hours)
      const mttr = completedRequests.length > 0 ? Math.round(avgTime * 10) / 10 : 0

      // MTBF - Mean Time Between Failures (days) - for recurring issues
      const itemFailures = requests?.reduce((acc, r) => {
        if (r.item_id) {
          if (!acc[r.item_id]) acc[r.item_id] = []
          acc[r.item_id].push(new Date(r.reported_at).getTime())
        }
        return acc
      }, {} as Record<string, number[]>) || {}

      const mtbfValues = Object.values(itemFailures)
        .filter(dates => dates.length >= 2)
        .map(dates => {
          const sorted = dates.sort((a, b) => a - b)
          const intervals = []
          for (let i = 1; i < sorted.length; i++) {
            intervals.push((sorted[i] - sorted[i-1]) / (1000 * 60 * 60 * 24)) // to days
          }
          return intervals.reduce((a, b) => a + b, 0) / intervals.length
        })

      const mtbf = mtbfValues.length > 0 
        ? Math.round(mtbfValues.reduce((a, b) => a + b, 0) / mtbfValues.length)
        : 0

      // First Time Fix Rate - no follow-up within 7 days
      const firstTimeFixCount = completedRequests.filter(r => {
        const followUps = requests?.filter(fu => 
          (fu.item_id === r.item_id || fu.room_id === r.room_id) &&
          new Date(fu.reported_at) > new Date(r.completed_at!) &&
          (new Date(fu.reported_at).getTime() - new Date(r.completed_at!).getTime()) / (1000 * 60 * 60 * 24) <= 7
        ) || []
        return followUps.length === 0
      }).length || 0

      const firstTimeFixRate = completed > 0 ? Math.round((firstTimeFixCount / completed) * 100) : 0

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
          avgTime: mttr,
          costLast30Days,
          // KPIs
          mttr,
          mtbf,
          firstTimeFixRate,
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
    enabled: !!tenantId && (isAllHotelsMode || !!selectedHotel?.id),
  })
}
