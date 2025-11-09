import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from './useUser'
import type { TopItem } from '@/types/dashboard.types'

export function useTopItems(limit: number = 10) {
  const { tenantId } = useUser()
  
  return useQuery({
    queryKey: ['top-items', tenantId, limit],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant')
      
      const { data, error } = await supabase
        .rpc('get_top_items', {
          p_tenant_id: tenantId,
          p_limit: limit,
        })
      
      if (error) throw error
      return data as TopItem[]
    },
    enabled: !!tenantId,
    staleTime: 60000, // 1 minute
  })
}
