import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { CellSizeState } from './useFloorMapCellSize'

/**
 * Load + persist Floor Map cell-size vào hotels.settings.floor_map_cell_size.
 * Lưu chung cho cả hotel → áp dụng cho mọi user/thiết bị.
 */
export function useFloorMapCellSizeRemote(hotelId?: string | null) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['floor-map-cell-size', hotelId],
    queryFn: async (): Promise<CellSizeState | null> => {
      if (!hotelId) return null
      const { data, error } = await supabase
        .from('hotels')
        .select('settings')
        .eq('id', hotelId)
        .maybeSingle()
      if (error) throw error
      const s = (data?.settings as any)?.floor_map_cell_size
      return s ?? null
    },
    enabled: !!hotelId,
    staleTime: 5 * 60 * 1000,
  })

  const save = useMutation({
    mutationFn: async (value: CellSizeState) => {
      if (!hotelId) throw new Error('Chưa chọn khách sạn')
      const { data: row, error: readErr } = await supabase
        .from('hotels')
        .select('settings')
        .eq('id', hotelId)
        .maybeSingle()
      if (readErr) throw readErr
      const current = (row?.settings as any) ?? {}
      const newSettings = { ...current, floor_map_cell_size: value }
      const { error } = await supabase
        .from('hotels')
        .update({ settings: newSettings })
        .eq('id', hotelId)
      if (error) throw error
      return value
    },
    onSuccess: (value) => {
      qc.setQueryData(['floor-map-cell-size', hotelId], value)
      qc.invalidateQueries({ queryKey: ['hotels'] })
    },
  })

  return { remote: query.data ?? null, isLoading: query.isLoading, save }
}
