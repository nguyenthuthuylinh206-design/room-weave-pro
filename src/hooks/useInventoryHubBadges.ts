import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useTenant } from './useTenant'
import { useHotelContext } from '@/contexts/HotelContext'
import { useQueryClient } from '@tanstack/react-query'

export interface InventoryHubBadges {
  reorderPending: number
  distributionsPending: number
  lowStock: number
  adjustmentsPending: number
}

/**
 * Lightweight count badges for the Inventory Hub left navigation.
 * One query per badge — kept atomic so realtime invalidation is granular.
 */
export function useInventoryHubBadges() {
  const { tenant } = useTenant()
  const { selectedHotel, isAllHotelsMode } = useHotelContext()
  const tenantId = tenant?.id
  const hotelId = !isAllHotelsMode && selectedHotel?.id ? selectedHotel.id : null
  const qc = useQueryClient()

  // Realtime invalidation on key tables
  useEffect(() => {
    if (!tenantId) return
    const ch = supabase
      .channel(`inv-hub-badges-${tenantId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reorder_suggestions', filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ['inventory-hub-badges', tenantId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'distribution_orders', filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ['inventory-hub-badges', tenantId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_adjustments', filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: ['inventory-hub-badges', tenantId] })
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [tenantId, qc])

  return useQuery({
    queryKey: ['inventory-hub-badges', tenantId, hotelId, isAllHotelsMode],
    queryFn: async (): Promise<InventoryHubBadges> => {
      if (!tenantId) {
        return { reorderPending: 0, distributionsPending: 0, lowStock: 0, adjustmentsPending: 0 }
      }

      const reorderQ = supabase
        .from('reorder_suggestions')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')

      const distQ = supabase
        .from('distribution_orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'approved', 'in_progress'])

      const adjQ = supabase
        .from('stock_adjustments')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')

      if (hotelId) {
        reorderQ.eq('hotel_id', hotelId)
        distQ.eq('hotel_id', hotelId)
        adjQ.eq('hotel_id', hotelId)
      }

      const [reorder, dist, adj, dash] = await Promise.all([
        reorderQ,
        distQ,
        adjQ,
        supabase.rpc('get_inventory_dashboard_stats', {
          p_tenant_id: tenantId,
          p_hotel_id: hotelId,
        }),
      ])

      const lowStock = (dash.data as any)?.low_stock_count ?? 0

      return {
        reorderPending: reorder.count ?? 0,
        distributionsPending: dist.count ?? 0,
        adjustmentsPending: adj.count ?? 0,
        lowStock,
      }
    },
    enabled: !!tenantId && (isAllHotelsMode || !!selectedHotel?.id),
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
