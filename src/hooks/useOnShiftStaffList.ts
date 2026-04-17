import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { isCurrentlyOnShift } from './useShiftManagement'
import { useUser } from './useUser'
import type { StaffStatusType } from './useStaffStatus'

export interface OnShiftStaffMember {
  id: string
  full_name: string
  avatar_url: string | null
  email: string | null
  phone: string | null
  user_level_code: string | null
  position_name: string | null
  telegram_username: string | null
  telegram_chat_id: string | null
  shift_start_at: string | null
  // Status tracking fields
  status: StaffStatusType
  current_activity: string | null
  current_location: string | null
}

export function useOnShiftStaffList(hotelId: string | undefined) {
  const queryClient = useQueryClient()
  const { tenantId } = useUser()

  // Realtime: invalidate khi có thay đổi shift của bất kỳ ai trong tenant
  useEffect(() => {
    if (!tenantId || !hotelId) return
    const channel = supabase
      .channel(`on-shift-staff-list-${hotelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_status',
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['on-shift-staff-list', hotelId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tenantId, hotelId, queryClient])

  return useQuery({
    queryKey: ['on-shift-staff-list', hotelId],
    queryFn: async () => {
      if (!hotelId) return []
      
      // Get all users assigned to this hotel with their info
      const { data: userHotels, error: uhError } = await supabase
        .from('user_hotels')
        .select(`
          user_id,
          user:users!user_hotels_user_id_fkey(
            id, full_name, avatar_url, email, phone, user_level_code,
            telegram_username,
            position:positions(name),
            telegram_connections(chat_id, is_active)
          )
        `)
        .eq('hotel_id', hotelId)
      
      if (uhError) throw uhError

      // Get staff_status for all users (including status, activity, location)
      const userIds = userHotels?.map(uh => uh.user_id).filter(Boolean) || []
      
      if (userIds.length === 0) return []
      
      const { data: statuses, error: statusError } = await supabase
        .from('staff_status')
        .select('user_id, shift_start_at, shift_end_at, status, current_activity, current_location')
        .in('user_id', userIds)
      
      if (statusError) throw statusError

      const statusMap = new Map(statuses?.map(s => [s.user_id, s]) || [])

      // Filter only on-shift staff
      const onShiftStaff: OnShiftStaffMember[] = userHotels
        .filter(item => item.user)
        .filter(item => {
          const status = statusMap.get(item.user_id)
          return isCurrentlyOnShift(status || null)
        })
        .map(item => {
          const user = item.user as any
          const status = statusMap.get(item.user_id)
          const activeConnection = user.telegram_connections?.find((tc: any) => tc.is_active)
          
          return {
            id: user.id,
            full_name: user.full_name || 'Không tên',
            avatar_url: user.avatar_url,
            email: user.email,
            phone: user.phone,
            user_level_code: user.user_level_code,
            position_name: user.position?.name || null,
            telegram_username: user.telegram_username || null,
            telegram_chat_id: activeConnection?.chat_id || null,
            shift_start_at: status?.shift_start_at || null,
            // Status tracking
            status: (status?.status as StaffStatusType) || 'offline',
            current_activity: status?.current_activity || null,
            current_location: status?.current_location || null,
          }
        })
      
      // Sort by name
      return onShiftStaff.sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'))
    },
    enabled: !!hotelId,
    staleTime: 30 * 1000, // 30s — realtime sẽ invalidate khi có shift thay đổi
  })
}
