import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import type { DashboardStats } from '@/types/dashboard.types'

export function useDashboardStats() {
  const { tenantId } = useUser()
  
  return useQuery({
    queryKey: ['dashboard-stats', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase
        .rpc('get_dashboard_stats', {
          p_tenant_id: tenantId,
        })
      
      if (error) throw error
      return data as unknown as DashboardStats
    },
    enabled: !!tenantId,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider stale after 20 seconds
  })
}
