import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Json } from '@/integrations/supabase/types'
import { normalizeCellSize, type CellSizeState } from './useFloorMapCellSize'
import { useUser } from './useUser'

type HotelCacheRow = { id?: string; settings?: Record<string, unknown> | null; [key: string]: unknown }

function asSettings(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function toCellSizeJson(value: CellSizeState): Json {
  const normalized = normalizeCellSize(value)
  return {
    preset: normalized.preset,
    height: normalized.height,
    cols: normalized.cols,
    fontScale: normalized.fontScale,
  }
}

function mergeFloorMapCellSizeIntoHotel<T extends HotelCacheRow>(hotel: T, hotelId: string, value: CellSizeState): T {
  if (!hotel || hotel.id !== hotelId) return hotel
  return {
    ...hotel,
    settings: {
      ...asSettings(hotel.settings),
      floor_map_cell_size: value,
    },
  }
}

/**
 * Load + persist Floor Map cell-size vào hotels.settings.floor_map_cell_size.
 * Lưu chung cho cả hotel → áp dụng cho mọi user/thiết bị.
 */
export function useFloorMapCellSizeRemote(hotelId?: string | null) {
  const qc = useQueryClient()
  const { tenantId } = useUser()

  const query = useQuery({
    queryKey: ['floor-map-cell-size', tenantId, hotelId],
    queryFn: async (): Promise<CellSizeState | null> => {
      if (!hotelId || !tenantId) return null
      const { data, error } = await supabase
        .from('hotels')
        .select('settings')
        .eq('tenant_id', tenantId)
        .eq('id', hotelId)
        .maybeSingle()
      if (error) throw error
      const s = asSettings(data?.settings).floor_map_cell_size
      return s ? normalizeCellSize(s as Partial<CellSizeState>) : null
    },
    enabled: !!hotelId && !!tenantId,
    staleTime: 5 * 60 * 1000,
  })

  const save = useMutation({
    mutationFn: async (value: CellSizeState) => {
      if (!hotelId) throw new Error('Chưa chọn khách sạn')
      if (!tenantId) throw new Error('Chưa xác định tenant')
      const { data: row, error: readErr } = await supabase
        .from('hotels')
        .select('settings')
        .eq('tenant_id', tenantId)
        .eq('id', hotelId)
        .maybeSingle()
      if (readErr) throw readErr
      const current = asSettings(row?.settings)
      const normalized = normalizeCellSize(value)
      const newSettings = { ...current, floor_map_cell_size: toCellSizeJson(normalized) } as Json
      const { error } = await supabase
        .from('hotels')
        .update({ settings: newSettings })
        .eq('tenant_id', tenantId)
        .eq('id', hotelId)
      if (error) throw error
      return normalized
    },
    onSuccess: (value) => {
      qc.setQueryData(['floor-map-cell-size', tenantId, hotelId], value)
      qc.setQueriesData({ queryKey: ['hotels'] }, (old: unknown) => {
        if (!hotelId || !old) return old
        if (Array.isArray(old)) {
          return old.map((hotel) => mergeFloorMapCellSizeIntoHotel(hotel as HotelCacheRow, hotelId, value))
        }
        return mergeFloorMapCellSizeIntoHotel(old as HotelCacheRow, hotelId, value)
      })
    },
  })

  return { remote: query.data ?? null, isLoading: query.isLoading, save }
}
