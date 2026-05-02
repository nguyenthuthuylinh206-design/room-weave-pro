import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { logActivity } from '@/lib/activityLogger'
import type { RoomCheckLeanConfig } from './useRoomCheckLeanConfig'

/**
 * Cập nhật hotels.settings.room_check (merge JSONB).
 * Chỉ Owner / Manager có quyền manage settings nên được dùng.
 */
export function useUpdateRoomCheckLeanConfig() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      hotelId,
      patch,
    }: {
      hotelId: string
      patch: Partial<RoomCheckLeanConfig>
    }) => {
      // Đọc current settings để merge (tránh đè JSONB khác)
      const { data: row, error: readErr } = await supabase
        .from('hotels')
        .select('settings')
        .eq('id', hotelId)
        .maybeSingle()
      if (readErr) throw readErr

      const current = (row?.settings as any) ?? {}
      const newSettings = {
        ...current,
        room_check: {
          ...(current.room_check ?? {}),
          ...patch,
        },
      }

      const { error } = await supabase
        .from('hotels')
        .update({ settings: newSettings })
        .eq('id', hotelId)
      if (error) throw error

      return newSettings.room_check as RoomCheckLeanConfig
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['room-check-lean-config', vars.hotelId] })
      qc.invalidateQueries({ queryKey: ['hotels'] })
      toast.success('Đã cập nhật cấu hình kiểm tra phòng')
    },
    onError: (err: any) => {
      console.error('[useUpdateRoomCheckLeanConfig]', err)
      toast.error('Không lưu được cấu hình. Vui lòng thử lại.')
    },
  })
}
