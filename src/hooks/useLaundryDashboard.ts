import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import type { LaundryDashboardStats } from '@/types/laundry.types'

export function useLaundryDashboardStats() {
  const { tenant } = useTenant()
  
  return useQuery({
    queryKey: ['laundry-dashboard-stats', tenant?.id],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('No tenant')
      
      const { data, error } = await supabase
        .rpc('get_laundry_dashboard_stats', {
          p_tenant_id: tenant.id,
        })
      
      if (error) throw error
      return data as unknown as LaundryDashboardStats
    },
    enabled: !!tenant?.id,
    refetchInterval: 30000, // 30 seconds
  })
}

export function useMonthlyLaundryExpenses(year?: number) {
  const { tenant } = useTenant()
  const currentYear = year || new Date().getFullYear()
  
  return useQuery({
    queryKey: ['monthly-laundry-expenses', tenant?.id, currentYear],
    queryFn: async () => {
      if (!tenant?.id) throw new Error('No tenant')
      
      const { data, error } = await supabase
        .rpc('get_monthly_laundry_expenses', {
          p_tenant_id: tenant.id,
          p_year: currentYear,
        })
      
      if (error) throw error
      return data
    },
    enabled: !!tenant?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
