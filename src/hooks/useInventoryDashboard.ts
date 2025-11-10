import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useUser } from './useUser'
import type { InventoryDashboardStats, LowStockItem, InventoryValueData } from '@/types/inventory.types'

export function useInventoryDashboard() {
  const { tenant } = useTenant()
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['inventory-dashboard', tenant?.id, user?.hotel_id],
    queryFn: async () => {
      if (!tenant?.id || !user?.hotel_id) throw new Error('No tenant or hotel')
      
      const { data, error } = await supabase
        .rpc('get_inventory_dashboard_stats', {
          p_tenant_id: tenant.id,
          p_hotel_id: user.hotel_id,
        })
      
      if (error) throw error
      return data as unknown as InventoryDashboardStats
    },
    enabled: !!tenant?.id && !!user?.hotel_id,
    refetchInterval: 60000, // 1 minute
  })
}

export function useLowStockItems(limit = 50) {
  const { tenant } = useTenant()
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['low-stock-items', tenant?.id, user?.hotel_id, limit],
    queryFn: async () => {
      if (!tenant?.id || !user?.hotel_id) throw new Error('Missing tenant or hotel')
      
      const { data, error } = await supabase
        .rpc('get_low_stock_items', {
          p_tenant_id: tenant.id,
          p_hotel_id: user.hotel_id,
          p_limit: limit,
        })
      
      if (error) throw error
      return data as LowStockItem[]
    },
    enabled: !!tenant?.id && !!user?.hotel_id,
  })
}

export function useInventoryValueOverTime(months = 12) {
  const { tenant } = useTenant()
  const { user } = useUser()
  
  return useQuery({
    queryKey: ['inventory-value-over-time', tenant?.id, user?.hotel_id, months],
    queryFn: async () => {
      if (!tenant?.id || !user?.hotel_id) throw new Error('Missing tenant or hotel')
      
      const { data, error } = await supabase
        .rpc('get_inventory_value_over_time', {
          p_tenant_id: tenant.id,
          p_hotel_id: user.hotel_id,
          p_months: months,
        })
      
      if (error) throw error
      return data as InventoryValueData[]
    },
    enabled: !!tenant?.id && !!user?.hotel_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
