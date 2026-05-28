import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useUser } from '@/hooks/useUser'

/**
 * Trả về Set các user_id đang online trong tenant.
 * Dựa trên staff_status.is_online (logic heartbeat 5 phút đã có).
 */
export function useOnlinePresence() {
  const { tenantId } = useUser()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!tenantId) return
    const channel = supabase
      .channel(`online-presence-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_status', filter: `tenant_id=eq.${tenantId}` },
        () => queryClient.invalidateQueries({ queryKey: ['online-presence', tenantId] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, queryClient])

  return useQuery({
    queryKey: ['online-presence', tenantId],
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    queryFn: async (): Promise<Set<string>> => {
      if (!tenantId) return new Set()
      const { data, error } = await supabase
        .from('staff_status')
        .select('user_id, is_online, last_heartbeat')
        .eq('tenant_id', tenantId)
        .eq('is_online', true)
      if (error) {
        console.warn('[useOnlinePresence] fetch failed', error)
        return new Set()
      }
      const fiveMinAgo = Date.now() - 5 * 60 * 1000
      const ids = (data || [])
        .filter((r) => {
          if (!r.last_heartbeat) return false
          return new Date(r.last_heartbeat).getTime() >= fiveMinAgo
        })
        .map((r) => r.user_id as string)
      return new Set(ids)
    },
  })
}
